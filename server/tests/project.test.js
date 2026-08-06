const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const {
  createProject,
  archiveProject,
  addProjectMember,
  listProjects,
} = require('../src/modules/project/project.service');

test('createProject rejects duplicate project names inside the same workspace', async () => {
  const mockPrisma = {
    project: {
      findFirst: async () => ({ id: 'existing' }),
      create: async () => ({ id: 'created' }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  await assert.rejects(
    () =>
      createProject('ws1', {
        name: 'CRM Launch',
        description: 'Launch the CRM',
        deadline: '2026-09-01',
      }),
    /already exists/i,
  );
});

test('archiveProject updates a project to archived state without deleting it', async () => {
  const mockPrisma = {
    project: {
      findFirst: async () => ({ id: 'p1', isArchived: false }),
      update: async ({ data }) => ({ id: 'p1', isArchived: data.isArchived }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const result = await archiveProject('ws1', 'p1');

  assert.equal(result.isArchived, true);
});

test('createProject stores manager and creates memberships for selected members', async () => {
  let memberCreateCount = 0;
  let findFirstCalls = 0;

  const mockPrisma = {
    project: {
      findFirst: async () => {
        findFirstCalls += 1;
        return findFirstCalls === 1 ? null : { id: 'p1', managerId: 'u1' };
      },
      create: async ({ data }) => ({ id: 'p1', ...data }),
    },
    projectMember: {
      findMany: async () => [],
      findFirst: async () => null,
      create: async () => {
        memberCreateCount += 1;
        return { id: `pm${memberCreateCount}` };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    user: {
      findFirst: async () => ({ id: 'u2', workspaceId: 'ws1' }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const result = await createProject('ws1', {
    name: 'CRM Launch',
    managerId: 'u1',
    memberIds: ['u2', 'u3'],
  });

  assert.equal(result.id, 'p1');
  assert.equal(result.managerId, 'u1');
  assert.equal(memberCreateCount, 2);
});

test('listProjects limits visibility to the current employee projects', async () => {
  let capturedWhere = null;

  const mockPrisma = {
    project: {
      findMany: async ({ where }) => {
        capturedWhere = where;
        return [{ id: 'p1' }];
      },
      count: async ({ where }) => {
        capturedWhere = where;
        return 1;
      },
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const result = await listProjects('ws1', {
    userId: 'u2',
    userRole: 'EMPLOYEE',
    page: 1,
    limit: 10,
  });

  assert.equal(result.projects.length, 1);
  assert.ok(Array.isArray(capturedWhere.OR));
  assert.ok(capturedWhere.OR.some((entry) => entry.managerId === 'u2'));
  assert.ok(capturedWhere.OR.some((entry) => entry.members?.some?.userId === 'u2'));
});

test('addProjectMember creates a membership when the user is not already assigned', async () => {
  const mockPrisma = {
    project: {
      findFirst: async () => ({ id: 'p1', workspaceId: 'ws1' }),
      findUnique: async () => null,
      update: async ({ data }) => ({ id: 'p1', members: data.members }),
    },
    projectMember: {
      findFirst: async () => null,
      create: async () => ({ id: 'pm1' }),
    },
    user: {
      findFirst: async () => ({ id: 'u2', workspaceId: 'ws1' }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const result = await addProjectMember('ws1', 'p1', 'u2');

  assert.equal(result.id, 'p1');
});
