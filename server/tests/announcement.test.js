const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const announcementService = require('../src/modules/announcement/announcement.service');
const notificationService = require('../src/modules/notification/notification.service');
const { createAnnouncementHandler } = require('../src/modules/announcement/announcement.controller');

test('createAnnouncement handles All Employees target correctly', async () => {
  const mockPrisma = {
    announcement: {
      create: async (args) => ({
        id: 'ann-1',
        ...args.data,
        createdBy: { id: 'admin-1', name: 'Admin', email: 'admin@aikart.com' },
        selectedUsers: [],
        _count: { readRecords: 0 },
      }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const res = await announcementService.createAnnouncement('ws-1', 'admin-1', {
    title: 'Company Holiday Notice',
    description: 'Office remains closed on Friday.',
    priority: 'HIGH',
    targetType: 'ALL',
    status: 'PUBLISHED',
  });

  assert.equal(res.id, 'ann-1');
  assert.equal(res.title, 'Company Holiday Notice');
  assert.equal(res.targetType, 'ALL');
  assert.equal(res.priority, 'HIGH');
});

test('createAnnouncementHandler returns 201 with created announcement', async () => {
  const mockPrisma = {
    announcement: {
      create: async (args) => ({
        id: 'ann-2',
        ...args.data,
        createdBy: { id: 'admin-1', name: 'Admin' },
        selectedUsers: [],
        _count: { readRecords: 0 },
      }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const req = {
    user: { id: 'admin-1', workspaceId: 'ws-1', role: 'ADMIN' },
    body: {
      title: 'Policy Update',
      description: 'New remote work policy.',
      priority: 'MEDIUM',
      targetType: 'ALL',
      status: 'PUBLISHED',
    },
  };

  const res = {
    statusCode: 0,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  await createAnnouncementHandler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.status, 'success');
  assert.equal(res.payload.data.title, 'Policy Update');
});

test('getUserNotifications returns mapped notifications with isRead state', async () => {
  const mockPrisma = {
    announcement: {
      findMany: async () => [
        {
          id: 'ann-1',
          title: 'All Hands Meeting',
          description: 'Join at 4 PM.',
          priority: 'URGENT',
          targetType: 'ALL',
          createdAt: new Date('2026-08-03T10:00:00Z'),
          publishDate: new Date('2026-08-03T10:00:00Z'),
          createdBy: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
          readRecords: [{ isRead: true, readAt: new Date('2026-08-03T10:05:00Z') }],
        },
      ],
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const notifications = await notificationService.getUserNotifications('ws-1', 'emp-1');

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, 'All Hands Meeting');
  assert.equal(notifications[0].isRead, true);
});
