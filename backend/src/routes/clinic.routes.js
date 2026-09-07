import express from 'express';
import { getPublicClinics } from '../controllers/clinic.controller.js'; 

const router = express.Router();

router.get('/', getPublicClinics);

export default router;