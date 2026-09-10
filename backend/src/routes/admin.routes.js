import { Router } from "express";
import { adminController } from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
const router = Router();
router.use(authenticate);

// Allow Petugas to manage schedules
router.post("/doctors/:id/jadwal", authorize("SUPERADMIN", "PETUGAS"), adminController.createJadwal);
router.patch("/jadwal/:id", authorize("SUPERADMIN", "PETUGAS"), adminController.updateJadwal);
router.delete("/jadwal/:id", authorize("SUPERADMIN", "PETUGAS"), adminController.deleteJadwal);

// Restrict all other admin routes to SUPERADMIN only
router.use(authorize("SUPERADMIN"));
router.get("/overview", adminController.overview);
router.get("/clinics", adminController.clinics);
router.post("/clinics", adminController.createClinic);
router.get("/clinics/:id", adminController.clinic);
router.patch("/clinics/:id", adminController.updateClinic);
router.delete("/clinics/:id", adminController.deleteClinic);
router.post("/clinics/:id/doctors", adminController.createDoctor);
router.post("/clinics/:id/staff", adminController.createStaff);
router.get("/users", adminController.users);
router.patch("/users/:id", adminController.updateUser);
router.get("/feedback", adminController.feedback);
router.get("/doctors", adminController.doctors);
router.patch("/doctors/:id", adminController.updateDoctor);
router.delete("/doctors/:id", adminController.deleteDoctor);
router.delete("/users/:id", adminController.deleteUser);
export const adminRoutes = router;
