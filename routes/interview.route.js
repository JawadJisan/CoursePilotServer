// routes/interview.route.js
import express from "express";
import { generateCourseInterview } from "../controllers/interview.controller.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate", generateCourseInterview);

export default router;
