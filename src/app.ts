import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import landlordRoutes from './routes/landlord.routes';
import tenantRoutes from './routes/tenant.routes';
import adminRoutes from './routes/admin.routes';
import settlementRoutes from './routes/settlement.routes';
import disputeActionsRoutes from './routes/disputeActions.routes';
import { errorHandler } from './middleware/errorHandler';

import path from 'path';
import fs from 'fs';

const app: Express = express();

// Ensure storage/uploads directory exists
const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow development origins
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Serve evidence uploaded files statically
app.use('/api/storage/uploads', express.static(uploadsDir));
app.use('/storage/uploads', express.static(uploadsDir));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/landlord', landlordRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/disputes', disputeActionsRoutes);

app.use(errorHandler);

export default app;
