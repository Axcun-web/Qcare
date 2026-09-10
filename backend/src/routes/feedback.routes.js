import { Router } from "express";
import { feedbackController } from "../controllers/feedback.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Endpoint for authenticated users to submit feedback
router.post("/", authenticate, authorize("PASIEN", "PETUGAS", "SUPERADMIN"), feedbackController.create);

export const feedbackRoutes = router;
