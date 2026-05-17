Lazplay — Android Launcher Architecture and Implementation Plan
Vision
The Android launcher is designed to:

simplify Android game access
manage APK installs and updates
support chunked downloads later
reduce repeated downloads
integrate platform identity and rewards
support future ecosystem features

The launcher should:

feel lightweight
work on low-end devices
minimize storage usage
minimize bandwidth usage
support unstable internet conditions


Core Goals
The Android launcher should:

allow browsing games
support APK downloads
support updates
verify downloads
cache downloads
support account login
integrate cosmetics/profile systems
support notifications
support future patching systems


Initial Release Scope (v1)
Main Features
Authentication

login/signup
account sessions
token storage
profile loading


Game Discovery
Launcher displays:

trending games
recent uploads
browser games
Android games
featured developers


APK Downloads
Launcher supports:

downloading APKs
resumable downloads
progress tracking
integrity verification


Install Management
Launcher can:

trigger APK install
track installed games
track versions
detect updates


Notifications
Possible notifications:

game updates
event notifications
rewards
developer announcements


Android Restrictions
Important Android Reality
Android does NOT allow:

silent APK installs
replacing apps automatically
unrestricted filesystem access

User must manually confirm installs.

Recommended Initial Architecture
Simple APK Distribution
Flow:
Player selects game
↓
Launcher downloads APK
↓
Launcher verifies file
↓
Launcher opens Android installer
↓
User confirms install

Launcher Architecture
Main Components
UI Layer
Handles:

browsing
downloads
profiles
cosmetics
notifications


Download Manager
Handles:

downloads
resumable downloads
retries
chunk downloading later
integrity checks


Cache System
Stores:

downloaded APKs
manifests
thumbnails
launcher assets


API Layer
Handles:

authentication
game metadata
ownership verification
signed URL requests
update checks


Recommended Tech Stack
Preferred Framework
Flutter
Reason:

already familiar
Android support
UI flexibility
future desktop expansion possible


Alternative
Native Android:

Kotlin

Better performance.
More complex development.

Authentication Flow
Login Flow
User logs in
↓
Server validates account
↓
Access token generated
↓
Launcher stores token securely

Recommended Storage
Use:

secure local storage

Avoid:

plain shared preferences for sensitive tokens


APK Download System
Initial Download Flow
Launcher requests download
↓
API verifies ownership
↓
Worker generates signed URL
↓
Launcher downloads APK
↓
Verify hash
↓
Install prompt

Download Verification
Purpose
Prevent:

corruption
incomplete downloads
tampering


Verification Method
Use:

SHA-256 or BLAKE3 hashes

Example:
Downloaded APK
↓
Generate hash
↓
Compare with manifest


Cache System
Purpose
Reduce repeated downloads.

Cached Data
Store:

downloaded APKs
launcher assets
manifests
thumbnails


Cache Management
Launcher should:

auto-clean old files
limit cache size
allow manual clearing


Update System
v1 Update Strategy
Simple:

full APK redownload

Flow:
Launcher checks version
↓
New version available
↓
Download new APK
↓
Install prompt

Future Update System
Possible later:

chunked APK downloads
differential patching
asset reuse

Important:
Android app signing makes advanced patching more complicated.

Android Package Limitations
Important Reality
APK updates are harder than PC patching because:

Android package signatures matter
apps reinstall/update through package manager
app data separation exists


Practical Initial Approach
Use:

full APK updates initially

Avoid:

custom APK patch systems early


Web Game Support
Launcher Browser Integration
Launcher can:

open browser games
embed WebView later
support instant play


Recommended Initial Approach
Open web games externally.
Reason:

simpler
lower maintenance
better compatibility


Game Metadata System
Launcher Fetches
For each game:

title
icon
screenshots
developer
tags
version
size
update status


Offline Support
Initial Support
Launcher should cache:

thumbnails
manifests
installed game metadata


Future Offline Features
Possible later:

offline library
offline patch verification
cached store pages


Notification System
Notification Types
Examples:

update available
new game release
event rewards
game jam announcements
purchase confirmations


Cosmetic Integration
Launcher Displays
Player profile:

badges
profile themes
cosmetics
achievements


Analytics and Monitoring
Launcher Analytics
Track:

installs
updates
crashes
download failures
cache usage
retention


Anti-Abuse Considerations
Possible Abuse
Examples:

APK sharing
fake downloads
modified launchers
automation abuse


Basic Protection Methods
Use:

signed URLs
account validation
rate limits
ownership verification


Long-Term Launcher Vision
The Android launcher may eventually support:

chunked downloads
launcher-managed patching
cloud saves
social systems
achievements
launcher chat
game recommendations
cross-platform accounts


Recommended Development Phases
Phase 1 — Core Launcher
Build:

login
browsing
APK downloads
install flow
update checks
notifications


Phase 2 — Stability
Add:

resumable downloads
cache cleanup
integrity verification
analytics
crash handling


Phase 3 — Ecosystem Features
Add:

cosmetics
achievements
events
recommendations
profiles


Phase 4 — Advanced Distribution
Possible future:

chunked downloads
patching systems
shared asset caching
launcher optimization


Important Technical Philosophy
Android launcher should prioritize:

simplicity
reliability
low-end device support
low bandwidth usage
low RAM usage

Avoid:

overengineered patch systems initially


Recommended Initial Storage Structure
/launcher/cache/
/launcher/downloads/
/launcher/manifests/


Infrastructure Integration
Launcher integrates with:

Cloudflare Workers
R2 storage
authentication APIs
manifests
signed URLs


Final Philosophy
The Android launcher should:

reduce friction for mobile players
simplify Android game discovery
support indie developers
work reliably on weak devices
reduce repeated downloads
integrate into the Lazplay ecosystem

The goal is not to compete with Google Play.
The goal is:

ecosystem integration
indie distribution
low-friction discovery
community engagement

