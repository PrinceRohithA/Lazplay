# LazPlay: Master System Architecture & Flow Specification Suite

This document represents the absolute authoritative specification for the entire LazPlay ecosystem. It integrates all workflows, platform subsystems, database representations, and cross-project interactions (API Server, Creator CLI, Web Storefront, Electron Launcher, and Android Launcher).

---

## 1. Entire System Architecture Overview

LazPlay is an advanced, high-performance self-hosted game distribution platform leveraging **Content-Addressed Storage (CAS)**, delta uploader/downloader engines, and dynamic security isolation pools.

```mermaid
graph TB
    %% Core Infrastructure
    subgraph Storage & Infrastructure Pool
        R2_Public["Cloudflare Public R2 Bucket (Web Games & Extracted Assets)"]
        R2_Private["Cloudflare Private R2 Bucket (Native Zips, Manifests, Chunks)"]
        CDN["Cloudflare CDN / Edge Workers"]
        DB[(PostgreSQL Database)]
    end

    %% Backend Layer
    subgraph Distributed Backend API
        API["Node.js Fast Router Server (src/app.js)"]
        Prisma["Prisma ORM (src/prisma.js)"]
        AuthM["Auth & Authz Middleware"]
        GC["Windows Retention GC (src/services/distribution.js)"]
    end

    %% Developer Pipeline
    subgraph Developer Workspace Suite
        CLI["LazPlay Creator CLI / Package Pipeline"]
        ZipComp["Zstd Compressor / Blake3 Chunk Hasher"]
    end

    %% Clients Layer
    subgraph Player Runtime Environments
        Front["Web Storefront (Vite / React)"]
        Desktop["Electron Desktop Launcher (Tauri/TS)"]
        Android["Android Launcher App (Kotlin)"]
    end

    %% Relations & Handshakes
    CLI -->|1. Local Compression & Chunking| ZipComp
    CLI -->|2. Register Version Check| API
    CLI -->|3. Upload Chunks & Manifest| CDN
    CDN -->|Sync Upload Targets| R2_Private
    
    API <-->|Schema Query Mapping| Prisma
    Prisma <--> DB
    GC <-->|1. Retention Sweep| Prisma
    GC -->|2. Prune Chunks & ZIPs| R2_Private

    Front -->|1. Storefront Browsing / Claims| API
    Desktop -->|1. Fetch Manifest / Play Session Claims| API
    Desktop -->|2. Delta Download Chunks| CDN
    CDN -->|Serve Chunks / Decrypt Handshake| R2_Private

    Android -->|1. Sync Library / Update Check| API
    Android -->|2. Pull APK Payload| CDN
    CDN -->|Deliver APK| R2_Public

    classDef infrastructure fill:#1a1b26,stroke:#7aa2f7,stroke-width:2px,color:#c0caf5;
    classDef backend fill:#1f2335,stroke:#bb9af7,stroke-width:2px,color:#c0caf5;
    classDef client fill:#16161e,stroke:#9ece6a,stroke-width:2px,color:#c0caf5;
    classDef dev fill:#181825,stroke:#e0af68,stroke-width:2px,color:#c0caf5;

    class R2_Public,R2_Private,CDN,DB infrastructure;
    class API,Prisma,AuthM,GC backend;
    class CLI,ZipComp dev;
    class Front,Desktop,Android client;
```

---

## 2. Activity Diagram (Developer & Player End-to-End Workflow)

This activity diagram tracks a game build's lifecycle from the developer's computer to the player's runtime environment.

