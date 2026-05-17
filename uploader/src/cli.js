#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { processBuildDirectory } from '@lazplay/distribution';
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

  console.log('[1/5] Scanning, bundling, compressing, and chunking (client-side)...');
  const { manifest, chunks, scan } = await processBuildDirectory(buildPath, {
    version,
    entrypoint,
    platform
  });

  console.log(`  Files: ${scan.fileCount}, Size: ${(scan.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Bundles: ${manifest.bundles.length}, Chunks: ${manifest.chunkHashes.length}`);
  if (scan.unsupported.length) {
    console.warn(`  Warning: ${scan.unsupported.length} unsupported/skipped file patterns`);
  }

  const hashList = manifest.chunkHashes;
  console.log('[2/5] Checking existing chunks on server...');
  const { existing, missing } = await api.checkChunks(buildId, hashList);
  console.log(`  Existing: ${existing.length}, Missing: ${missing.length}`);

  console.log('[3/5] Uploading missing chunks...');
  let uploaded = 0;
  for (const hash of missing) {
    const chunk = chunks.get(hash);
    if (!chunk) {
      throw new Error(`Chunk data missing for hash ${hash}`);
    }

    const { uploadUrl } = await api.getChunkUploadUrl(buildId, hash, chunk.size);
    await api.uploadChunkToUrl(uploadUrl, chunk.data);
    await api.completeChunk(buildId, hash, chunk.size);
    uploaded += 1;
    process.stdout.write(`\r  Uploaded ${uploaded}/${missing.length}`);
  }
  if (missing.length) console.log('');

  console.log('[4/5] Publishing manifest...');
  const result = await api.publishManifest(buildId, manifest, version);
  console.log(`  Chunk count: ${result.chunkCount}, Total: ${(result.totalBytes / 1024 / 1024).toFixed(2)} MB`);

  console.log('[5/5] Done. Run make-latest on the build to release.');
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
