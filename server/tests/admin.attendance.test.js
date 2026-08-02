const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const {
  listWorkspaceAttendance,
  getAttendanceStats,
} = require('../src/modules/admin/admin.service');

test('listWorkspaceAttendance returns workspace attendance records', async () => {
  const mockPrisma = {
    attendance: {
      findMany: async (args) => {
        assert.equal(args.where.user.workspaceId, 'ws1');
        return [
          {
            id: 'a1',
            date: '2026-08-01T00:00:00.000Z',
            status: 'WORKING',
            totalSeconds: 3600,
            checkIn: '2026-08-01T08:00:00.000Z',
            user: {
              id: 'u1',
              name: 'Jane Doe',
              email: 'jane@aikart.com',
            },
          },
        ];
      },
      count: async () => 1,
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const result = await listWorkspaceAttendance('ws1', {
    from: '2026-08-01',
    to: '2026-08-31',
    page: '1',
    limit: '10',
  });

  assert.equal(result.attendance.length, 1);
  assert.equal(result.attendance[0].user.name, 'Jane Doe');
  assert.equal(result.pagination.total, 1);
});

test('getAttendanceStats summarizes workspace attendance', async () => {
  const mockPrisma = {
    attendance: {
      findMany: async () => [
        { status: 'WORKING', totalSeconds: 3600 },
        { status: 'PAUSED', totalSeconds: 1800 },
        { status: 'CHECKED_OUT', totalSeconds: 2400 },
      ],
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const stats = await getAttendanceStats('ws1', {
    from: '2026-08-01',
    to: '2026-08-31',
  });

  assert.equal(stats.totalRecords, 3);
  assert.equal(stats.workingCount, 1);
  assert.equal(stats.pausedCount, 1);
  assert.equal(stats.checkedOutCount, 1);
  assert.equal(stats.totalSeconds, 7800);
});