```mermaid
stateDiagram-v2
    [*] --> BuildScanning : Developer triggers deploy
    
    state BuildScanning {
        [*] --> CheckPlatformSize
        CheckPlatformSize --> LimitExceeded : Platform is Android & Size > 5GB
        CheckPlatformSize --> ScanFiles : Platform Under Limits
        ScanFiles --> LocalBundling : Pack into Bundles (core, textures, etc)
        LocalBundling --> CompressAndChunk : Compress (Zstandard) & Split (50MB)
        CompressAndChunk --> ComputeHashes : Generate Blake3 Chunk Checksums
    }
    
    LimitExceeded --> [*] : Terminate Deploy (Build Limit Exceeded)
    ComputeHashes --> RegisterBuild
    
    state RegisterBuild {
        [*] --> CheckDuplicateVersion
        CheckDuplicateVersion --> VersionConflict : Same Version on Platform Exists
        CheckDuplicateVersion --> FetchPreviousManifest : Version Valid
        FetchPreviousManifest --> CompareChunkLists
        CompareChunkLists --> IdenticalHalt : Chunk Hashes 100% Identical
        CompareChunkLists --> QueryMissingChunks : Changes Found
    }
    
    VersionConflict --> [*] : Terminate Deploy (SAME_VERSION)
    IdenticalHalt --> [*] : Terminate Deploy (NO_CHANGES_FOUND)
    
    state QueryMissingChunks {
        [*] --> SendHashesToServer
        SendHashesToServer --> CheckServerChunks : Server verifies existing hashes
        CheckServerChunks --> FilterMissing : Exclude existing chunks
    }
    
    FilterMissing --> ChunkTransmission
    
    state ChunkTransmission {
        [*] --> ResolveBucket : Web ? R2_Public : R2_Private
        ResolveBucket --> RequestSignedPUT : POST /upload-url
        RequestSignedPUT --> UploadChunkToR2 : HTTP PUT Chunk Data
        UploadChunkToR2 --> ConfirmChunkComplete : POST /complete
    }
    
    ChunkTransmission --> ManifestPublication
    
    state ManifestPublication {
        [*] --> UploadManifestJSON : Write Manifest to R2
        UploadManifestJSON --> UpdateDatabaseReady : Set build status to READY
        UpdateDatabaseReady --> WindowsRetentionSweep : Platform is WINDOWS?
        WindowsRetentionSweep --> KeepLatest3 : Prune old builds, manifests, ZIPs
        KeepLatest3 --> GarbageCollectChunks : Prune unreferenced R2 ContentChunks
    }
    
    GarbageCollectChunks --> [*] : Build Fully Published & Optimized!
```

---

## 3. Sequential Diagrams

### A. Uploader & Version Retention Sequence
Tracks how the Creator CLI registers, checks, uploads, and purges older builds.

```mermaid
sequenceDiagram
    autonumber
    actor Developer as Developer Creator
    participant CLI as LazPlay Creator CLI
    participant Server as Node.js API Storefront
    participant DB as PostgreSQL (Prisma)
    participant R2 as Cloudflare R2 Storage

    Developer->>CLI: lazplay-cli deploy --dir ./build --version 1.4.0 --platform WINDOWS
    CLI->>CLI: Scan files, group into Bundles, compress (zstd), and chunk (50MB)
    CLI->>CLI: Compute Blake3 hashes for each chunk payload
    
    CLI->>Server: POST /developer/games/:gameId/builds { version, platform, runtime }
    Server->>DB: Query existing ready/uploaded builds for duplicate version
    alt Duplicate Version Found
        Server-->>CLI: HTTP 409 (SAME_VERSION)
        CLI-->>Developer: Halt! Version already exists on this platform.
    else Version Unique
        Server->>DB: Insert GameBuild record (WAITING_FOR_UPLOAD)
        Server-->>CLI: Return buildId
    end

    CLI->>Server: GET /developer/games/:gameId/builds (Fetch past builds)
    Server->>DB: Query previous READY builds
    Server-->>CLI: Return builds list
    CLI->>Server: GET /developer/builds/:prevBuildId/manifest (Fetch latest manifest)
    Server-->>CLI: Return previous manifest chunk list
    CLI->>CLI: Compare new chunk list with remote manifest hashes
    alt Chunk Lists are Identical
        CLI-->>Developer: Halt! NO_CHANGES_FOUND. No files have been modified.
    end

    CLI->>Server: POST /developer/builds/:buildId/chunks/check { hashes: [hashA, hashB, hashD] }
    Server->>DB: Scan ContentChunk table for existing hashes
    Server-->>CLI: Return missing hashes: [hashD]

    loop For each missing chunk
        CLI->>Server: POST /developer/builds/:buildId/chunks/upload-url { hash: hashD }
        note over Server: Server checks platform. If Web, uses Public Bucket. Native uses Private.
        Server->>R2: Generate presigned PUT URL
        Server-->>CLI: Return uploadUrl
        CLI->>R2: HTTP PUT chunk payload binary
        CLI->>Server: POST /developer/builds/:buildId/chunks/complete { hash: hashD }
        Server->>DB: Upsert ContentChunk & register BuildChunk mapping
        Server-->>CLI: Chunk acknowledged
    end

    CLI->>Server: POST /developer/builds/:buildId/manifest { manifestJSON }
    Server->>R2: Write manifest to Private R2 Bucket
    Server->>DB: Update GameBuild status to READY
    
    note over Server: Garbage Collection Pipeline Triggered (Windows Only)
    Server->>DB: Query READY Windows builds sorted by createdAt desc
    alt Windows Build Count > 3
        Server->>DB: Identify builds beyond index 2 (Older builds)
        Server->>R2: Delete manifest and artifact ZIP files of old builds
        Server->>DB: Delete old GameBuild records (Cascade deletes BuildChunk mappings)
        Server->>DB: Query ContentChunk records where buildChunks count === 0 (Orphaned)
        Server->>R2: Delete orphaned chunk payloads from Private R2 Bucket
        Server->>DB: Delete orphaned ContentChunk records
    end
    
    Server-->>CLI: Publish Completed Successfully!
    CLI-->>Developer: CLI: Deploy complete. Version 1.4.0 is live!
```

