import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info('MongoDB Connected...');
  } catch (err: any) {
    logger.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
}
