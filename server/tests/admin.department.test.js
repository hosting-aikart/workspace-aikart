const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const {
  listDepartments,
  createDepartment,
} = require('../src/modules/admin/admin.service');

test('listDepartments returns workspace departments and pagination', async () => {
  const mockPrisma = {
    department: {
      findMany: async (args) => {
        assert.equal(args.where.workspaceId, 'ws1');
        return [
          {
            id: 'd1',
            name: 'Engineering',
            _count: { users: 3 },
          },
        ];
      },
      count: async () => 1,
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const result = await listDepartments('ws1', { page: '1', limit: '10' });

  assert.equal(result.departments.length, 1);
  assert.equal(result.departments[0].name, 'Engineering');
  assert.equal(result.pagination.total, 1);
});

test('createDepartment rejects duplicate names inside the same workspace', async () => {
  const mockPrisma = {
    department: {
      findFirst: async () => ({ id: 'existing' }),
      create: async () => ({ id: 'created' }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  await assert.rejects(
    () => createDepartment('ws1', { name: 'Engineering' }),
    /already exists/i,
  );
});
