// Simple in-memory cache (lasts until server restart)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const cacheManager = {
  get: (key) => {
    const item = cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    
    console.log(`✅ Cache HIT: ${key}`);
    return item.data;
  },
  
  set: (key, data, ttl = CACHE_TTL) => {
    cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
    console.log(`💾 Cache SET: ${key}`);
  },
  
  clear: (key) => {
    if (key) {
      cache.delete(key);
      console.log(`🗑️ Cache CLEARED: ${key}`);
    }
  },
  
  clearAll: () => {
    const size = cache.size;
    cache.clear();
    console.log(`🗑️ All cache CLEARED (${size} entries)`);
  }
};