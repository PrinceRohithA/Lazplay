function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== '') return value;
  }
  return undefined;
}

function envNumber(defaultValue, ...names) {
  const value = envValue(...names);
  return Number(value || defaultValue);
}

export const config = {
  appName: 'lazplay',
  appVersion: envValue('LAZPLAY_APP_VERSION', 'APP_VERSION') || '1.0.0',
  appEnv: envValue('LAZPLAY_APP_ENV', 'APP_ENV', 'NODE_ENV') || 'development',
  mockCatalyst: (envValue('LAZPLAY_USE_MOCKS') || '').toLowerCase() === 'true',
  apiPrefixes: (envValue('LAZPLAY_API_PREFIXES', 'API_PREFIXES') || '/api/v1,/v1')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  publicWebUrl: envValue('LAZPLAY_PUBLIC_WEB_URL', 'PUBLIC_WEB_URL') || 'https://play.lazplay.tech',
  publicApiUrl: envValue('LAZPLAY_PUBLIC_API_URL', 'PUBLIC_API_URL') || 'https://play.lazplay.tech/api/v1',
  authSecret: envValue('LAZPLAY_AUTH_SECRET', 'AUTH_SECRET') || 'lazplay-local-secret-change-me',
  accessTokenTtlSeconds: envNumber(900, 'LAZPLAY_ACCESS_TOKEN_TTL_SECONDS', 'ACCESS_TOKEN_TTL_SECONDS'),
  refreshTokenTtlSeconds: envNumber(604800, 'LAZPLAY_REFRESH_TOKEN_TTL_SECONDS', 'REFRESH_TOKEN_TTL_SECONDS'),
  maxJsonBodyBytes: envNumber(1024 * 1024, 'LAZPLAY_MAX_JSON_BODY_BYTES', 'MAX_JSON_BODY_BYTES'),
  signedUrlTtlSeconds: envNumber(900, 'LAZPLAY_SIGNED_URL_TTL_SECONDS', 'SIGNED_URL_TTL_SECONDS'),
  r2: {
    endpoint: envValue('LAZPLAY_R2_ENDPOINT', 'R2_ENDPOINT'),
    accessKeyId: envValue('LAZPLAY_R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID'),
    secretAccessKey: envValue('LAZPLAY_R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY'),
    region: envValue('LAZPLAY_R2_REGION', 'R2_REGION') || 'auto',
    privateGameBucket: envValue('LAZPLAY_R2_PRIVATE_GAME_BUCKET', 'LAZPLAY_R2_GAME_BUCKET', 'LAZPLAY_R2_BUCKET', 'R2_PRIVATE_GAME_BUCKET', 'R2_GAME_BUCKET', 'R2_BUCKET'),
    publicGameBucket: envValue('LAZPLAY_R2_PUBLIC_GAME_BUCKET', 'LAZPLAY_R2_GAME_BUCKET', 'LAZPLAY_R2_BUCKET', 'R2_PUBLIC_GAME_BUCKET', 'R2_GAME_BUCKET', 'R2_BUCKET'),
    mediaBucket: envValue('LAZPLAY_R2_MEDIA_BUCKET', 'LAZPLAY_R2_BUCKET', 'R2_MEDIA_BUCKET', 'R2_BUCKET'),
    publicGamePublicUrl: envValue('LAZPLAY_R2_PUBLIC_GAME_PUBLIC_URL', 'LAZPLAY_R2_GAME_PUBLIC_URL', 'R2_PUBLIC_GAME_PUBLIC_URL', 'R2_GAME_PUBLIC_URL'),
    mediaPublicUrl: envValue('LAZPLAY_R2_MEDIA_PUBLIC_URL', 'LAZPLAY_R2_PUBLIC_URL', 'R2_MEDIA_PUBLIC_URL', 'R2_PUBLIC_URL')
  },
  cacheSegments: {
    home: envValue('LAZPLAY_CACHE_HOME_SEGMENT_ID') || null,
    manifests: envValue('LAZPLAY_CACHE_MANIFEST_SEGMENT_ID') || null,
    signedUrls: envValue('LAZPLAY_CACHE_SIGNED_URL_SEGMENT_ID') || null,
    metadata: envValue('LAZPLAY_CACHE_METADATA_SEGMENT_ID') || null,
    rateLimit: envValue('LAZPLAY_CACHE_RATE_LIMIT_SEGMENT_ID') || null,
    launcher: envValue('LAZPLAY_CACHE_LAUNCHER_SEGMENT_ID') || null
  },
  cacheTtlHours: {
    home: envNumber(1, 'LAZPLAY_CACHE_TTL_HOME_HOURS', 'CACHE_TTL_HOME_HOURS'),
    trending: envNumber(1, 'LAZPLAY_CACHE_TTL_TRENDING_HOURS', 'CACHE_TTL_TRENDING_HOURS'),
    metadata: envNumber(6, 'LAZPLAY_CACHE_TTL_METADATA_HOURS', 'CACHE_TTL_METADATA_HOURS'),
    manifest: envNumber(12, 'LAZPLAY_CACHE_TTL_MANIFEST_HOURS', 'CACHE_TTL_MANIFEST_HOURS'),
    signedUrlSession: envNumber(1, 'LAZPLAY_CACHE_TTL_SIGNED_URL_SESSION_HOURS', 'CACHE_TTL_SIGNED_URL_SESSION_HOURS'),
    rateLimit: envNumber(1, 'LAZPLAY_CACHE_TTL_RATE_LIMIT_HOURS', 'CACHE_TTL_RATE_LIMIT_HOURS'),
    launcherSession: envNumber(6, 'LAZPLAY_CACHE_TTL_LAUNCHER_SESSION_HOURS', 'CACHE_TTL_LAUNCHER_SESSION_HOURS')
  },
  tables: {
    users: envValue('LAZPLAY_TABLE_USERS', 'TABLE_USERS') || 'users',
    developers: envValue('LAZPLAY_TABLE_DEVELOPERS', 'TABLE_DEVELOPERS') || 'developers',
    games: envValue('LAZPLAY_TABLE_GAMES', 'TABLE_GAMES') || 'games',
    versions: envValue('LAZPLAY_TABLE_VERSIONS', 'TABLE_VERSIONS') || 'versions',
    manifests: envValue('LAZPLAY_TABLE_MANIFESTS', 'TABLE_MANIFESTS') || 'manifests',
    purchases: envValue('LAZPLAY_TABLE_PURCHASES', 'TABLE_PURCHASES') || 'purchases',
    cosmetics: envValue('LAZPLAY_TABLE_COSMETICS', 'TABLE_COSMETICS') || 'cosmetics',
    achievements: envValue('LAZPLAY_TABLE_ACHIEVEMENTS', 'TABLE_ACHIEVEMENTS') || 'achievements',
    comments: envValue('LAZPLAY_TABLE_COMMENTS', 'TABLE_COMMENTS') || 'comments',
    reports: envValue('LAZPLAY_TABLE_REPORTS', 'TABLE_REPORTS') || 'reports',
    adminLogs: envValue('LAZPLAY_TABLE_ADMIN_LOGS', 'TABLE_ADMIN_LOGS') || 'admin_logs',
    launcherSessions: envValue('LAZPLAY_TABLE_LAUNCHER_SESSIONS', 'TABLE_LAUNCHER_SESSIONS') || 'launcher_sessions',
    analyticsEvents: envValue('LAZPLAY_TABLE_ANALYTICS_EVENTS', 'TABLE_ANALYTICS_EVENTS') || 'analytics_events'
  }
};

export function isProduction() {
  return config.appEnv === 'production';
}
