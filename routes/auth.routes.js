import express from "express";
import {
  signUp,
  logIn,
  signOut,
  getCurrentUser,
  refreshSession,
} from "../controllers/auth.controller.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", signUp);
router.post("/login", logIn);

// Protected routes
router.post("/logout", signOut);
router.get("/me", authenticateUser, getCurrentUser);
router.post("/refresh", authenticateUser, refreshSession);

export default router;
