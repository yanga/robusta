import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve .env from monorepo root (3 levels up from src/index.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../../.env");

// Graceful dotenv: only load if .env exists (Render injects env vars directly)
if (fs.existsSync(envPath)) {
  console.log("[Brewlytics] Loading .env from:", envPath);
  const envResult = dotenv.config({ path: envPath });
  console.log("[Brewlytics] dotenv loaded:", envResult.error ? `ERROR: ${envResult.error.message}` : "OK");
} else {
  console.log("[Brewlytics] No .env file found, using environment variables directly");
}
console.log("[Brewlytics] API key present:", !!process.env.ANTHROPIC_API_KEY);

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import uploadRouter from "./routes/upload.js";
import { setupSocketHandlers } from "./socket/handler.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: isProduction
    ? undefined // same-origin in production, no CORS needed
    : {
        origin: ["http://localhost:5173", "http://localhost:3000"],
        methods: ["GET", "POST"],
      },
});

// Make io accessible in routes
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", uploadRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Socket.IO
setupSocketHandlers(io);

// In production, serve the frontend static build
if (isProduction) {
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  // Catch-all: serve index.html for client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

httpServer.listen(PORT, () => {
  console.log(`[Brewlytics] Server running on http://localhost:${PORT}`);
  if (isProduction) {
    console.log("[Brewlytics] Serving frontend from static build");
  }
});
