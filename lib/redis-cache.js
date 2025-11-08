import { getRedisClient, isRedisAvailable } from '../config/redis.js';

/**
 * Generate a cache key from filters
 */
export const generateCacheKey = (prefix, filters) => {
  const sortedFilters = Object.keys(filters)
    .sort()
    .reduce((acc, key) => {
      if (filters[key] !== undefined && filters[key] !== '') {
        acc[key] = filters[key];
      }
      return acc;
    }, {});

  const filterString = JSON.stringify(sortedFilters);
  return `${prefix}:${Buffer.from(filterString).toString('base64')}`;
};

/**
 * Get data from Redis cache
 * Returns null if Redis is unavailable or key doesn't exist
 */
export const getFromCache = async (key) => {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const client = getRedisClient();
    const data = await client.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Redis GET error:', error.message);
    return null;
  }
};

/**
 * Set data in Redis cache with optional TTL
 * Fails silently if Redis is unavailable
 */
export const setInCache = async (key, data, ttlSeconds = 300) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const client = getRedisClient();
    await client.setEx(key, ttlSeconds, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error.message);
    return false;
  }
};

/**
 * Delete specific key from cache
 */
export const deleteFromCache = async (key) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis DELETE error:', error.message);
    return false;
  }
};

/**
 * Delete all keys matching a pattern
 * Useful for invalidating all product-related caches
 */
export const deleteCachePattern = async (pattern) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
    }
    return true;
  } catch (error) {
    console.error('Redis DELETE PATTERN error:', error.message);
    return false;
  }
};

/**
 * Clear all cache (use with caution)
 */
export const clearAllCache = async () => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const client = getRedisClient();
    await client.flushAll();
    console.log('All Redis cache cleared');
    return true;
  } catch (error) {
    console.error('Redis FLUSH error:', error.message);
    return false;
  }
};

/**
 * Wrapper function to execute service with caching
 * Usage: await withCache(cacheKey, serviceFn, ttl)
 */
export const withCache = async (key, serviceFn, ttlSeconds = 300) => {
  // Try to get from cache first
  const cachedData = await getFromCache(key);
  if (cachedData) {
    console.log(`Cache HIT for key: ${key}`);
    return cachedData;
  }

  console.log(`Cache MISS for key: ${key}`);
  
  // Execute service function
  const data = await serviceFn();
  
  // Store in cache (fire and forget)
  setInCache(key, data, ttlSeconds).catch((err) => {
    console.error('Failed to cache data:', err.message);
  });

  return data;
};

