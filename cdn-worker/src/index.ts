/// <reference types="@cloudflare/workers-types" />
import { jwtVerify } from 'jose';


export interface Env {
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  CACHE_CONTROL_IMMUTABLE: string;
  BASE_URL: string;
}

interface CustomJWTPayload {
  gameId?: string;
  userId?: string;
  exp?: number;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {

    const url = new URL(request.url);
    const cache = caches.default;

    // -----------------------------------
    // 1. Health Check
    // -----------------------------------
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('LazPlay CDN Active', {
        status: 200,
      });
    }

    // -----------------------------------
    // 2. Allow only GET/HEAD
    // -----------------------------------
    if (
      request.method !== 'GET' &&
      request.method !== 'HEAD'
    ) {
      return new Response('Method Not Allowed', {
        status: 405,
      });
    }

    // -----------------------------------
    // 3. Validate Authorization Header
    // -----------------------------------
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    const token = authHeader.slice(7);

    let payload: CustomJWTPayload;

    try {
      const secret = new TextEncoder().encode(env.JWT_SECRET);

      const verified = await jwtVerify(token, secret);

      payload = verified.payload as CustomJWTPayload;

    } catch {
      // Never leak internal JWT errors
      return new Response('Forbidden', {
        status: 403,
      });
    }

    // -----------------------------------
    // 4. Validate Game Access
    // -----------------------------------
    const pathParts = url.pathname
      .split('/')
      .filter(Boolean);

    if (pathParts.length === 0) {
      return new Response('Invalid path', {
        status: 400,
      });
    }

    const requestedGameId = pathParts[0];

    if (
      payload.gameId &&
      requestedGameId !== payload.gameId
    ) {
      return new Response('Forbidden', {
        status: 403,
      });
    }

    // -----------------------------------
    // 5. Prevent Path Traversal
    // -----------------------------------
    const key = decodeURIComponent(
      url.pathname.slice(1)
    );

    if (
      key.includes('..') ||
      key.startsWith('/')
    ) {
      return new Response('Invalid file path', {
        status: 400,
      });
    }

    // -----------------------------------
    // 6. Build Cache Key
    // IMPORTANT:
    // Cache should NOT depend on JWT
    // -----------------------------------
    const cacheUrl = new URL(url.toString());

    // Remove auth-sensitive params
    cacheUrl.search = '';

    const cacheKey = new Request(
      cacheUrl.toString(),
      {
        method: request.method,
      }
    );

    // -----------------------------------
    // 7. Range Requests
    // -----------------------------------
    const rangeHeader =
      request.headers.get('range');

    // Don't cache ranged requests
    const isRangeRequest = !!rangeHeader;

    // -----------------------------------
    // 8. Try Edge Cache
    // -----------------------------------
    if (!isRangeRequest) {
      const cached = await cache.match(cacheKey);

      if (cached) {
        return cached;
      }
    }

    // -----------------------------------
    // 9. Fetch From R2
    // -----------------------------------
    const object = await env.BUCKET.get(key, {
      range: rangeHeader || undefined,
      onlyIf: request.headers,
    });

    if (!object) {
      return new Response('File Not Found', {
        status: 404,
      });
    }

    // -----------------------------------
    // 10. Build Response Headers
    // -----------------------------------
    const headers = new Headers();

    object.writeHttpMetadata(headers);

    headers.set('etag', object.httpEtag);

    headers.set(
      'Accept-Ranges',
      'bytes'
    );

    // Immutable chunk caching
    if (
      key.includes('/chunks/') ||
      key.endsWith('.chunk') ||
      key.endsWith('.hash')
    ) {
      headers.set(
        'Cache-Control',
        env.CACHE_CONTROL_IMMUTABLE ||
        'public, max-age=31536000, immutable'
      );
    } else {
      headers.set(
        'Cache-Control',
        'public, max-age=3600'
      );
    }

    // -----------------------------------
    // 11. Determine Status
    // -----------------------------------
    let status = 200;

    if (isRangeRequest) {
      status = 206;
    }

    if (!('body' in object)) {
      status = 304;
    }

    // -----------------------------------
    // 12. Create Response
    // -----------------------------------
    const response = new Response(
      status === 304
        ? null
        : request.method === 'HEAD'
          ? null
          : (object as R2ObjectBody).body,
      {
        status,
        headers,
      }
    );

    // -----------------------------------
    // 13. Store in Cache
    // Only cache full successful responses
    // -----------------------------------
    if (
      request.method === 'GET' &&
      status === 200 &&
      !isRangeRequest
    ) {
      ctx.waitUntil(
        cache.put(
          cacheKey,
          response.clone()
        )
      );
    }

    return response;
  },
};