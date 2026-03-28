import { Express } from "express";
import app from "../../app";

export function createTestApp(): Express {
  return app;
}
