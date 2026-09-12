import { Response, NextFunction } from 'express';
import { DisputeStatus, AuditAction, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * POST /api/disputes/:disputeId/outside-agreement/propose
 * Proposes an outside agreement / mutual consent withdrawal for an initialized dispute
 */
export const proposeOutsideAgreementHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const disputeId = req.params.disputeId as string;

    if (!userId || !userRole) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tenancy: true,
      },
    });

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Dispute case not found' },
      });
      return;
    }

    const isLandlord = dispute.tenancy.landlordId === userId;
    const isTenant = dispute.tenancy.tenantId === userId;

    if (!isLandlord && !isTenant) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized for this dispute' },
      });
      return;
    }

    if (dispute.status === DisputeStatus.DRAFT) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DRAFT_CASE',
          message: 'Uninitialized DRAFT cases can be deleted directly without mutual consent.',
        },
      });
      return;
    }

    if (dispute.status === DisputeStatus.SETTLED) {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_SETTLED', message: 'This dispute case is already settled.' },
      });
      return;
    }

    // Log the outside agreement proposal
    await prisma.auditLog.create({
      data: {
        disputeId: dispute.id,
        userId,
        action: isLandlord ? AuditAction.LANDLORD_CONSENTED : AuditAction.TENANT_CONSENTED,
        metadata: {
          type: 'OUTSIDE_AGREEMENT_PROPOSED',
          proposedBy: userId,
          proposedByRole: userRole,
          timestamp: new Date().toISOString(),
        },
      },
    });

    res.json({
      success: true,
      message: 'Outside agreement proposal submitted. Awaiting mutual consent from the counterparty.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/disputes/:disputeId/outside-agreement/respond
 * Accepts or declines an outside agreement proposal
 */
export const respondOutsideAgreementHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const disputeId = req.params.disputeId as string;
    const { accept } = req.body;

    if (!userId || !userRole) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (typeof accept !== 'boolean') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'accept boolean flag is required' },
      });
      return;
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tenancy: true,
      },
    });

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Dispute case not found' },
      });
      return;
    }

    const isLandlord = dispute.tenancy.landlordId === userId;
    const isTenant = dispute.tenancy.tenantId === userId;

    if (!isLandlord && !isTenant) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized for this dispute' },
      });
      return;
    }

    if (accept) {
      // Mutual consent achieved! Update dispute to SETTLED and record settlement
      await prisma.$transaction(async (tx) => {
        await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            status: DisputeStatus.SETTLED,
            settlementEligible: true,
          },
        });

        const existingSettlement = await tx.settlement.findUnique({
          where: { disputeId: dispute.id },
        });

        const agreedDeduction = dispute.calculatedDeduction ?? dispute.claimedDeduction;
        const refundAmount = dispute.totalDeposit.sub(agreedDeduction);

        if (existingSettlement) {
          await tx.settlement.update({
            where: { disputeId: dispute.id },
            data: {
              consentTenant: true,
              consentLandlord: true,
              tenantConsentedAt: new Date(),
              landlordConsentedAt: new Date(),
            },
          });
        } else {
          await tx.settlement.create({
            data: {
              disputeId: dispute.id,
              agreedDeduction,
              refundAmount,
              consentTenant: true,
              consentLandlord: true,
              tenantConsentedAt: new Date(),
              landlordConsentedAt: new Date(),
            },
          });
        }

        await tx.auditLog.create({
          data: {
            disputeId: dispute.id,
            userId,
            action: AuditAction.CASE_SETTLED,
            metadata: {
              type: 'MUTUAL_OUTSIDE_AGREEMENT_ACCEPTED',
              acceptedBy: userId,
              acceptedByRole: userRole,
              timestamp: new Date().toISOString(),
            },
          },
        });
      });

      res.json({
        success: true,
        message: 'Outside agreement accepted! Case has been closed and marked as SETTLED by mutual consent.',
      });
    } else {
      // Proposal declined
      await prisma.auditLog.create({
        data: {
          disputeId: dispute.id,
          userId,
          action: isLandlord ? AuditAction.LANDLORD_CONSENTED : AuditAction.TENANT_CONSENTED,
          metadata: {
            type: 'OUTSIDE_AGREEMENT_DECLINED',
            declinedBy: userId,
            declinedByRole: userRole,
            timestamp: new Date().toISOString(),
          },
        },
      });

      res.json({
        success: true,
        message: 'Outside agreement proposal declined. The online negotiation process will continue.',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/disputes/:disputeId/court-application
 * Generates and records an Online Court Registration Application after 3 rounds of negotiation without agreement
 */
export const submitCourtApplicationHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const disputeId = req.params.disputeId as string;
    const { jurisdiction, petitionerName, respondentName, legalNotes } = req.body;

    if (!userId || !userRole) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tenancy: {
          include: {
            property: true,
            landlord: { select: { id: true, name: true, email: true } },
            tenant: { select: { id: true, name: true, email: true } },
          },
        },
        claims: true,
        auditLogs: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Dispute case not found' },
      });
      return;
    }

    const isLandlord = dispute.tenancy.landlordId === userId;
    const isTenant = dispute.tenancy.tenantId === userId;

    if (!isLandlord && !isTenant) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized for this dispute' },
      });
      return;
    }

    // Must have reached round 3 OR unresolved state
    const isEligibleForCourt =
      dispute.currentRound >= 3 ||
      dispute.status === DisputeStatus.REJECTED;

    if (!isEligibleForCourt) {
      res.status(400).json({
        success: false,
        error: {
          code: 'COURT_APPLICATION_NOT_ELIGIBLE',
          message: 'Court Case Registration Application becomes available after 3 negotiation rounds complete without agreement.',
        },
      });
      return;
    }

    const courtRefNo = `ECOURT-${dispute.caseNumber.replace('GP-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const courtApplication = {
      courtRefNo,
      disputeCaseNumber: dispute.caseNumber,
      disputeId: dispute.id,
      jurisdiction: jurisdiction || `${dispute.tenancy.property.city} District Rent Authority / e-Courts Portal`,
      petitioner: petitionerName || (isLandlord ? dispute.tenancy.landlord.name : dispute.tenancy.tenant.name),
      respondent: respondentName || (isLandlord ? dispute.tenancy.tenant.name : dispute.tenancy.landlord.name),
      totalDeposit: dispute.totalDeposit.toFixed(2),
      claimedDeduction: dispute.claimedDeduction.toFixed(2),
      calculatedDeduction: dispute.calculatedDeduction ? dispute.calculatedDeduction.toFixed(2) : 'N/A',
      currentRound: dispute.currentRound,
      legalNotes: legalNotes || 'ODR negotiation failed to achieve mutual settlement after 3 rounds. Case escalation for formal online court registration.',
      filedByUserId: userId,
      filedAt: new Date().toISOString(),
      odrCertificateId: `ODR-CERT-${dispute.id.slice(0, 8).toUpperCase()}`,
      eCourtsPortalUrl: 'https://ecourts.gov.in/ecourts_home/',
    };

    // Log the court registration filing in audit trail
    await prisma.auditLog.create({
      data: {
        disputeId: dispute.id,
        userId,
        action: AuditAction.PDF_GENERATED,
        metadata: {
          type: 'COURT_REGISTRATION_APPLICATION_FILED',
          courtRefNo,
          jurisdiction: courtApplication.jurisdiction,
          filedBy: userId,
          timestamp: courtApplication.filedAt,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Online Court Case Registration Application generated successfully.',
      courtApplication,
    });
  } catch (error) {
    next(error);
  }
};
