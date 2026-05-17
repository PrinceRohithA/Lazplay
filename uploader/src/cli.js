#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runUploadPipeline } from '@lazplay/distribution';
import { LazPlayApi } from './api.js';

function usage() {
  console.log(`
LazPlay Chunked Uploader

Usage:
  node src/cli.js upload --build-id <id> --path <dir> --token <jwt> [--entrypoint game.exe] [--version 1.0.0] [--api https://play.lazplay.tech/api/v1]

Environment:
  LAZPLAY_API_URL   API base URL
  LAZPLAY_TOKEN     Bearer token (alternative to --token)

Pipeline (client-side, per architecture doc):
  scan → bundle → zstd compress → 50MB chunks → BLAKE3 hash → upload missing only → publish manifest
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      args[key] = argv[++i];
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function uploadBuild(options) {
  const buildId = options['build-id'];
  const buildPath = path.resolve(options.path);
  const token = options.token || process.env.LAZPLAY_TOKEN;
  const apiBase = options.api || process.env.LAZPLAY_API_URL;

  if (!buildId || !options.path) {
    throw new Error('--build-id and --path are required');
  }
  if (!token) {
    throw new Error('--token or LAZPLAY_TOKEN is required');
  }
  if (!fs.existsSync(buildPath) || !fs.statSync(buildPath).isDirectory()) {
    throw new Error(`Build path not found: ${buildPath}`);
  }

  const api = new LazPlayApi(token, apiBase);
  const version = options.version || '1.0.0';
  const entrypoint = options.entrypoint || null;
  const platform = options.platform || 'WINDOWS';

  console.log('[1/4] Booting native high-performance uploader pipeline...');
  const result = await runUploadPipeline({
    gameId: '', // not strictly needed for this CLI call
    buildId,
    folderPath: buildPath,
    platform,
    version,
    entrypoint,
    requestApi: async (method, endpoint, body) => {
      return api.request(method, endpoint, body);
    },
    uploadChunkToUrl: async (uploadUrl, chunkBuffer) => {
      await api.uploadChunkToUrl(uploadUrl, chunkBuffer);
    },
    onProgress: (progress, status) => {
      console.log(`  [Pipeline Progress ${progress}%] -> ${status}`);
    }
  });

  console.log('[2/4] Upload & delta patching process finalized successfully ✓');
  console.log(`  Chunks: ${result.chunkCount}, Total Staged Size: ${(result.totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log('[3/4] Manifest published object key:', result.manifestObjectKey);
  console.log('[4/4] Done.');
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  const command = args._[0] || 'upload';

  if (command === 'help' || args.help) {
    usage();
    return;
  }

  if (command === 'upload') {
    await uploadBuild(args);
    return;
  }

  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error('Upload failed:', err.message);
  process.exit(1);
});
