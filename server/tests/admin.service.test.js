const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const {
  listUsers,
  getAdminStats,
  updateUserRole,
} = require('../src/modules/admin/admin.service');

test('listUsers returns workspace users and supports search', async () => {
  const mockUsers = [
    {
      id: 'u1',
      name: 'Admin One',
      email: 'admin@aikart.com',
      role: 'ADMIN',
      workspaceId: 'ws1',
      isActive: true,
      employeeId: 'AIK-1',
      department: { name: 'Operations' },
      position: 'Admin',
    },
    {
      id: 'u2',
      name: 'Emp Two',
      email: 'emp@aikart.com',
      role: 'EMPLOYEE',
      workspaceId: 'ws1',
      isActive: true,
      employeeId: 'AIK-2',
      department: { name: 'Engineering' },
      position: 'Engineer',
    },
  ];

  const prismaStub = {
    user: {
      findMany: async (args) => {
        assert.equal(args.where.workspaceId, 'ws1');
        assert.match(args.where.OR[0].name.contains, /emp/i);
        return mockUsers.filter((u) => u.name.toLowerCase().includes('emp'));
      },
      count: async () => 2,
    },
  };

  prismaConfig.getPrisma = () => prismaStub;

  const result = await listUsers('ws1', { search: 'emp' });

  assert.equal(result.users.length, 1);
  assert.equal(result.users[0].email, 'emp@aikart.com');
});

test('updateUserRole rejects invalid roles', async () => {
  const prismaStub = {
    user: {
      findUnique: async () => ({
        id: 'u1',
        workspaceId: 'ws1',
        role: 'EMPLOYEE',
      }),
    },
  };

  prismaConfig.getPrisma = () => prismaStub;

  await assert.rejects(
    () => updateUserRole('u1', 'ws1', 'SUPERADMIN'),
    /Invalid role/i,
  );
});

test('getAdminStats returns workspace counts', async () => {
  const prismaStub = {
    user: {
      count: async ({ where }) => {
        if (where.role === 'ADMIN') return 1;
        if (where.role === 'MANAGER') return 2;
        if (where.role === 'EMPLOYEE') return 5;
        return 8;
      },
    },
  };

  prismaConfig.getPrisma = () => prismaStub;

  const stats = await getAdminStats('ws1');

  assert.equal(stats.totalUsers, 8);
  assert.equal(stats.adminCount, 1);
  assert.equal(stats.managerCount, 2);
  assert.equal(stats.employeeCount, 5);
});
