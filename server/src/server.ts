import 'dotenv/config';
import app from './app';
import { config } from './config';
import logger from './utils/logger';

const server = app.listen(config.port, () => {
  logger.success(`🚀 Server running on port ${config.port}`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 Health check: http://localhost:${config.port}/api/health`);
});

// ─── Graceful Shutdown ──────────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});
