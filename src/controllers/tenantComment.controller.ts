import { Response, NextFunction } from 'express';
import { PrismaClient, AuditAction, UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

/**
 * POST /api/tenant/claims/:claimId/comments
 * Creates a tenant comment with optional proof attachments on a claim.
 */
export const createTenantCommentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId || req.user?.role !== UserRole.TENANT) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only authenticated tenants can respond to claims.',
        },
      });
      return;
    }

    const claimId = req.params.claimId as string;
    const { message, attachments } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Comment message cannot be empty.',
        },
      });
      return;
    }

    // Find claim and check dispute tenancy ownership
    const claim = (await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        dispute: {
          include: {
            tenancy: true,
          },
        },
      },
    })) as any;

    if (!claim) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Claim not found.',
        },
      });
      return;
    }

    if (claim.dispute.tenancy.tenantId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to respond to claims in this dispute.',
        },
      });
      return;
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    // Create TenantComment
    const comment = await prisma.tenantComment.create({
      data: {
        disputeId: claim.disputeId,
        claimId: claim.id,
        createdBy: userId,
        message: message.trim(),
      },
    });

    // Create attachments if provided
    let createdAttachments: Array<{
      id: string;
      fileName: string;
      fileType: string;
      fileUrl: string;
    }> = [];

    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.fileName && att.fileUrl) {
          const newAtt = await prisma.tenantCommentAttachment.create({
            data: {
              commentId: comment.id,
              fileName: String(att.fileName),
              fileType: String(att.fileType || 'application/octet-stream'),
              fileUrl: String(att.fileUrl),
            },
          });
          createdAttachments.push({
            id: newAtt.id,
            fileName: newAtt.fileName,
            fileType: newAtt.fileType,
            fileUrl: newAtt.fileUrl,
          });
        }
      }
    }

    // Audit Log Creation
    await prisma.auditLog.create({
      data: {
        disputeId: claim.disputeId,
        userId: userId,
        action: AuditAction.TENANT_COMMENT_CREATED,
        metadata: {
          claimId: claim.id,
          commentId: comment.id,
          attachmentCount: createdAttachments.length,
        },
      },
    });

    if (createdAttachments.length > 0) {
      await prisma.auditLog.create({
        data: {
          disputeId: claim.disputeId,
          userId: userId,
          action: AuditAction.TENANT_PROOF_ATTACHED,
          metadata: {
            claimId: claim.id,
            commentId: comment.id,
            attachmentCount: createdAttachments.length,
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      comment: {
        id: comment.id,
        claimId: comment.claimId,
        disputeId: comment.disputeId,
        message: comment.message,
        createdAt: comment.createdAt,
        createdBy: {
          id: user?.id,
          name: user?.name,
        },
        attachments: createdAttachments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tenant/claims/:claimId/comments
 * Retrieves all tenant comments and attachments for a claim.
 */
export const getTenantCommentsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const claimId = req.params.claimId as string;

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Claim not found.',
        },
      });
      return;
    }

    const comments = (await prisma.tenantComment.findMany({
      where: { claimId: claimId },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    })) as any[];

    res.status(200).json({
      success: true,
      comments: comments.map((c: any) => ({
        id: c.id,
        claimId: c.claimId,
        message: c.message,
        createdAt: c.createdAt,
        createdBy: {
          id: c.creator?.id,
          name: c.creator?.name,
        },
        attachments: c.attachments ? c.attachments.map((a: any) => ({
          id: a.id,
          fileName: a.fileName,
          fileType: a.fileType,
          fileUrl: a.fileUrl,
          createdAt: a.createdAt,
        })) : [],
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tenant/proof/upload
 * Saves uploaded proof attachment (base64) to local storage directory.
 */
export const uploadTenantProofHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId || req.user?.role !== UserRole.TENANT) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only authenticated tenants can upload proof files.',
        },
      });
      return;
    }

    const { fileName, fileData } = req.body;

    if (!fileName || !fileData) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Please select a proof file to upload.',
        },
      });
      return;
    }

    const extMatch = String(fileName).match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

    if (!allowedExts.includes(ext)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File type is not supported. Allowed formats: PDF, JPG, JPEG, PNG, WEBP.',
        },
      });
      return;
    }

    const base64Content = fileData.includes(';base64,')
      ? fileData.split(';base64,')[1]
      : fileData;

    const fileBuffer = Buffer.from(base64Content, 'base64');

    if (fileBuffer.length > 5 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum 5MB limit.',
        },
      });
      return;
    }

    const safeName = `tenant-proof-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, safeName);
    await fs.promises.writeFile(filePath, fileBuffer);

    const relativeUrl = `/api/storage/uploads/${safeName}`;

    // Determine MIME type
    let fileType = 'application/octet-stream';
    if (ext === 'pdf') fileType = 'application/pdf';
    else if (ext === 'png') fileType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') fileType = 'image/jpeg';
    else if (ext === 'webp') fileType = 'image/webp';

    res.status(201).json({
      success: true,
      fileUrl: relativeUrl,
      fileName: fileName,
      fileType: fileType,
    });
  } catch (error) {
    next(error);
  }
};
