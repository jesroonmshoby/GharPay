import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import landlordRoutes from './routes/landlord.routes';
import tenantRoutes from './routes/tenant.routes';
import mediatorRoutes from './routes/mediator.routes';
import adminRoutes from './routes/admin.routes';
import settlementRoutes from './routes/settlement.routes';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();

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

app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/landlord', landlordRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/mediator', mediatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settlements', settlementRoutes);

app.use(errorHandler);

export default app;
