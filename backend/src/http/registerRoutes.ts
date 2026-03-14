import type { Express } from "express";

export function registerRoutes(app: Express): void {
  app.get("/", (_req, res) => {
    res.send("Council backend is running.");
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
}
