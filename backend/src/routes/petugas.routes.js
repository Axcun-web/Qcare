import { Router } from "express";
import { petugasController } from "../controllers/petugas.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, authorize("PETUGAS"));

router.get("/clinic", petugasController.myClinic);
router.patch("/clinic", petugasController.updateClinic);
router.post("/doctors", petugasController.createDoctor);
router.patch("/doctors/:id", petugasController.updateDoctor);
router.delete("/doctors/:id", petugasController.deleteDoctor);

export const petugasRoutes = router;
