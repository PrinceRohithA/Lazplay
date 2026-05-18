import { config } from '../config.js';
import { HttpError } from '../http.js';

let awsModules = null;

async function loadAws() {
  if (!awsModules) {
    const [{ S3Client, PutObjectCommand, GetObjectCommand }, { getSignedUrl }] = await Promise.all([
      import('@aws-sdk/client-s3'),
      import('@aws-sdk/s3-request-presigner')
    ]);
    awsModules = { S3Client, PutObjectCommand, GetObjectCommand, getSignedUrl };
  }
  return awsModules;
}

function assertR2() {
  const missing = ['endpoint', 'accessKeyId', 'secretAccessKey'].filter((key) => !config.r2[key]);
  if (missing.length > 0) {
    throw new HttpError(500, 'R2_NOT_CONFIGURED', `Missing R2 configuration: ${missing.join(', ')}`);
  }
}

function clientOptions(S3Client) {
  return new S3Client({
    region: config.r2.region,
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'NEVER',
    responseChecksumValidation: 'NEVER'
  });
}

export function publicObjectUrl(key, bucketPurpose = 'publicGame') {
  const base = bucketPurpose === 'media' ? config.r2.mediaPublicUrl : config.r2.publicGamePublicUrl;
  if (!base || !key) return null;
  return `${base.replace(/\/+$/, '')}/${encodeURIComponent(key).replaceAll('%2F', '/')}`;
}

export function bucketForPurpose(purpose) {
  if (purpose === 'media') return config.r2.mediaBucket;
  if (purpose === 'publicGame') return config.r2.publicGameBucket;
  return config.r2.privateGameBucket;
}

export async function signedR2Url({ method, key, purpose = 'privateGame', contentType = undefined, expiresSeconds = config.signedUrlTtlSeconds }) {
  assertR2();
  if (!key || key.includes('..')) throw new HttpError(400, 'INVALID_OBJECT_KEY', 'Object key is invalid');

  const { S3Client, PutObjectCommand, GetObjectCommand, getSignedUrl } = await loadAws();
  const s3 = clientOptions(S3Client);
  const Bucket = bucketForPurpose(purpose);
  const Command = method === 'PUT' ? PutObjectCommand : GetObjectCommand;
  const command = new Command({
    Bucket,
    Key: key,
    ...(method === 'PUT' && contentType ? { ContentType: contentType } : {})
  });

  return getSignedUrl(s3, command, { expiresIn: Number(expiresSeconds) || 900 });
}
