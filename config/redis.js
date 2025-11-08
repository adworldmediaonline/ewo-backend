import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis client with error handling
 * If Redis is unavailable, the app continues without caching
 */
const initRedisClient = async () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Support both URL-based and host/port-based configuration
    const config = {};

    if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
      // Host/Port configuration (for managed Redis services)
      config.username = process.env.REDIS_USERNAME || 'default';
      config.password = process.env.REDIS_PASSWORD || '';
      config.socket = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log('Redis: Max reconnection attempts reached');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      };
    } else {
      // URL-based configuration (for local Redis or simple connection strings)
      config.url = process.env.REDIS_URL || 'redis://localhost:6379';
      config.socket = {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log('Redis: Max reconnection attempts reached');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      };
    }

    redisClient = createClient(config);

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis:', error.message);
    console.log('Application will continue without Redis caching');
    redisClient = null;
    isConnected = false;
    return null;
  }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is connected and available
 */
export const isRedisAvailable = () => {
  return isConnected && redisClient !== null;
};

/**
 * Close Redis connection gracefully
 */
export const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error.message);
    } finally {
      redisClient = null;
      isConnected = false;
    }
  }
};

export default initRedisClient;

