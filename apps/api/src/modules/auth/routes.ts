import { Router } from "express";
import { loginHandler, meHandler } from "./controller";
import { requireAuth } from "../../middleware/auth";

export const authRoutes = Router();

authRoutes.post("/login", loginHandler);
authRoutes.get("/me", requireAuth, meHandler);
