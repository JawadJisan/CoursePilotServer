// routes/feedback.route.js
import express from "express";
import {
  generateInterviewFeedback,
  getFeedback,
  getUserFeedback,
} from "../controllers/feedback.controller.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate", authenticateUser, generateInterviewFeedback);
router.get("/:id", authenticateUser, getFeedback);
router.get("/user/all", authenticateUser, getUserFeedback);

export default router;
