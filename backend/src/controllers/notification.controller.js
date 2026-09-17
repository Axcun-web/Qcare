import { asyncHandler } from "../middleware/asyncHandler.js";
import { notificationService } from "../services/notification.service.js";

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      notificationService.list(req.user.id),
      notificationService.unreadCount(req.user.id),
    ]);
    res.json({ success: true, data: { items, unread } });
  }),
  markRead: asyncHandler(async (req, res) => {
    const ok = await notificationService.markRead(req.user.id, req.params.id);
    res.json({ success: ok });
  }),
  markAllRead: asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user.id);
    res.json({ success: true });
  }),
};
