import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  updateNameSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.profile);
router.patch(
  "/me",
  authenticate,
  validate(updateNameSchema),
  authController.updateName,
);
router.patch(
  "/me/password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export const authRoutes = router;
