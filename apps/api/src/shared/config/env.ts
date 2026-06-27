import { config } from "dotenv"

config()

export const env = {
  PORT: Number(process.env.PORT ?? 3001),
  MONGODB_URI: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/durakjs",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const
