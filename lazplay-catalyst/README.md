# 🌌 LazPlay on Zoho Catalyst (Infrastructure as Code)

This folder contains the complete, deploy-ready **Zoho Catalyst** migration package for the **LazPlay** backend and storefront. This configuration is built to deploy the React storefront on **Catalyst Web Hosting**, the Node.js backend on **AppSail**, route traffic through the **API Gateway**, and connect directly to **Cloudflare R2** for game chunks and assets.

---

## 🗂️ Project Structure

*   **`catalyst.json`**: The master IaC manifest mapping the static client and AppSail service folder structures.
*   **`catalyst-user-rules.json`**: API Gateway proxy routes routing incoming `/api/v1/*` and `/api/*` traffic automatically to the AppSail runtime.
*   **`backend/app-config.json`**: AppSail container settings detailing node version, start commands, and environment slots for R2 and Razorpay.
*   **`client/client-package.json`**: Static client hosting package metadata.
*   **`client/dist/`**: Pre-built static storefront files.
*   **`packages/`**: Local shared workspace dependency libraries.

---

## 🚀 Step-by-Step Deployment (Zero Manual Workload)

### 1. Install & Authenticate Zoho Catalyst CLI
Ensure you have the Catalyst CLI installed on your machine:
```bash
npm install -g zcatalyst-cli
catalyst login
```

### 2. Connect Your Project
Initialize this folder inside your Zoho Catalyst account workspace:
```bash
catalyst init
```
*   Select your existing **Catalyst Project**.
*   When prompted to associate directories, link them to the local `backend/` and `client/dist/` folders (the CLI will automatically read the pre-configured `catalyst.json` settings).

### 3. Deploy the Infrastructure
Deploy the storefront and backend simultaneously with one command:
```bash
catalyst deploy
```
This single command:
1.  Uploads and distributes the compiled React storefront to the **Catalyst Web Hosting CDN**.
2.  Compresses, deploys, and boots up the Node.js server inside **AppSail**.
3.  Registers and provisions the proxy rules in the **API Gateway** to route all traffic to the active AppSail server.

---

## 🗄️ Database Datastore Configuration (IaC Migration)

Because Zoho Catalyst utilizes its own serverless **Datastore** engine, schema migrations are decoupled from Prisma.

### Replicating Tables via IaC:
1.  Open the **Zoho Catalyst Console** for your project.
2.  Navigate to **Datastore** and create the core tables:
    *   `User` (fields: `username`, `email`, `passwordHash`, `displayName`, `roles`, `status`)
    *   `DeveloperProfile` (fields: `userId`, `displayName`, `verificationStatus`)
    *   `Game` (fields: `developerId`, `slug`, `title`, `price`, `status`, `genres`, `tags`)
    *   `GameBuild` (fields: `gameId`, `version`, `status`, `artifactObjectKey`, `manifestObjectKey`)
    *   `ContentChunk` (fields: `hash`, `sizeBytes`, `objectKey`)
    *   `BuildChunk` (fields: `buildId`, `hash`)
    *   `BuildManifest` (fields: `buildId`, `version`, `manifest`, `totalBytes`)
3.  Once created in your development console, you can export the database configuration under **General Settings > Infrastructure as Code (IaC)**.
4.  This creates a `project-template.json` metadata ZIP that you can commit to git, allowing you to replicate the database tables in staging/production environments automatically using `catalyst deploy`!

---

## 🔑 Cloudflare R2 Connection
All environment variables are declared in [app-config.json](file:///c:/Rohith/Projects/LazPlay/lazplay-catalyst/backend/app-config.json). When deploying to AppSail, simply update these placeholders in your configuration or override them in the **AppSail Console UI**:
*   `CLOUDFLARE_R2_ACCESS_KEY_ID`
*   `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
*   `CLOUDFLARE_R2_ENDPOINT`
*   `CLOUDFLARE_R2_BUCKET_NAME`
