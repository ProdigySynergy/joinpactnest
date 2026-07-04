import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../../.env") });

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.API_PORT || "4000", 10),
  host: process.env.API_HOST || "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
  uploadDir: resolve(process.env.UPLOAD_DIR || resolve(__dirname, "../../../uploads")),
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || "5", 10),
  apiPublicUrl: process.env.API_PUBLIC_URL || "http://localhost:4000",
};
