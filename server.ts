/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/api";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing requests
  app.use(express.json());

  // Mount backend API routes FIRST
  app.use("/api", apiRouter);

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: Date.now() });
  });

  // Setup Vite development server or production static serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up Express in PRODUCTION mode serving static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // Fallback for Single Page App routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
    console.log(`Port 3000 is open. Ingress gateway ready.`);
  });
}

startServer().catch((err) => {
  console.error("Critical error starting Express + Vite server:", err);
});
