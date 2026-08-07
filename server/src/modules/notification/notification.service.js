const prismaModule = require('../../config/prisma');

const getPrisma = () => prismaModule.getPrisma();

const getUserNotifications = async (workspaceId, userId) => {
  const prisma = getPrisma();

  const announcements = await prisma.announcement.findMany({
    where: {
      workspaceId,
      status: 'PUBLISHED',
      publishDate: { lte: new Date() },
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
      readRecords: {
        where: { userId },
        select: { isRead: true, readAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return announcements.map((item) => {
    const readRecord = item.readRecords && item.readRecords.length > 0 ? item.readRecords[0] : null;
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      priority: item.priority,
      targetType: item.targetType,
      createdAt: item.createdAt,
      publishDate: item.publishDate,
      createdBy: item.createdBy,
      isRead: !!(readRecord && readRecord.isRead),
      readAt: readRecord ? readRecord.readAt : null,
    };
  });
};

const markNotificationAsRead = async (workspaceId, userId, announcementId) => {
  const prisma = getPrisma();

  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      workspaceId,
      status: 'PUBLISHED',
    },
  });

  if (!announcement) {
    throw new Error('Announcement not found or access denied');
  }

  const readRecord = await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId,
      },
    },
    update: {
      isRead: true,
      readAt: new Date(),
    },
    create: {
      announcementId,
      userId,
      isRead: true,
      readAt: new Date(),
    },
  });

  return readRecord;
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
};
