import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

/**
 * GET /api/admin/audit-logs
 * Fetches platform audit logs for monitoring (Admin only)
 */
export const getAuditLogsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    next(error);
  }
};
