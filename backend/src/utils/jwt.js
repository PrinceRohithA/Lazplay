import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function createJwtToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export function verifyJwtToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
