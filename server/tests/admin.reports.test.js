const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const { getAdminReport } = require('../src/modules/admin/admin.service');

test('getAdminReport returns workspace summary metrics', async () => {
  const mockPrisma = {
    user: {
      count: async ({ where }) => {
        if (where.role === 'ADMIN') return 1;
        if (where.role === 'MANAGER') return 2;
        if (where.role === 'EMPLOYEE') return 5;
        return 8;
      },
    },
    department: {
      count: async () => 3,
    },
    attendance: {
      findMany: async () => [
        { status: 'WORKING', totalSeconds: 3600 },
        { status: 'PAUSED', totalSeconds: 1800 },
        { status: 'CHECKED_OUT', totalSeconds: 2400 },
      ],
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const report = await getAdminReport('ws1', {
    from: '2026-08-01',
    to: '2026-08-31',
  });

  assert.equal(report.summary.totalUsers, 8);
  assert.equal(report.summary.adminCount, 1);
  assert.equal(report.summary.managerCount, 2);
  assert.equal(report.summary.employeeCount, 5);
  assert.equal(report.attendance.totalRecords, 3);
  assert.equal(report.attendance.totalSeconds, 7800);
});
