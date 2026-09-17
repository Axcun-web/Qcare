import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, notificationController.list);
router.patch("/read-all", authenticate, notificationController.markAllRead);
router.patch("/:id/read", authenticate, notificationController.markRead);

export const notificationRoutes = router;
