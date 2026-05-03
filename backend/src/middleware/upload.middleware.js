import multer from "multer";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../config/env.js";

const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, os.tmpdir());
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname || ".zip");
    const name = crypto.randomBytes(8).toString("hex");
    callback(null, `${name}${ext}`);
  }
});

function gameZipFilter(_req, file, callback) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ext !== ".zip") {
    callback(new Error("Only .zip game archives are supported."));
    return;
  }
  callback(null, true);
}

export const uploadGameArchive = multer({
  storage,
  limits: {
    fileSize: maxBytes
  },
  fileFilter: gameZipFilter
}).single("file");
