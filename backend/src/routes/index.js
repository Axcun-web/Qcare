import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { queueRoutes } from "./queue.routes.js";
import { adminRoutes } from "./admin.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/queues", queueRoutes);
router.use("/admin", adminRoutes);

export const apiRoutes = router;
