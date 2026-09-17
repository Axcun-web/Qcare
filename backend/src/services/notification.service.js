import { prisma } from "../config/prisma.js";

export const notificationService = {
  async notify(userId, pesan, antreanId = null) {
    return prisma.notification.create({
      data: { userId: BigInt(userId), pesan, antreanId },
    });
  },
  async list(userId) {
    return prisma.notification.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { waktuKirim: "desc" },
      take: 50,
    });
  },
  async unreadCount(userId) {
    return prisma.notification.count({
      where: { userId: BigInt(userId), sudahDibaca: false },
    });
  },
  async markRead(userId, id) {
    const { count } = await prisma.notification.updateMany({
      where: { id: BigInt(id), userId: BigInt(userId) },
      data: { sudahDibaca: true },
    });
    return count > 0;
  },
  async markAllRead(userId) {
    await prisma.notification.updateMany({
      where: { userId: BigInt(userId), sudahDibaca: false },
      data: { sudahDibaca: true },
    });
  },
};
