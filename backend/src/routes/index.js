import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { queueRoutes } from "./queue.routes.js";
import { adminRoutes } from "./admin.routes.js";
import clinicRoutes from "./clinic.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/queues", queueRoutes);
router.use("/admin", adminRoutes);
router.use('/clinics', clinicRoutes);

export const apiRoutes = router;
