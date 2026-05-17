Lazplay — Platform Architecture, Distribution System, and Ecosystem Roadmap

Vision
Lazplay is an indie game platform focused on:

Indian/Tamil Nadu indie developers
student developers
beginner game creators
software developers transitioning into game development
browser-first and low-friction distribution

The goal is not to compete directly with Steam or itch.io globally.

The goal is to:
create a regional indie ecosystem
reduce friction for developers
reduce infrastructure cost
improve discoverability for small developers
support efficient long-term game distribution
make indie game development socially rewarding


Core Philosophy
Platform Goals
Lazplay should:

feel welcoming
feel discoverable
feel modern
reduce developer pain
reduce player friction
survive with low operational cost

The platform should optimize for:

low recurring infrastructure costs
efficient patching
efficient storage usage
strong CDN caching
low operational burden
scalable architecture


Target Platforms
Primary Platforms
Windows
Main target platform.
Support:

Windows 10
Windows 11
64-bit builds

Browser/Web
Very important for:

instant play
sharing
low friction
college demos
web developer onboarding

Supported:

HTML5
Phaser
Godot Web
Unity WebGL

Android
Support:

APK uploads
launcher support


Secondary Platforms
Linux
Support through:

native Linux builds
Proton compatibility tags
Wine compatibility notes

macOS
Low priority initially.

Current Development Progress
Completed in first 3 days:

web game playing
Windows launcher
Razorpay payment gateway
basic game upload system
Cloudflare integrations
basic distribution architecture

Planned transition:

Razorpay direct payments → coin/wallet system later


Core MVP Features
Developer Features
Developer Accounts

signup/login
profile page
profile picture
bio
social links
uploaded games list

Game Upload
Support:

browser games
Windows builds
Android APKs
optional Linux builds

Metadata:

title
description
tags
screenshots
banner
version
changelog
file size
build type

Developer Dashboard

upload management
version management
analytics
download counts
update management


Player Features
Game Pages
Each game page contains:

screenshots
trailer
play/download button
comments
ratings
developer info
update logs
download count
views

Discovery System
Sections:

Trending
New Releases
Tamil Indie Games
Browser Games
Student Projects
Most Played

Comments and Feedback

comments
likes
ratings
player feedback


Payments
Initial System

Razorpay gateway
direct purchases

Future System
Coin/wallet system:

easier microtransactions
cosmetics
profile rewards
game purchases
platform economy


Infrastructure Architecture
Cloudflare-Centered Architecture
Frontend
Cloudflare Pages
Purpose:

static frontend hosting
CDN delivery
low-cost scaling
SSL
global edge delivery


APIs/Auth
Current:

Catalyst backend

Possible future:

Cloudflare Workers
Node.js backend

Purpose:

authentication
APIs
metadata
upload handling
access control


Storage
Cloudflare R2
Purpose:

game storage
screenshots
trailers
manifests
chunk storage

Reason:

no egress fees
CDN-friendly
lower cost for downloads


Workers
Cloudflare Workers used for:

private bucket access
signed URL generation
authentication checks
caching logic
rate limiting


Security and Access Control
Private Build Access
Flow:
User requests download
↓
Worker validates access
↓
Worker generates temporary signed URL
↓
User downloads from R2
Benefits:

prevents direct file sharing
reduces casual piracy
keeps buckets private


Platform Security
Cloudflare protections:

DDoS protection
bot mitigation
rate limiting
challenge pages
CAPTCHA support


Game Distribution Philosophy
Core Goal
Reduce:

bandwidth usage
repeated downloads
storage duplication
infrastructure costs

while improving:

patching efficiency
player experience
developer convenience


Distribution System Architecture
Launcher Philosophy
Launcher should:

cache chunks locally
verify hashes
support resumable downloads
support delta patching
reduce repeated downloads
persist game data locally


Chunk-Based Distribution System
Chunking Philosophy
Games are split into chunks before upload.
Example:
Game Build
↓
Split into chunks
↓
Hash chunks
↓
Upload only missing chunks
↓
Generate manifest

Recommended Chunk Size
Recommended Initial Chunk Size
100MB
Reasons:

fewer operations
lower R2 operation cost
manageable manifests
still supports delta patching


Chunk Size Tradeoffs
Small Chunks (1MB)
Pros:

excellent patch efficiency

Cons:

massive operation counts
expensive metadata
expensive API operations
complex manifests


Large Chunks (500MB)
Pros:

fewer operations

Cons:

poor patch efficiency
tiny changes invalidate huge chunks
poor resumable downloads


Balanced Choice
50MB–100MB recommended.

Hashing System
Purpose
Hashes are used for:

chunk identity
deduplication
delta patching
integrity verification
version comparison


Hash Workflow
Chunk Data
↓
Hash Function
↓
Unique Hash ID
Example:
Chunk A → hash123
Chunk B → hash999
If hashes match:

