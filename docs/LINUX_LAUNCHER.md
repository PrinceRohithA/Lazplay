Lazplay — Linux Launcher Architecture and Implementation Plan
Vision
The Linux launcher is designed to:

support Linux gamers and developers
distribute native Linux games
support Proton/Wine compatibility
provide efficient updates and patching
integrate with Lazplay ecosystem features
support low-resource systems

The launcher should:

remain lightweight
work across major Linux distributions
avoid unnecessary dependencies
support chunked downloads and caching
integrate well with native Linux filesystem behavior


Core Goals
The Linux launcher should:

browse games
install games
update games
support Proton/Wine launching
support chunk caching
support resumable downloads
support delta patching
integrate achievements and profiles


Linux Ecosystem Reality
Linux gaming is fragmented.
Different distributions:

Ubuntu
Fedora
Arch
Debian
Pop!_OS
Mint
SteamOS

have:

different package systems
different libraries
different filesystem layouts

The launcher architecture must minimize compatibility problems.

Recommended Launcher Technology
Best Recommendation
Tauri + Rust backend
Frontend:

React
TypeScript

Backend:

Rust

Reasons:

lightweight
low RAM usage
native performance
excellent filesystem handling
efficient hashing/chunking
small installer size


Why Not Electron Long-Term
Electron works.
But Linux users often:

care about efficiency
dislike memory-heavy apps
use weaker systems
prefer lightweight tooling

Electron may still work for early releases.
But long-term:

Tauri aligns better with Linux ecosystem expectations.


Core Launcher Components
1. UI Layer
Handles:

game discovery
downloads
library management
profiles
updates
settings


2. Download Manager
Handles:

resumable downloads
chunk downloads
delta patching
retry logic
bandwidth management


3. Cache System
Stores:

chunks
manifests
downloaded assets
reusable patch data


4. Runtime Manager
Handles:

native Linux games
Proton launches
Wine launches
runtime compatibility


Launcher Distribution Methods
Recommended Initial Formats
AppImage
Primary recommendation.
Benefits:

portable
distro-independent
easy distribution
minimal installation friction


Flatpak (Later)
Benefits:

sandboxing
software center integration
dependency consistency

Drawbacks:

larger size
sandbox complexity


Native Packages (Optional Later)
Examples:

.deb
.rpm

Not recommended initially.
Maintenance burden too high.

Game Types Supported
1. Native Linux Games
Launcher directly launches:

Linux executables
native builds


2. Proton-Compatible Windows Games
Launcher supports:

Proton integration
compatibility configuration
runtime management


3. Wine-Compatible Games
Optional support later.
Launcher may:

create Wine prefixes
manage compatibility settings
configure launch options


Proton Integration Architecture
Recommended Philosophy
Do NOT build your own compatibility layer.
Instead:

integrate existing Proton installations
detect Steam Proton automatically later
allow custom Proton paths


Proton Launch Flow
Player launches Windows game
↓
Launcher detects Proton runtime
↓
Create/Reuse compatibility prefix
↓
Launch game using Proton


Storage Architecture
Recommended Linux Paths
Cache
~/.cache/lazplay/


Games
~/Games/Lazplay/


Configs
~/.config/lazplay/


Logs
~/.local/share/lazplay/logs/


Chunked Download Architecture
Download Flow
Launcher requests manifest
↓
Compare local chunk cache
↓
Download missing chunks
↓
Verify hashes
↓
Decompress chunks
↓
Reassemble runtime files
↓
Launch game


Recommended Chunk Strategy
Chunk size:

100MB recommended

Hashing:

BLAKE3

Compression:

zstd level 3–5


Why Linux Fits Chunking Well
Linux handles:

filesystem operations
background tasks
streaming writes
decompression

very efficiently.
Chunked patching works extremely well on Linux.

Cache System
Cache Philosophy
Launcher stores:

reusable chunks
manifests
downloaded patch data

Benefits:

lower bandwidth
faster reinstalls
efficient updates


Cache Structure
~/.cache/lazplay/chunks/
~/.cache/lazplay/manifests/
~/.cache/lazplay/temp/


Delta Patching System
Update Flow
Launcher downloads:

only changed chunks

Example:
Old version:

hashA
hashB
hashC

New version:

hashA
hashB
hashD

Only:

hashD downloads.


Integrity Verification
Purpose
Prevent:

corrupted installs
incomplete downloads
tampering


Verification Method
Use:

BLAKE3 hashes

Launcher verifies:

chunks
manifests
runtime reconstruction


Repair System
Launcher should support:

verify installation
detect broken chunks
redownload corrupted data only


Web Game Support
Initial Strategy
Launcher opens:

browser games
external browser sessions

Avoid embedding heavy browser runtimes initially.

Linux-Specific Challenges
1. Library Differences
Different distros may:

lack dependencies
use different versions
behave inconsistently

Solution:

AppImage initially
bundled runtime dependencies


2. Permissions
Linux executables may require:

executable permission fixes

Launcher should:

automatically set executable permissions when needed.


3. Wayland vs X11
Modern Linux uses:

Wayland
X11

UI framework must support both properly.

Authentication System
Login Flow
User logs in
↓
Backend validates account
↓
Token stored locally
↓
Launcher retrieves profile

Security Architecture
Download Protection
Use:

signed URLs
ownership verification
private chunk access


Anti-Piracy Philosophy
Goal:

reduce casual redistribution

Not:

impossible DRM.

Linux users generally dislike aggressive DRM.
Avoid:

intrusive anti-cheat
kernel-level systems
heavy DRM restrictions


Notification System
Launcher notifications:

updates
downloads complete
game updates
events
achievements


Cosmetic and Profile Integration
Launcher displays:

player profiles
badges
achievements
cosmetics
developer profiles


Analytics and Monitoring
Track:

installs
update adoption
download failures
chunk reuse
patch efficiency
launcher crashes


Recommended Development Phases
Phase 1 — Core Launcher
Build:

login
game browsing
installs
downloads
native game launching


Phase 2 — Chunk System
Add:

chunk downloads
cache system
resumable downloads
delta patching


Phase 3 — Proton Integration
Add:

Proton management
compatibility tools
launch configuration


Phase 4 — Ecosystem Features
Add:

achievements
cosmetics
cloud saves
events
social systems


Important Technical Philosophy
Linux launcher should prioritize:

efficiency
openness
lightweight operation
filesystem performance
reliability

Avoid:

bloated runtimes
unnecessary background processes
excessive telemetry


Infrastructure Integration
Launcher integrates with:

Cloudflare Workers
R2 storage
manifest APIs
chunk systems
signed URLs
authentication systems


Long-Term Vision
The Linux launcher should eventually support:

efficient chunked distribution
Proton ecosystem integration
patch-efficient updates
low-bandwidth installs
reusable caches
indie Linux game ecosystem growth


Final Philosophy
The Linux launcher should:

feel lightweight
support open ecosystems
integrate smoothly with Linux workflows
provide efficient game distribution
support indie developers
reduce repeated downloads
scale sustainably with low infrastructure cost

The goal is not to replace Steam.
The goal is:

indie-focused Linux support
efficient distribution
Proton-friendly ecosystem integration
low-friction publishing and installation

