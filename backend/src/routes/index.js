import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { queueRoutes } from "./queue.routes.js";
import { adminRoutes } from "./admin.routes.js";
import clinicRoutes from "./clinic.routes.js";
import { petugasRoutes } from "./petugas.routes.js";
import { feedbackRoutes } from "./feedback.routes.js";
import { notificationRoutes } from "./notification.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/queues", queueRoutes);
router.use("/admin", adminRoutes);
router.use("/clinics", clinicRoutes);
router.use("/petugas", petugasRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/notifications", notificationRoutes);

export const apiRoutes = router;