---

### B. Desktop Launcher Play Session & Delta Patching Sequence
Tracks launcher sync, signed storage requests, download delta, decapsulation, and XOR decryption.

```mermaid
sequenceDiagram
    autonumber
    actor Player as Storefront Player
    participant Client as Electron Desktop Launcher
    participant Server as API Storefront
    participant DB as PostgreSQL
    participant R2 as Private Cloudflare R2
    participant OS as Host OS Process Runner

    Player->>Client: Click "Play Game"
    Client->>Server: GET /games/:id/ownership (Validate Entitlements)
    Server->>DB: Query User Entitlement mapping
    Server-->>Client: Return isOwned: true, latestBuildId
    
    Client->>Server: GET /games/:id/distribution-manifest
    Server->>R2: Retrieve latest READY build manifest
    Server-->>Client: Return manifest JSON (List of all Blake3 chunk hashes)
    
    Client->>Client: Scan local cache folder ~/.cache/lazplay/chunks/
    Client->>Client: Compare local hashes against remote manifest hashes
    note over Client: Find missing chunks: [hashX, hashY]

    loop For each missing chunk
        Client->>Server: POST /games/:id/chunks/download-urls { hashes: [hashX, hashY] }
        Server->>DB: Validate user game entitlement again
        Server->>R2: Generate presigned GET URL
        Server-->>Client: Return signed URLs with expiresAt
        Client->>R2: HTTP GET stream chunk binary
        Client->>Client: Decompress (Zstandard) & verify Blake3 hash
        Client->>Client: Save chunk to ~/.cache/lazplay/chunks/hash
    end

    Client->>Client: Reassemble compressed bundles from chunks
    Client->>Client: Unpack installation files into transient workspace folder
    Client->>Client: Load executable header (First 1024 bytes)
    Client->>Client: XOR Decrypt header bytes using key: 0x42
    Client->>OS: Spawn Decrypted Native Game Process
    note over Client: Electron Launcher blocks and tracks runtime process logs
    OS-->>Client: Native Game Process terminates (User quits game)
    Client->>Client: Instantly delete decrypted executables & transient workspace folder
    Client-->>Player: Return UI state to Library / Discovery
```

---

### C. Android Launcher Update & Secure Background Installation Sequence
Tracks background service progress delivery, cache retention, decryption, and manual sync.

