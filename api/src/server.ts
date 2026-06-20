import { app } from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './config/logger';
import mongoose from 'mongoose';

async function main() {
  await connectDB();
  const server = app.listen(env.PORT, () => logger.info(`API on :${env.PORT}`));

  const shutdown = async (sig: string) => {
    logger.info(`${sig} received, shutting down`);
    server.close(async () => { await mongoose.connection.close(); process.exit(0); });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}
main().catch((e) => { logger.fatal(e); process.exit(1); });