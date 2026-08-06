const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const { createTask } = require('../src/modules/tasks/tasks.service');
const { createTaskHandler } = require('../src/modules/tasks/tasks.controller');

test('createTask allows EMPLOYEE to create tasks even if they are not a project member', async () => {
  const mockPrisma = {
    project: {
      findFirst: async () => ({ id: 'project-1', workspaceId: 'ws1' }),
    },
    task: {
      create: async ({ data }) => ({
        id: 'task-1',
        title: data.title,
        projectId: data.projectId,
      }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const task = await createTask('ws1', 'user-1', 'EMPLOYEE', {
    projectId: 'project-1',
    title: 'Write project brief',
  });

  assert.equal(task.id, 'task-1');
  assert.equal(task.title, 'Write project brief');
});

test('createTaskHandler returns the created task with a success payload', async () => {
  const mockPrisma = {
    project: {
      findFirst: async () => ({ id: 'project-1', workspaceId: 'ws1' }),
    },
    projectMember: {
      findFirst: async () => ({ id: 'pm-1' }),
    },
    task: {
      create: async (args) => ({
        id: 'task-1',
        ...args.data,
        project: { id: 'project-1', name: 'Launch' },
      }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const req = {
    user: { id: 'user-1', workspaceId: 'ws1', role: 'EMPLOYEE' },
    body: { title: 'Ship update', projectId: 'project-1' },
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

  await createTaskHandler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.status, 'success');
  assert.equal(res.payload.data.title, 'Ship update');
});
