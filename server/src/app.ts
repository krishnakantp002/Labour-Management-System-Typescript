import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import workerRoutes from './modules/workers/workers.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import rateRoutes from './modules/rates/rates.routes';
import workRoutes from './modules/work/work.routes';
import paymentRoutes from './modules/payments/payments.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportRoutes from './modules/reports/reports.routes';
import logRoutes from './modules/logs/logs.routes';
import { auditMiddleware } from './modules/logs/audit.middleware';

const app = express();

// ─── Security ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// ─── Logging ────────────────────────────────────────────────
app.use(morgan('dev'));

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Labour Management System API is running',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    },
  });
});

// ─── API Routes ─────────────────────────────────────────────
// Audit middleware — records every alteration for the admin log
app.use('/api', auditMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
// app.use('/api/users', userRoutes);           // Future
app.use('/api/attendance', attendanceRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/work', workRoutes);
app.use('/api/payments', paymentRoutes);     // Phase 9
app.use('/api/dashboard', dashboardRoutes);  // Phase 10
app.use('/api/reports', reportRoutes);       // Phase 11
app.use('/api/logs', logRoutes);             // Audit trail (Admin only)

// ─── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ─── Global Error Handler ───────────────────────────────────
app.use(errorHandler);

export default app;
