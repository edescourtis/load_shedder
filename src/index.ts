import express from 'express';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { createClient, RedisClientType } from 'redis';

import { PostgresMetricsProvider } from './metrics/PostgresMetricsProvider';
import { RedisMetricsProvider } from './metrics/RedisMetricsProvider';
import { RedisMetricsStorage } from './storage/RedisMetricsStorage';
import { ThresholdSheddingStrategy, SheddingThresholds } from './shedding/ThresholdSheddingStrategy';
import { LoadShedder } from './shedding/LoadShedder';
import { loadSheddingMiddleware } from './middleware/loadSheddingMiddleware';

dotenv.config();

async function main() {
  const app = express();

  // Load environment variables with defaults
  const {
    INSTANCE_ID = `instance-${Math.random()}`,
    PGHOST = 'localhost',
    PGPORT = '5432',
    PGUSER = 'postgres',
    PGPASSWORD = 'postgres',
    PGDATABASE = 'postgres',
    REDIS_HOST = 'localhost',
    REDIS_PORT = '6379',
    PORT = '3000',
  } = process.env;

  // Initialize PostgreSQL client
  const pgClient = new Client({
    host: PGHOST,
    port: Number(PGPORT),
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
  });

  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }

  // Initialize Redis client
  const redisClient: RedisClientType = createClient({
    socket: {
      host: REDIS_HOST,
      port: Number(REDIS_PORT),
    },
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }

  // Initialize metrics providers and storage
  const postgresMetricsProvider = new PostgresMetricsProvider(pgClient);
  const redisMetricsProvider = new RedisMetricsProvider(redisClient);
  const metricsStorage = new RedisMetricsStorage(redisClient);

  // Define shedding thresholds
  const thresholds: SheddingThresholds = {
    cpuUsage: {
      levels: [
        [90, 80],
        [70, 50],
        [50, 20],
      ],
    },
    redisMemoryUsage: {
      levels: [
        [150, 50],
        [100, 30],
      ],
    },
    redisCommandLatency: {
      levels: [
        [200, 20],
        [150, 10],
      ],
    },
  };

  // Initialize shedding strategy and load shedder
  const sheddingStrategy = new ThresholdSheddingStrategy(thresholds);
  const loadShedder = new LoadShedder(metricsStorage, sheddingStrategy);

  // Start periodic metrics collection and shedding percentage update
  setInterval(async () => {
    try {
      // Collect metrics
      const postgresMetrics = await postgresMetricsProvider.collectMetrics();
      const redisMetrics = await redisMetricsProvider.collectMetrics();

      // Combine and save metrics
      const combinedMetrics = { ...postgresMetrics, ...redisMetrics };
      await metricsStorage.saveMetrics(INSTANCE_ID, combinedMetrics);

      // Update shedding percentage
      await loadShedder.updateSheddingPercentage();

      console.log(`Shedding percentage: ${loadShedder.getSheddingPercentage()}%`);
    } catch (error) {
      console.error('Error during metrics collection:', error);
    }
  }, 1000); // Collect metrics every second

  // Use the load shedding middleware
  app.use(loadSheddingMiddleware(loadShedder));

  // Define application routes
  app.get('/', (_req, res) => {
    res.send('Hello, World!');
  });

  // Start the server
  app.listen(Number(PORT), () => {
    console.log(`Server is running on port ${PORT}`);
  });

  console.log('Environment Variables:', process.env);
}

main().catch((err) => {
  console.error('Application failed to start:', err);
  process.exit(1);
}); 