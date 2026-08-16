import { asyncHandler } from "../middleware/asyncHandler.js";
import { queueService } from "../services/queue.service.js";
export const queueController = {
  doctors: asyncHandler(async (_req, res) => res.json({ success: true, data: await queueService.listDoctors() })),
  create: asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await queueService.create(req.user.id, req.body) })),
  mine: asyncHandler(async (req, res) => res.json({ success: true, data: await queueService.mine(req.user.id) })),
  staff: asyncHandler(async (req, res) => res.json({ success: true, data: await queueService.staffQueue(req.user, req.query.date) })),
  status: asyncHandler(async (req, res) => res.json({ success: true, data: await queueService.changeStatus(req.user, req.params.id, req.body.status) })),
};
