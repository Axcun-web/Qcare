import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../config/prisma.js";

export const feedbackController = {
  /** Body already validated by feedbackSchema (validators/feedback.validator.js). */
  create: asyncHandler(async (req, res) => {
    const { isi, rating } = req.body;
    const feedback = await prisma.feedback.create({
      data: { isi, rating: rating ?? null, userId: BigInt(req.user.id) },
    });
    res.status(201).json({ success: true, data: feedback });
  }),
};