```mermaid
sequenceDiagram
    autonumber
    actor MobilePlayer as Mobile Player
    participant Launcher as Kotlin Android Launcher
    participant Server as API Storefront
    participant CDN as Public Cloudflare R2 / CDN
    participant OS as Android System Package Installer

    MobilePlayer->>Launcher: Open App Library
    Launcher->>Server: GET /developer/games/:gameId (Check update status)
    Server-->>Launcher: Return build metadata: version, checksumSha256
    Launcher->>Launcher: Compute installed APK Blake3 hash & compare
    alt Hash Mismatch (Update Available)
        Launcher-->>MobilePlayer: UI displays "UPDATE" button
    else Matching Hash
        Launcher-->>MobilePlayer: UI displays "PLAY" button
    end

    MobilePlayer->>Launcher: Click "Update / Install"
    Launcher->>Launcher: Check if game_id.apk.lazplay_locked is present in /cache/downloads/
    alt Cache Miss (Download Required)
        Launcher->>Launcher: Start ForegroundService (download_channel)
        Launcher->>Server: GET /developer/builds/:buildId/download-url
        Server-->>Launcher: Return signed GET URL pointing to Public Bucket
        loop Download Stream Chunk
            Launcher->>CDN: Stream APK payload
            Launcher->>Launcher: Update Foreground Notification progress bar & status
            Launcher->>Launcher: Compute Blake3 checksum on the fly
        end
        Launcher->>Launcher: Obfuscate header (First 1024 bytes) using XOR 0x42
        Launcher->>Launcher: Save file as game_id.apk.lazplay_locked
        Launcher->>Launcher: Stop Foreground Service
    end

    Launcher->>Launcher: Copy game_id.apk.lazplay_locked to temp_install.apk
    Launcher->>Launcher: Decrypt header bytes of temp_install.apk using XOR 0x42
    Launcher->>OS: Start Package Installer Intent (ACTION_INSTALL_PACKAGE) with temp_install.apk URI
    OS-->>MobilePlayer: Android System Install Confirmation Dialog
    MobilePlayer->>OS: Tap "Install"
    OS-->>Launcher: ACTION_PACKAGE_ADDED / UPDATED broadcast received
    Launcher->>Launcher: Purge/Delete temp_install.apk from cache
    Launcher-->>MobilePlayer: UI shows "PLAY"

    note over Launcher: Game Uninstallation & Cache Retention Flow
    MobilePlayer->>Launcher: Click "Delete Game" on card
    Launcher->>OS: Start Package Manager Intent (ACTION_UNINSTALL_PACKAGE)
    OS-->>MobilePlayer: Android System Uninstall Dialog
    MobilePlayer->>OS: Tap "Uninstall"
    OS-->>Launcher: ACTION_PACKAGE_REMOVED broadcast received
    Launcher->>Launcher: Update local DB installedStatus to READY (Preserves apk.lazplay_locked cache file)
    Launcher-->>MobilePlayer: UI shows "Install" (No redownload needed!)
```

---

## 4. Entity-Relationship Diagram (ERD)

LazPlay's schema matches the PostgreSQL relational model managed via Prisma ORM.

