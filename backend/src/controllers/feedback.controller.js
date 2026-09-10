import { asyncHandler } from "../middleware/asyncHandler.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const feedbackController = {
  create: asyncHandler(async (req, res) => {
    const { isi, rating } = req.body;
    const userId = req.user.id; // from authenticate middleware

    if (!isi) {
      return res.status(400).json({ success: false, message: "Isi feedback diperlukan" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        isi,
        rating: rating || null,
        userId: BigInt(userId),
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedFeedback = {
      ...feedback,
      id: feedback.id.toString(),
      userId: feedback.userId.toString(),
      antreanId: feedback.antreanId ? feedback.antreanId.toString() : null,
    };

    res.status(201).json({ success: true, data: serializedFeedback });
  }),
};
