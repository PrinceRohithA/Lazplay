import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function runTest() {
  console.log('🌌 Starting LazPlay Zoho Catalyst Integration Verification...');
  
  // 1. Load active credentials from app-config.json
  let appConfig;
  try {
    const configPath = join(process.cwd(), 'app-config.json');
    appConfig = JSON.parse(readFileSync(configPath, 'utf8'));
    console.log('✅ Loaded Catalyst app-config.json environment variables successfully!');
  } catch (err) {
    console.error('❌ Failed to read app-config.json:', err.message);
    process.exit(1);
  }

  const envs = appConfig.env_variables || {};

  // 2. Validate Cloudflare R2 Connection
  console.log('\n📦 Verifying Cloudflare R2 Connection...');
  const r2Client = new S3Client({
    endpoint: envs.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: envs.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: envs.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
    region: 'auto',
  });

  const bucketsToTest = [
    envs.CLOUDFLARE_R2_BUCKET_NAME || 'lazplay-games-public',
    'lazplay-games-private',
    'lazplay-media'
  ];

  for (const bucket of bucketsToTest) {
    console.log(`\n🔍 Checking Bucket: "${bucket}"...`);
    try {
      const response = await r2Client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          MaxKeys: 5,
        })
      );
      console.log(`✅ Connection to "${bucket}" succeeded perfectly!`);
      console.log(`ℹ️ Found ${response.KeyCount || 0} objects in bucket.`);
      if (response.Contents && response.Contents.length > 0) {
        console.log('📂 Recent objects:');
        response.Contents.forEach((obj) => {
          console.log(`   - ${obj.Key} (${(obj.Size / 1024 / 1024).toFixed(2)} MB)`);
        });
      } else {
        console.log('ℹ️ Bucket is empty.');
      }
    } catch (err) {
      console.error(`❌ Connection to "${bucket}" failed:`, err.message);
    }
  }

  // 3. Validate Zoho Catalyst SDK Load
  console.log('\n⚡ Verifying Zoho Catalyst SDK Integration...');
  try {
    const catalyst = await import('zcatalyst-sdk-node');
    if (catalyst) {
      console.log('✅ Zoho Catalyst Node SDK loaded successfully!');
      console.log('ℹ️ Ready to orchestrate Serverless AppSail / Datastore transactions.');
    }
  } catch (err) {
    console.error('❌ Zoho Catalyst Node SDK failed to import:', err.message);
  }

  console.log('\n🎉 LazPlay Catalyst Integration test complete!');
}

runTest();