```mermaid
erDiagram
    USER {
        string id PK
        string username UNIQUE
        string email UNIQUE
        string passwordHash
        string displayName
        string bio
        string avatarUrl
        string_array roles
        string status
        string banReason
        datetime banExpiresAt
        datetime createdAt
        datetime updatedAt
    }

    REFRESH_SESSION {
        string id PK
        string userId FK
        string refreshTokenId UNIQUE
        datetime expiresAt
        datetime revokedAt
        datetime createdAt
    }

    DEVELOPER_PROFILE {
        string id PK
        string userId FK "UNIQUE"
        string displayName
        string bio
        string website
        string supportEmail
        string verificationStatus
        string payoutStatus
        datetime createdAt
        datetime updatedAt
    }

    GAME {
        string id PK
        string developerId FK
        string slug UNIQUE
        string title
        string description
        string tagline
        int price
        string currency
        string priceType
        datetime pricingUpdatedAt
        string releaseDate
        string publisher
        string_array genres
        string_array tags
        string_array platforms
        string status
        boolean featured
        string coverUrl
        string coverObjectKey
        string heroImageUrl
        string heroBannerUrl
        string trailerUrl
        string trailerObjectKey
        string latestBuildId
        string version
        string licensingModel
        json hardwareSpecs
        json systemRequirements
        float rating
        int reviewCount
        datetime submittedAt
        datetime publishedAt
        string statusReason
        datetime createdAt
        datetime updatedAt
    }

    GAME_MEDIA {
        string id PK
        string gameId FK
        string type
        string url
        string alt
        int sortOrder
        datetime createdAt
    }

    GAME_BUILD {
        string id PK
        string gameId FK
        string version
        string platform
        string runtime
        string entrypoint
        string changelog
        string status
        string distributionType
        string artifactObjectKey
        string manifestObjectKey
        bigint sizeBytes
        string checksumSha256
        string scanStatus
        string scanMessage
        datetime uploadedAt
        datetime createdAt
    }

    CONTENT_CHUNK {
        string hash PK
        bigint sizeBytes
        string objectKey UNIQUE
        int refCount
        datetime createdAt
    }

    BUILD_CHUNK {
        string buildId PK, FK
        string hash PK, FK
    }

    BUILD_MANIFEST {
        string id PK
        string buildId FK "UNIQUE"
        string version
        json manifest
        int chunkCount
        bigint totalBytes
        datetime createdAt
        datetime updatedAt
    }

    DEPLOYMENT {
        string id PK
        string gameId FK
        string buildId FK
        string status
        string environment
        int progress
        string releaseNotes
        datetime completedAt
        datetime createdAt
    }

    DEPLOYMENT_LOG {
        string id PK
        string deploymentId FK
        string level
        string message
        datetime createdAt
    }

    GAME_REVIEW {
        string id PK
        string gameId FK
        string userId FK
        int rating
        string body
        datetime createdAt
        datetime updatedAt
    }

    GAME_PLAY_SESSION {
        string id PK
        string gameId FK
        string userId FK
        datetime startedAt
        datetime endedAt
        int durationSeconds
        datetime createdAt
    }

    LIBRARY_ITEM {
        string id PK
        string userId FK
        string gameId FK
        string ownershipType
        string installedStatus
        boolean favorite
        datetime lastPlayedAt
        int playtimeSeconds
        string installedBuildVersion
        boolean cloudSavesEnabled
        datetime createdAt
    }

    WISHLIST_ITEM {
        string id PK
        string userId FK
        string gameId FK
        datetime createdAt
    }

    ENTITLEMENT {
        string id PK
        string userId FK
        string gameId FK
        string source
        string status
        datetime grantedAt
    }

    ORDER {
        string id PK
        string userId FK
        string gameId FK
        string razorpayOrderId
        int amount
        string currency
        string status
        datetime createdAt
    }

    PAYMENT {
        string id PK
        string orderId FK
        string razorpayPaymentId
        int amount
        string currency
        string status
        datetime capturedAt
        datetime createdAt
    }

    STORAGE_OBJECT {
        string id PK
        string ownerId
        string objectKey UNIQUE
        string uploadId
        string purpose
        string fileName
        string contentType
        bigint sizeBytes
        string status
        string etag
        datetime completedAt
        datetime createdAt
    }

    USER ||--o{ REFRESH_SESSION : "owns"
    USER ||--o| DEVELOPER_PROFILE : "has"
    DEVELOPER_PROFILE ||--o{ GAME : "creates"
    GAME ||--o{ GAME_MEDIA : "has"
    GAME ||--o{ GAME_BUILD : "has"
    GAME ||--o{ DEPLOYMENT : "has"
    GAME_BUILD ||--o{ DEPLOYMENT : "referenced in"
    GAME_BUILD ||--o| BUILD_MANIFEST : "has"
    GAME_BUILD ||--o{ BUILD_CHUNK : "maps"
    CONTENT_CHUNK ||--o{ BUILD_CHUNK : "used in"
    DEPLOYMENT ||--o{ DEPLOYMENT_LOG : "has"
    GAME ||--o{ GAME_REVIEW : "receives"
    USER ||--o{ GAME_REVIEW : "writes"
    GAME ||--o{ GAME_PLAY_SESSION : "tracked in"
    USER ||--o{ GAME_PLAY_SESSION : "runs"
    USER ||--o{ LIBRARY_ITEM : "owns"
    GAME ||--o{ LIBRARY_ITEM : "added to"
    USER ||--o{ WISHLIST_ITEM : "wishes"
    GAME ||--o{ WISHLIST_ITEM : "listed in"
    USER ||--o{ ENTITLEMENT : "granted"
    GAME ||--o{ ENTITLEMENT : "unlocks"
    USER ||--o{ ORDER : "places"
    ORDER ||--o{ PAYMENT : "processed by"
```

