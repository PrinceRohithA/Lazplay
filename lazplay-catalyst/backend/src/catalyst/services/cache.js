import { config } from '../config.js';
import { getCatalystApp } from './catalyst.js';

const localCache = new Map();

function localKey(segmentName, key) {
  return `${segmentName}:${key}`;
}

function parseJson(value) {
  if (value == null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function createCache(req) {
  async function segment(segmentName) {
    const app = await getCatalystApp(req);
    if (!app) return null;
    const cache = app.cache();
    const segmentId = config.cacheSegments[segmentName];
    return segmentId ? cache.segment(segmentId) : cache.segment();
  }

  async function getJson(segmentName, key) {
    if (config.mockCatalyst) {
      const item = localCache.get(localKey(segmentName, key));
      if (!item || item.expiresAt <= Date.now()) return null;
      return item.value;
    }

    try {
      const cacheSegment = await segment(segmentName);
      const value = await cacheSegment.getValue(key);
      return parseJson(value);
    } catch (error) {
      console.warn('[cache-get-fallback]', { segmentName, key, message: error?.message });
      return null;
    }
  }

  async function setJson(segmentName, key, value, ttlHours) {
    const ttl = Math.min(Number(ttlHours || 1), 48);
    if (config.mockCatalyst) {
      localCache.set(localKey(segmentName, key), {
        value,
        expiresAt: Date.now() + ttl * 60 * 60 * 1000
      });
      return value;
    }

    try {
      const cacheSegment = await segment(segmentName);
      await cacheSegment.put(key, JSON.stringify(value), ttl);
    } catch (error) {
      console.warn('[cache-set-fallback]', { segmentName, key, message: error?.message });
    }
    return value;
  }

  async function deleteKey(segmentName, key) {
    if (config.mockCatalyst) {
      localCache.delete(localKey(segmentName, key));
      return;
    }

    try {
      const cacheSegment = await segment(segmentName);
      await cacheSegment.delete(key);
    } catch (error) {
      console.warn('[cache-delete-fallback]', { segmentName, key, message: error?.message });
    }
  }

  async function withJson(segmentName, key, ttlHours, loader) {
    const cached = await getJson(segmentName, key);
    if (cached != null) return { value: cached, cache: 'hit' };
    const value = await loader();
    await setJson(segmentName, key, value, ttlHours);
    return { value, cache: 'miss' };
  }

  return { getJson, setJson, deleteKey, withJson };
}
