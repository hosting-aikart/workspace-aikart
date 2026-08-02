const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const {
  createProject,
  archiveProject,
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
