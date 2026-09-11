import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'gharpay-api',
    status: 'healthy',
  });
});

export default router;
