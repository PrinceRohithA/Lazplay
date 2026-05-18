const catalyst = require('zcatalyst-sdk-node');

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const segmentEnvNames = {
  home: 'LAZPLAY_CACHE_HOME_SEGMENT_ID',
  metadata: 'LAZPLAY_CACHE_METADATA_SEGMENT_ID',
  manifest: 'LAZPLAY_CACHE_MANIFEST_SEGMENT_ID',
  manifests: 'LAZPLAY_CACHE_MANIFEST_SEGMENT_ID',
  signedurl: 'LAZPLAY_CACHE_SIGNED_URL_SEGMENT_ID',
  signedurls: 'LAZPLAY_CACHE_SIGNED_URL_SEGMENT_ID',
  signed_url: 'LAZPLAY_CACHE_SIGNED_URL_SEGMENT_ID',
  signed_urls: 'LAZPLAY_CACHE_SIGNED_URL_SEGMENT_ID',
  ratelimit: 'LAZPLAY_CACHE_RATE_LIMIT_SEGMENT_ID',
  rate_limit: 'LAZPLAY_CACHE_RATE_LIMIT_SEGMENT_ID',
  launcher: 'LAZPLAY_CACHE_LAUNCHER_SEGMENT_ID'
};

function segmentId(name) {
  const key = String(name || 'metadata').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  const envName = segmentEnvNames[key] || 'LAZPLAY_CACHE_METADATA_SEGMENT_ID';
  return process.env[envName] || null;
}

module.exports = async function cacheInvalidator(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { success: false, error: { code: 'METHOD_NOT_ALLOWED' } });
    return;
  }

  if (process.env.LAZPLAY_CACHE_INVALIDATION_SECRET && req.headers['x-lazplay-admin-secret'] !== process.env.LAZPLAY_CACHE_INVALIDATION_SECRET) {
    send(res, 401, { success: false, error: { code: 'UNAUTHORIZED' } });
    return;
  }

  try {
    const body = await readBody(req);
    const keys = Array.isArray(body.keys) ? body.keys : [];
    const app = catalyst.initialize(req);
    const cache = app.cache();

    await Promise.all(keys.map(async ({ segment = 'METADATA', key }) => {
      if (!key) return;
      const id = segmentId(segment);
      const target = id ? cache.segment(id) : cache.segment();
      await target.delete(key);
    }));

    send(res, 200, { success: true, invalidated: keys.length });
  } catch (error) {
    send(res, 500, { success: false, error: { code: 'CACHE_INVALIDATION_FAILED', message: error.message } });
  }
};
