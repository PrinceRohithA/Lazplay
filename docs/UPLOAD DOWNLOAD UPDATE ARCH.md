Lazplay — Upload, Download, Update, and Storage Architecture Document

1. Developer Upload Architecture
Goal
Allow developers to:

upload large games
update builds efficiently
reduce repeated uploads
reduce bandwidth usage
support resumable uploads


Upload Flow
Step 1 — Developer Selects Build
Supported:

Windows builds
Web builds
Android APKs
Linux builds

Uploader scans:

total size
file count
duplicate files
unsupported formats


Step 2 — Bundle Creation
Files grouped into bundles.
Example:
core.bundle
textures.bundle
audio.bundle
maps.bundle

Purpose:

reduce HTTP requests
simplify chunking
improve caching


Step 3 — Compression
Bundles compressed locally.
Recommended:

zstd level 3–5

Reason:

reduce upload size
reduce storage usage
reduce server CPU usage


Step 4 — Chunking
Compressed bundles split into chunks.
Recommended:

50MB chunks

Example:
bundle
↓
chunk001
chunk002
chunk003


Step 5 — Hash Generation
Each chunk hashed.
Recommended:

BLAKE3

Example:
chunk001 → hashA
chunk002 → hashB

Hash becomes chunk identity.

Step 6 — Chunk Comparison
Uploader sends hashes to server.
Server checks:
already exists?

If yes:

skip upload

If no:

upload chunk


Step 7 — Upload Missing Chunks
Uploader uploads only missing chunks.
Upload method:

multipart upload
resumable upload


Step 8 — Manifest Generation
Manifest stores:

version
chunk hashes
compression type
bundle mappings
metadata

Example:
{
  "version": "1.0.0",
  "chunks": [
    "hashA",
    "hashB"
  ]
}


Step 9 — Publish
After upload:

manifest stored
metadata updated
game page updated
launcher notified

IMPORTANT: Compression and chunking should be done in the uploader machine itself NOT ON THE SERVER. This will reduce the server load and bandwidth usage.

2. Update and Delta Patching Architecture
Goal
Avoid:

full reuploads
full redownloads
repeated bandwidth usage


Update Flow
Step 1 — Developer Updates Build
Developer modifies game files.

Step 2 — Rebundle and Rechunk
Uploader:

rebuilds bundles
rechunks data
rehashes chunks


Step 3 — Compare Hashes
Example:
Old Version:
hashA
hashB
hashC

New Version:
hashA
hashB
hashD

Only:
hashD

uploads.

Step 4 — Generate New Manifest
New manifest references:

reusable old chunks
newly uploaded chunks


Step 5 — Release Update
New version becomes:

latest version
downloadable through launcher
available on website


Delta Patching Philosophy
Goal:

transfer only changed chunks

Benefits:

lower bandwidth
faster updates
lower infrastructure cost


Chunk Tradeoffs
1MB Chunks
Pros:

excellent patch efficiency

Cons:

huge operation count
expensive metadata


500MB Chunks
Pros:

fewer operations

Cons:

tiny changes invalidate huge chunks


Recommended
50MB chunks.

3. Player Download Architecture
Goal
Allow players to:

download efficiently
avoid repeated downloads
resume downloads
patch quickly


Player Download Flow
Step 1 — Player Requests Install
Launcher downloads:

manifest
version metadata
chunk list


Step 2 — Local Cache Check
Launcher compares local chunks.
Example:
Already have:
hashA
hashB

Need:
hashC


Step 3 — Download Missing Chunks
Launcher downloads only missing chunks.
Downloaded from:

Cloudflare CDN
R2 storage

Protected using:

Workers
signed URLs


Step 4 — Verify Hashes
Launcher verifies downloaded chunks.
If mismatch:

redownload chunk

Purpose:

corruption detection
integrity verification


Step 5 — Decompression
Launcher decompresses chunks locally.
Occurs:

during install
during updates


Step 6 — Reassemble Runtime Files
Launcher reconstructs:

bundles
runtime files
installation directory


Step 7 — Launch Game
Game launches normally from local installation.

Document 4 — Launcher Cache Architecture
Goal
Persist reusable data locally.

Cache Structure
/cache/chunks/
/cache/manifests/
/cache/temp/


Launcher Stores

compressed chunks
manifests
metadata
reusable downloads


Benefits

faster reinstalls
lower bandwidth
delta patch reuse
offline verification
lower infrastructure cost


Repair System
Launcher can:

verify hashes
detect corruption
redownload broken chunks only


Document 5 — Web Build Architecture
Problem
Most web builds:

preload large assets
contain thousands of files
create many HTTP requests


Initial Strategy
Host web builds directly on:

R2
Cloudflare CDN

Browser loads:

index.html
JS/WASM
asset bundles


Long-Term Goals
Possible future optimizations:

bundle packaging
asset streaming
lazy loading
chunked web assets
runtime manifests


Important Limitation
Platforms cannot automatically optimize:

engine preload systems
runtime assumptions
poorly designed builds

Developers must eventually:

optimize assets
modularize content
support streaming


Document 6 — Storage and Chunk Architecture
Core Philosophy
Use content-addressed storage.
Meaning:
hash = chunk identity


Storage Structure
/chunks/hashA
/chunks/hashB
/manifests/game_v1.json


Benefits

deduplication
version reuse
lower storage usage
patch efficiency


Recommended Limits
Maximum game size:

10GB

Chunk size:

50MB

Compression:

zstd level 3–5

Hashing:

BLAKE3


7. Security and Access Architecture
Paid Game Access Flow
Player purchases game
↓
Ownership verified
↓
Worker validates request
↓
Temporary signed URL generated
↓
Player downloads chunks

Anti-Piracy Philosophy
Goal:

reduce casual piracy

Not:

impossible DRM

Methods:

private buckets
signed URLs
ownership validation
launcher verification


8. Cost Optimization Philosophy
Main Problems

bandwidth
storage
duplicate uploads
repeated downloads
R2 operations


Main Optimizations
Deduplication
Avoid storing duplicate chunks.

Delta Patching
Download only changed chunks.

Compression
Reduce upload/download size.

Launcher Cache
Reuse existing chunks locally.

CDN Caching
Aggressively cache public assets.

Final Philosophy
Lazplay should:

reduce developer friction
reduce player frustration
reduce operational cost
support scalable distribution
make indie publishing easy
survive long-term sustainably