content is identical
no reupload needed


Recommended Hash Algorithm
BLAKE3
Reasons:

extremely fast
ideal for large files
parallelized
modern


Delta Patching System
Philosophy
Only changed chunks should upload/download.

Upload Flow
Version 1:

upload all chunks

Version 2:

hash chunks again
compare with server
upload only changed hashes


Example
Old Manifest:

hashA
hashB
hashC

New Manifest:

hashA
hashB
hashD

Only hashD uploads.

Manifest System
Manifest Purpose
Manifest stores:

chunk hashes
version info
bundle mappings
metadata


Example Manifest Structure
{
  "version": "1.2",
  "chunks": [
    "hashA",
    "hashB",
    "hashC"
  ]
}


Content Addressed Storage
Philosophy
Chunks are identified by content hash.
Instead of:
chunk_001
chunk_002
Use:
/chunks/hashA
/chunks/hashB
Benefits:

deduplication
version reuse
patch efficiency
storage optimization


Compression Strategy
Important Philosophy
Do NOT chase maximum compression.
Optimize for:

speed
usability
reasonable compression
lower CPU cost


Recommended Compression
Downloadable Builds
Use:

zstd

Recommended Levels:

level 3–5

Reason:

fast compression
fast decompression
good ratios


Web Assets
Use:

Brotli
gzip
CDN compression


Compression Tradeoff
More compression:

lower bandwidth
slower processing

Less compression:

faster installs
higher storage usage

Balanced approach preferred.

Bundling System
Purpose
Reduce:

huge file counts
HTTP requests
CDN overhead


Bundle Workflow
Folder
↓
Bundle assets
↓
Compress
↓
Chunk
↓
Hash
↓
Upload

Web Build Problem
Many web builds contain:

thousands of files
many tiny requests
poor caching behavior

Solution:

package assets into bundles
reduce request counts


Recommended Initial Format
ZIP-based bundles.
Reason:

simple
stable
easy to debug
widely supported


Launcher Architecture
Launcher Goals
The launcher should support:

local cache
hash verification
chunk reuse
resumable downloads
delta patching
game repair
version rollback
update management


Launcher Cache Philosophy
Store:

compressed chunks locally

Then:

compare manifests
download only changed chunks
reuse existing chunks


Download Workflow
Get manifest
↓
Compare local hashes
↓
Download missing chunks
↓
Reassemble
↓
Launch game

Web Game Philosophy
Problem
Most web game engines:

preload assets
download startup bundles
assume local asset access

This causes:

slow startup
huge downloads


Long-Term Goal
Encourage:

lazy loading
streamed assets
modular web builds
smaller startup packages


Important Limitation
Platforms cannot fully optimize poorly designed game builds automatically.
Developers must eventually:

structure assets properly
support streaming
optimize bundles


Upload System Evolution
v1
Simple uploads.

v2
Client-side compression.

v3
Chunked uploads.

v4
Hash comparison and delta patching.

v5
Advanced launcher and streaming systems.

Desktop Uploader
Long-Term Recommendation
Use a desktop uploader instead of browser-only uploads for:

large builds
chunk hashing
compression
resumable uploads
patch generation


Recommended Technologies
Preferred
Tauri
Reasons:

lightweight
low RAM usage
efficient

Alternative
Electron
Reason:

faster development


Platform Limits
Recommended Initial Limits
Maximum Game Size
10GB
Chunk Size
100MB
Browser Games
Recommended under 200MB startup.

Infrastructure Cost Philosophy
Main Goal
Reduce recurring cost.
Priority:

lower bandwidth
lower operations
deduplication
patch efficiency
strong caching


Community Strategy
Core Community Goal
Become:

the default indie platform for Tamil Nadu students
welcoming to beginner developers
socially rewarding for uploads


Important Cultural Features
Developers should feel:

visible
respected
recognized
discoverable


Important Player Features
Players should feel:

the platform is alive
discovering games is exciting
indie games matter


Long-Term Vision
Lazplay evolves from:
basic upload platform
↓
regional indie ecosystem
↓
optimized distribution platform
↓
launcher ecosystem
↓
developer community network

Hard Targets
Phase 1

stable public launch
50 uploaded games
25 active developers
keep infra below ₹1500/month


Phase 2

200–300 uploaded games
100 active developers
1000 registered players
first successful game jam


Phase 3

chunked uploader system
delta patching
launcher cache system
strong deduplication


Phase 4

statewide developer ecosystem
launcher maturity
sustainable revenue
platform identity


Final Platform Philosophy
Lazplay should:

reduce friction
reduce recurring cost
reduce wasted downloads
support indie developers
make publishing simple
make discovery exciting
survive long-term sustainably

The platform should optimize for:

practicality
scalability
developer friendliness
operational survivability
strong community identity

