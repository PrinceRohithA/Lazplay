# Lazplay Catalyst IaC

This directory is the isolated Catalyst migration workspace for Lazplay.

It keeps Catalyst responsible for:

- React web client hosting.
- Lightweight AppSail REST APIs.
- Authentication and ownership orchestration.
- Catalyst Data Store metadata.
- Catalyst Cache for hot metadata, manifests, signed URL sessions, launcher state, and rate limits.

It keeps Cloudflare R2 responsible for:

- Game chunks, web builds, native binaries, manifests, screenshots, trailers, and CDN-served assets.

The backend must not stream, unzip, rebundle, or process large game files. It only signs short-lived R2 URLs after validation.

## Layout

```txt
lazplay-catalyst/
  backend/              AppSail Node 20 API
  client/dist/          Catalyst Web Client deploy output
  frontend/             Copied React source for Catalyst builds
  functions/            Catalyst function configs
  configs/              Environment, route, and R2 policy templates
  docs/                 Operator docs
  iac/                  Data Store, cache, migration, seed, and fallback manifests
  scripts/              Build, serve, deploy, validate helpers
  catalyst.json
  catalyst-user-rules.json
```

## Quick Commands

```powershell
cd C:\Rohith\Projects\LazPlay\lazplay-catalyst
.\scripts\validate.ps1
.\scripts\build.ps1
.\scripts\serve.ps1
.\scripts\deploy.ps1
```

If Windows blocks local script execution, invoke a script with:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

Install the Catalyst CLI first if needed:

```powershell
npm install -g zcatalyst-cli
catalyst login
```

Detailed setup and deployment notes are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
