import crypto from "crypto";
import fs from "fs";
import path from "path";
import log from "electron-log";

export interface FileManifest {
  path: string;
  hash: string;
  size: number;
}

export interface GameManifest {
  version: string;
  files: FileManifest[];
}

export class PatchManager {
  /**
   * Generates a manifest for a given directory.
   * This is typically run on the backend/developer machine to generate the initial manifest,
   * but the launcher can also use it to verify local files.
   */
  async generateManifest(dirPath: string): Promise<GameManifest> {
    const files: FileManifest[] = [];
    const walk = (dir: string) => {
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walk(filePath);
        } else {
          const relativePath = path
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
  async verifyInstallation(
    installPath: string,
    targetManifest: GameManifest,
  ): Promise<FileManifest[]> {
    const missingOrCorrupt: FileManifest[] = [];

    for (const file of targetManifest.files) {
      const filePath = path.join(installPath, file.path);

      if (!fs.existsSync(filePath)) {
        missingOrCorrupt.push(file);
        continue;
      }

      const stat = fs.statSync(filePath);
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

  private hashFile(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  }
}

export const patcher = new PatchManager();
