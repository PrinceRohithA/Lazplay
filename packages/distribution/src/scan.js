import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_GAME_SIZE_BYTES,
  SUPPORTED_EXTENSIONS,
  UNSUPPORTED_EXTENSIONS
} from './constants.js';

/**
 * Recursively scan a build directory.
 * @param {string} rootDir
 * @returns {Promise<{ files: Array<{ relativePath: string, absolutePath: string, size: number }>, totalSize: number, fileCount: number, unsupported: string[], duplicates: string[] }>}
 */
export async function scanBuildDirectory(rootDir, { platform } = {}) {
  const files = [];
  const seenSizes = new Map();
  const duplicates = [];
  const unsupported = [];
  let totalSize = 0;

  async function walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '__MACOSX') continue;
        await walk(absolutePath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, '/');

      if (UNSUPPORTED_EXTENSIONS.has(ext) || entry.name.startsWith('.')) {
        unsupported.push(relativePath);
        continue;
      }

      if (ext && !SUPPORTED_EXTENSIONS.has(ext)) {
        unsupported.push(relativePath);
      }

      const stat = await fs.promises.stat(absolutePath);
      totalSize += stat.size;
      files.push({ relativePath, absolutePath, size: stat.size });

      const key = `${stat.size}:${relativePath.split('/').pop()}`;
      if (seenSizes.has(key)) {
        duplicates.push(relativePath);
      } else {
        seenSizes.set(key, relativePath);
      }
    }
  }

  await walk(rootDir);

  const platformUpper = platform?.toUpperCase();
  const isAndroid = platformUpper === 'ANDROID';
  const isWeb = platformUpper === 'WEB' || platformUpper === 'HTML5';

  if (isWeb) {
    if (files.length > 2000) {
      throw new Error(`Web game builds are strictly limited to a maximum of 2,000 files/items to ensure optimal browser execution performance. Your build contains ${files.length} items. Please compress, pack textures, or bundle assets.`);
    }
    if (totalSize > 500 * 1024 * 1024) {
      throw new Error(`Web game builds are strictly limited to a maximum size of 500MB. Your build is ${(totalSize / 1024 / 1024).toFixed(2)}MB.`);
    }
    const hasIndexHtml = files.some(f => f.relativePath.toLowerCase() === 'index.html' || f.relativePath.toLowerCase().endsWith('/index.html'));
    if (!hasIndexHtml) {
      throw new Error(`index.html was not found in the build directory. Web game builds must contain a valid index.html entrypoint at the root or within subdirectories.`);
    }
  } else {
    const limit = isAndroid ? 5 * 1024 * 1024 * 1024 : MAX_GAME_SIZE_BYTES;
    if (totalSize > limit) {
      const limitLabel = isAndroid ? '5GB' : '10GB';
      throw new Error(`Build exceeds maximum size of ${limitLabel} for ${platform || 'NATIVE'} (${totalSize} bytes)`);
    }
  }

  return { files, totalSize, fileCount: files.length, unsupported, duplicates };
}

/**
 * Assign files to logical bundles (core, textures, audio, maps, other).
 * @param {Array<{ relativePath: string, absolutePath: string, size: number }>} files
 * @returns {Record<string, typeof files>}
 */
export function groupIntoBundles(files) {
  const bundles = {
    'core.bundle': [],
    'textures.bundle': [],
    'audio.bundle': [],
    'maps.bundle': [],
    'other.bundle': []
  };

  const textureExt = /\.(png|jpg|jpeg|webp|gif|bmp|tga|dds|ktx)$/i;
  const audioExt = /\.(ogg|wav|mp3|flac|bank)$/i;
  const mapPath = /(^|\/)maps?\/|(^|\/)levels?\//i;

  for (const file of files) {
    const name = file.relativePath.toLowerCase();
    if (textureExt.test(name)) {
      bundles['textures.bundle'].push(file);
    } else if (audioExt.test(name)) {
      bundles['audio.bundle'].push(file);
    } else if (mapPath.test(name)) {
      bundles['maps.bundle'].push(file);
    } else if (/\.(exe|dll|so|dylib|html|wasm|js|json|pak|assets|resource|bin|dat)$/i.test(name)) {
      bundles['core.bundle'].push(file);
    } else {
      bundles['other.bundle'].push(file);
    }
  }

  for (const key of Object.keys(bundles)) {
    if (bundles[key].length === 0) delete bundles[key];
  }

  return bundles;
}
