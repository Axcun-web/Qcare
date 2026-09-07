import { prisma } from '../config/prisma.js'; 

export const getPublicClinics = async (req, res, next) => {
  try {
    const clinics = await prisma.clinic.findMany({
      include: {
        doctors: true
      }
    });
    
    res.status(200).json({ data: clinics });
  } catch (error) {
    next(error);
  }
};