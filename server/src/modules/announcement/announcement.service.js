const prismaModule = require('../../config/prisma');
const notificationService = require('../notification/notification.service');

const getPrisma = () => prismaModule.getPrisma();

/**
 * notifyAnnouncementTargets
 * Fires a personal Notification (and live socket push) for everyone an
 * announcement reaches, so it shows up in their notification bell — not
 * just on the Announcements page they'd have to go browse. Best-effort:
 * a notification failure shouldn't fail the announcement create/update.
 */
const notifyAnnouncementTargets = async (workspaceId, announcement) => {
  if (announcement.status !== 'PUBLISHED') return;

  try {
    const prisma = getPrisma();
    let targetUserIds;

    if (announcement.targetType === 'SELECTED_USERS') {
      targetUserIds = (announcement.selectedUsers || []).map((su) => su.userId ?? su.user?.id);
    } else {
      const allUsers = await prisma.user.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true },
      });
      targetUserIds = allUsers.map((u) => u.id);
    }

    targetUserIds = targetUserIds.filter((id) => id && id !== announcement.createdById);

    await notificationService.createNotificationsForUsers(workspaceId, targetUserIds, {
      type: 'ANNOUNCEMENT',
      title: announcement.title,
      body: announcement.description?.slice(0, 140) || null,
      link: '/app/announcements',
      entityId: announcement.id,
    });
  } catch (err) {
    console.error('Failed to notify announcement targets:', err.message);
  }
};

const normalizePriority = (val) => {
  if (!val) return 'MEDIUM';
  const upper = String(val).toUpperCase();
  return ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(upper) ? upper : 'MEDIUM';
};

const normalizeTargetType = (val) => {
  if (!val) return 'ALL';
  const upper = String(val).toUpperCase();
  return ['ALL', 'SELECTED_USERS'].includes(upper) ? upper : 'ALL';
};

const normalizeStatus = (val) => {
  if (!val) return 'PUBLISHED';
  const upper = String(val).toUpperCase();
  return ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(upper) ? upper : 'PUBLISHED';
};

const createAnnouncement = async (workspaceId, createdById, payload, userRole = 'ADMIN') => {
  const prisma = getPrisma();

  const priority = normalizePriority(payload.priority);
  let targetType = normalizeTargetType(payload.targetType);
  const status = normalizeStatus(payload.status);

  if (userRole === 'MANAGER' || userRole === 'EMPLOYEE') {
    targetType = 'SELECTED_USERS';
  }

  const announcementData = {
    title: payload.title,
    description: payload.description || '',
    priority,
    targetType,
    status,
    workspaceId,
    createdById,
    publishDate: payload.publishDate ? new Date(payload.publishDate) : new Date(),
    expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
  };

  const selectedUserIds = Array.isArray(payload.selectedUserIds) ? payload.selectedUserIds : [];

  if (targetType === 'SELECTED_USERS' && selectedUserIds.length > 0) {
    announcementData.selectedUsers = {
      create: selectedUserIds.map((userId) => ({ userId })),
    };
  }

  const announcement = await prisma.announcement.create({
    data: announcementData,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      selectedUsers: {
        include: {
          user: {
            select: { id: true, name: true, email: true, employeeId: true, position: true },
          },
        },
      },
      _count: {
        select: { readRecords: true },
      },
    },
  });

  await notifyAnnouncementTargets(workspaceId, announcement);

  return announcement;
};

const getAnnouncements = async (workspaceId, filters = {}) => {
  const prisma = getPrisma();

  const where = { workspaceId };

  if (filters.status) {
    where.status = normalizeStatus(filters.status);
  }

  if (filters.priority) {
    where.priority = normalizePriority(filters.priority);
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const announcements = await prisma.announcement.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      selectedUsers: {
        include: {
          user: {
            select: { id: true, name: true, email: true, employeeId: true, position: true },
          },
        },
      },
      _count: {
        select: { readRecords: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return announcements;
};

const getAnnouncementById = async (workspaceId, announcementId) => {
  const prisma = getPrisma();

  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, workspaceId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
      selectedUsers: {
        include: {
          user: {
            select: { id: true, name: true, email: true, employeeId: true, position: true },
          },
        },
      },
      readRecords: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { readRecords: true },
      },
    },
  });

  return announcement;
};

const updateAnnouncement = async (workspaceId, announcementId, payload) => {
  const prisma = getPrisma();

  const existing = await prisma.announcement.findFirst({
    where: { id: announcementId, workspaceId },
  });

  if (!existing) {
    throw new Error('Announcement not found');
  }

  const updateData = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.priority !== undefined) updateData.priority = normalizePriority(payload.priority);
  if (payload.targetType !== undefined) updateData.targetType = normalizeTargetType(payload.targetType);
  if (payload.status !== undefined) updateData.status = normalizeStatus(payload.status);
  if (payload.expiryDate !== undefined) {
    updateData.expiryDate = payload.expiryDate ? new Date(payload.expiryDate) : null;
  }

  const targetType = updateData.targetType || existing.targetType;
  if (targetType === 'SELECTED_USERS' && Array.isArray(payload.selectedUserIds)) {
    await prisma.announcementTargetUser.deleteMany({
      where: { announcementId },
    });

    updateData.selectedUsers = {
      create: payload.selectedUserIds.map((userId) => ({ userId })),
    };
  } else if (targetType === 'ALL') {
    await prisma.announcementTargetUser.deleteMany({
      where: { announcementId },
    });
  }

  const updated = await prisma.announcement.update({
    where: { id: announcementId },
    data: updateData,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      selectedUsers: {
        include: {
          user: {
            select: { id: true, name: true, email: true, employeeId: true, position: true },
          },
        },
      },
      _count: {
        select: { readRecords: true },
      },
    },
  });

  // Only notify on the DRAFT -> PUBLISHED transition, not on every edit of
  // an already-published announcement.
  if (existing.status !== 'PUBLISHED' && updated.status === 'PUBLISHED') {
    await notifyAnnouncementTargets(workspaceId, updated);
  }

  return updated;
};

const deleteAnnouncement = async (workspaceId, announcementId) => {
  const prisma = getPrisma();

  const existing = await prisma.announcement.findFirst({
    where: { id: announcementId, workspaceId },
  });

  if (!existing) {
    throw new Error('Announcement not found');
  }

  await prisma.announcement.delete({
    where: { id: announcementId },
  });

  return true;
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
};
