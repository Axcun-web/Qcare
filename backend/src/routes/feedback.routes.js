import { Router } from "express";
import { feedbackController } from "../controllers/feedback.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { feedbackSchema } from "../validators/feedback.validator.js";

const router = Router();

// Endpoint for authenticated users to submit feedback
router.post(
  "/",
  authenticate,
  authorize("PASIEN", "PETUGAS", "SUPERADMIN"),
  validate(feedbackSchema),
  feedbackController.create,
);

export const feedbackRoutes = router;
