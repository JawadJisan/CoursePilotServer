// routes/interview.route.js
import express from "express";
import {
  generateCourseInterview,
  getInterviewStatus,
  getUserInterviews,
} from "../controllers/interview.controller.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate", authenticateUser, generateCourseInterview);
router.get("/status/:courseId", authenticateUser, getInterviewStatus);
router.get("/user", authenticateUser, getUserInterviews);

export default router;
