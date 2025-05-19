import express from "express";
import {
  getAllCourses,
  getMyCourses,
  getCourseById,
} from "../controllers/course.controller.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.get("/all-courses", getAllCourses);
router.get("/my-courses", authenticateUser, getMyCourses);
router.get("/:courseId", getCourseById);

export default router;
