import express from "express";
import authRoutes from "./auth.routes.js";
import ResourceRoutes from "./resource.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/resources", ResourceRoutes);

export default router;
