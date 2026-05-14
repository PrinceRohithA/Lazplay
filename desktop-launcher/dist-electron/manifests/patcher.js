"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patcher = exports.PatchManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class PatchManager {
    /**
     * Generates a manifest for a given directory.
     * This is typically run on the backend/developer machine to generate the initial manifest,
     * but the launcher can also use it to verify local files.
     */
    async generateManifest(dirPath) {
        const files = [];
        const walk = (dir) => {
            const list = fs_1.default.readdirSync(dir);
            for (const file of list) {
                const filePath = path_1.default.join(dir, file);
                const stat = fs_1.default.statSync(filePath);
                if (stat.isDirectory()) {
                    walk(filePath);
                }
                else {
                    const relativePath = path_1.default
                        .relative(dirPath, filePath)
                        .replace(/\\/g, "/");
                    const hash = this.hashFile(filePath);
                    files.push({
                        path: relativePath,
                        hash,
                        size: stat.size,
                    });
                }
            }
        };
        walk(dirPath);
        return {
            version: "1.0.0",
            files,
        };
    }
    /**
     * Verifies an installation against a target manifest.
     * Returns a list of files that are missing or mismatched and need to be downloaded.
     */
    async verifyInstallation(installPath, targetManifest) {
        const missingOrCorrupt = [];
        for (const file of targetManifest.files) {
            const filePath = path_1.default.join(installPath, file.path);
            if (!fs_1.default.existsSync(filePath)) {
                missingOrCorrupt.push(file);
                continue;
            }
            const stat = fs_1.default.statSync(filePath);
            if (stat.size !== file.size) {
                missingOrCorrupt.push(file);
                continue;
            }
            const hash = this.hashFile(filePath);
            if (hash !== file.hash) {
                missingOrCorrupt.push(file);
            }
        }
        return missingOrCorrupt;
    }
    hashFile(filePath) {
        const fileBuffer = fs_1.default.readFileSync(filePath);
        const hashSum = crypto_1.default.createHash("sha256");
        hashSum.update(fileBuffer);
        return hashSum.digest("hex");
    }
}
exports.PatchManager = PatchManager;
exports.patcher = new PatchManager();
