import express from "express";
import {
  generateCourse,
  getResourcesBySearch,
  getCoursesByUser,
} from "../controllers/resource.controller.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.get("/search", getResourcesBySearch);
router.post("/generate", generateCourse);
router.get("/courses", getCoursesByUser);
router.get("/test", authenticateUser, (req, res) => {
  res.json({ message: "Test route is working" });
});

export default router;