---

## 5. Class / Module Architecture Diagram

This maps the code files, classes, repositories, and interfaces across the active workspaces.

```mermaid
graph TB
    %% Backend Modules
    subgraph backend/src/ Modules
        AppJS[app.js - Bootloader & Context Initializer]
        PrismaJS[prisma.js - PrismaClient Singleton]
        
        subgraph routes/
            R_Dev[developer.js - Developer Workspace API]
            R_Chunk[chunks.js - CAS Chunk Upload API]
            R_Game[games.js - Game Browser & Claim Engine]
            R_Auth[auth.js - Auth Token Session Manager]
        end
        
        subgraph services/
            S_Dist[distribution.js - Windows GC & Manifest Service]
            S_Scram[scrambling.js - XOR 0x42 Encrypter]
        end
    end

    %% Shared Packages
    subgraph packages/distribution/ Modules
        UpPipeline[uploader-pipeline.js - Compression & Chunking Pipeline]
        Hasher[chunk-hasher.js - Blake3 Chunk Checksum Generator]
        Compressor[zstd-compressor.js - Local Bundle Packaging]
    end

    %% Desktop Launcher Modules
    subgraph desktop-launcher/ Electron Modules
        MainTS[main.ts - Electron Application Bootstrap]
        ProcMgr[process-manager.ts - Executable Decrypter & OS Spawner]
        DownPipeline[download-pipeline.ts - Tauri Fetch Delta Engine]
    end

    %% Android Launcher Modules
    subgraph android-launcher/ Kotlin Modules
        MainActivity[MainActivity.kt - User Interface Coordinator]
        ApkRepo[ApkDownloadRepository.kt - Secure Downloader & XOR Scrambler]
        GameDB[GameDatabase.kt - SQLite Room Database Mapping]
        LazPlayApi[LazPlayApi.kt - Retrofit REST Endpoint Declarations]
        DownloadService[ApkDownloadService.kt - Foreground Notification Worker]
    end

    %% Class Dependencies
    AppJS --> PrismaJS
    R_Dev --> AppJS
    R_Chunk --> AppJS
    R_Game --> AppJS
    
    R_Dev --> S_Dist
    R_Chunk --> S_Dist
    R_Dev --> S_Scram

    UpPipeline --> Hasher
    UpPipeline --> Compressor

    ProcMgr --> DownPipeline
    DownPipeline -.->|Hits Chunks API| R_Chunk

    ApkRepo --> GameDB
    ApkRepo --> LazPlayApi
    ApkRepo --> DownloadService
    DownloadService -.->|Hits signed URLs| R_Dev
```

---

## 6. Architectural Guarantees & Operational Specifications

1. **Content-Addressed Deduplication**: Standardizing on **Blake3 uploader hashes** permits global deduplication. If two different games share a common engine asset block, R2 stores it exactly once.
2. **Deterministic version control**: The `SAME_VERSION` uploader checker guarantees developers cannot overwrite existing ready builds, preserving release integrity.
3. **Reference-Safe Garbage Collection**: The `cleanupOldWindowsBuildsAndChunks` service evaluates the exact dependency graph in the database using foreign relations. Chunks are never deleted if they remain required by any of the 3 active/retained builds.
4. **Sandboxed Transient execution**: Native desktop games are only decrypted (first 1024 bytes XOR `0x42`) inside a volatile transient folder. Immediately upon exit, the Launcher purges the decrypted directory, minimizing casual piracy.
5. **Decoupled Mobile Cache Policies**: Keeping `.apk.lazplay_locked` cached payload downloads separate from the Android System package status reduces player bandwidth consumption. Reinstallation of a game requires zero network operations unless an update hash check indicates a version mismatch.
