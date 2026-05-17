/** 50MB — balanced patch efficiency vs operation count (arch doc). */
export const CHUNK_SIZE_BYTES = 50 * 1024 * 1024;

/** Maximum total uncompressed build size. */
export const MAX_GAME_SIZE_BYTES = 10 * 1024 * 1024 * 1024;

/** zstd level 3–5: fast, good ratio (arch doc). */
export const ZSTD_LEVEL = 3;

export const COMPRESSION = 'zstd';
export const HASH_ALGORITHM = 'blake3';

export const SUPPORTED_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.pak', '.assets', '.resource',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tga', '.dds', '.ktx',
  '.ogg', '.wav', '.mp3', '.flac', '.bank',
  '.json', '.xml', '.txt', '.csv', '.lua', '.js', '.html', '.css', '.wasm',
  '.unity3d', '.bundle', '.manifest', '.cfg', '.ini', '.toml', '.yaml', '.yml',
  '.apk', '.obb', '.zip', '.7z', '.rar',
  '.glb', '.gltf', '.obj', '.fbx', '.blend',
  '.ttf', '.otf', '.woff', '.woff2',
  '.mp4', '.webm', '.avi', '.mov',
  '.pck', '.import', '.godot', '.tscn', '.tres',
  '.phaser', '.scene', '.prefab'
]);

export const UNSUPPORTED_EXTENSIONS = new Set([
  '.pdb', '.mdb', '.log', '.tmp', '.bak', '.ds_store', '.git', '.svn'
]);
