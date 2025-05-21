import express from "express";
import authRoutes from "./auth.routes.js";
import ResourceRoutes from "./resource.routes.js";
import CourseRoutes from "./course.routes.js";
import ProgressRoutes from "./progress.route.js";
import InterviewRoutes from "./interview.route.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/resources", ResourceRoutes);
router.use("/course", CourseRoutes);
router.use("/progress", ProgressRoutes);
router.use("/interview", InterviewRoutes);

export default router;
