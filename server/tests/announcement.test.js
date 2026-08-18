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

test('listNotifications returns the personal notification feed for a user', async () => {
  const mockPrisma = {
    notification: {
      findMany: async (args) => {
        assert.equal(args.where.workspaceId, 'ws-1');
        assert.equal(args.where.userId, 'emp-1');
        return [
          {
            id: 'notif-1',
            workspaceId: 'ws-1',
            userId: 'emp-1',
            type: 'ANNOUNCEMENT',
            title: 'All Hands Meeting',
            body: 'Join at 4 PM.',
            link: '/app/announcements',
            entityId: 'ann-1',
            isRead: true,
            readAt: new Date('2026-08-03T10:05:00Z'),
            createdAt: new Date('2026-08-03T10:00:00Z'),
          },
        ];
      },
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const notifications = await notificationService.listNotifications('ws-1', 'emp-1');

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, 'All Hands Meeting');
  assert.equal(notifications[0].isRead, true);
});

test('createAnnouncement notification pipeline creates a personal notification per targeted user', async () => {
  const createdNotifications = [];
  const mockPrisma = {
    announcement: {
      create: async (args) => ({
        id: 'ann-3',
        ...args.data,
        createdBy: { id: 'admin-1', name: 'Admin' },
        selectedUsers: [],
        _count: { readRecords: 0 },
      }),
    },
    user: {
      findMany: async () => [{ id: 'admin-1' }, { id: 'emp-1' }, { id: 'emp-2' }],
    },
    notification: {
      create: async (args) => {
        const notification = { id: `notif-${createdNotifications.length + 1}`, ...args.data };
        createdNotifications.push(notification);
        return notification;
      },
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  await announcementService.createAnnouncement('ws-1', 'admin-1', {
    title: 'Office closed Friday',
    description: 'Enjoy the long weekend.',
    targetType: 'ALL',
    status: 'PUBLISHED',
  });

  // The creator (admin-1) should not notify themselves about their own post.
  assert.equal(createdNotifications.length, 2);
  assert.deepEqual(createdNotifications.map((n) => n.userId).sort(), ['emp-1', 'emp-2']);
  assert.equal(createdNotifications[0].type, 'ANNOUNCEMENT');
  assert.equal(createdNotifications[0].title, 'Office closed Friday');
});

test('getAnnouncements applies target scope filtering for non-admin users', async () => {
  let capturedWhere = null;
  const mockPrisma = {
    announcement: {
      findMany: async (args) => {
        capturedWhere = args.where;
        return [];
      },
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  await announcementService.getAnnouncements('ws-1', {}, { id: 'emp-1', role: 'EMPLOYEE' });

  assert.equal(capturedWhere.workspaceId, 'ws-1');
  assert.ok(capturedWhere.OR);
  assert.deepEqual(capturedWhere.OR, [
    { targetType: 'ALL' },
    { createdById: 'emp-1' },
    { selectedUsers: { some: { userId: 'emp-1' } } },
  ]);
});
