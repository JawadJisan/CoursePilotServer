// routes/progress.route.js
import express from "express";
import {
  getAllProgress,
  getCourseProgress,
  updateProgress,
} from "../controllers/progress.controller.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.get("/courses", authenticateUser, getAllProgress);
router.get("/courses/:courseId", authenticateUser, getCourseProgress);
router.post(
  "/courses/:courseId/lessons/:lessonId/resources/:resourceId",
  authenticateUser,
  updateProgress
);

export default router;
