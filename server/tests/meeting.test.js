const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const {
  createMeeting,
  cancelMeeting,
  respondToInvitation,
} = require('../src/modules/meetings/meeting.service');

test('createMeeting allows EMPLOYEE to create a meeting', async () => {
  const mockUser = { id: 'emp1', role: 'EMPLOYEE', name: 'Employee User' };

  const mockPrisma = {
    user: {
      findMany: async () => [
        { id: 'emp1', email: 'emp1@workspace.com', name: 'Employee User' },
        { id: 'emp2', email: 'emp2@workspace.com', name: 'Employee 2' },
      ],
    },
    meeting: {
      create: async ({ data }) => ({
        id: 'm1',
        title: data.title,
        status: data.status,
        meetingType: data.meetingType,
        organizer: { id: mockUser.id, name: mockUser.name, email: 'emp1@workspace.com' },
        participants: [],
      }),
    },
    announcement: {
      create: async () => ({ id: 'ann1' }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const meeting = await createMeeting('ws1', mockUser, {
    title: 'Employee Sync',
    meetingType: 'SCHEDULED',
    startTime: '2026-08-05T10:00:00.000Z',
    endTime: '2026-08-05T11:00:00.000Z',
    participantIds: ['emp2'],
  });

  assert.equal(meeting.title, 'Employee Sync');
  assert.equal(meeting.meetingType, 'SCHEDULED');
});

test('createMeeting creates a scheduled meeting with participants for ADMIN', async () => {
  const mockUser = { id: 'admin1', role: 'ADMIN', name: 'Admin User' };

  const mockPrisma = {
    user: {
      findMany: async () => [
        { id: 'admin1', email: 'admin@workspace.com', name: 'Admin User' },
        { id: 'emp1', email: 'emp1@workspace.com', name: 'Employee 1' },
      ],
    },
    meeting: {
      create: async ({ data }) => ({
        id: 'm1',
        title: data.title,
        status: data.status,
        meetingType: data.meetingType,
        organizer: { id: mockUser.id, name: mockUser.name, email: 'admin@workspace.com' },
        participants: [],
      }),
    },
    announcement: {
      create: async () => ({ id: 'ann1' }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const meeting = await createMeeting('ws1', mockUser, {
    title: 'Q3 Product Strategy',
    description: 'Discuss Q3 deliverables',
    agenda: '1. Roadmap\n2. Design',
    meetingType: 'SCHEDULED',
    startTime: '2026-08-05T10:00:00.000Z',
    endTime: '2026-08-05T11:00:00.000Z',
    participantIds: ['emp1'],
  });

  assert.equal(meeting.title, 'Q3 Product Strategy');
  assert.equal(meeting.meetingType, 'SCHEDULED');
});

test('cancelMeeting updates status to CANCELLED', async () => {
  const mockUser = { id: 'admin1', role: 'ADMIN' };

  const mockPrisma = {
    meeting: {
      findFirst: async () => ({ id: 'm1', organizerId: 'admin1', status: 'UPCOMING' }),
      update: async ({ data }) => ({ id: 'm1', status: data.status }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const cancelled = await cancelMeeting('ws1', mockUser, 'm1');
  assert.equal(cancelled.status, 'CANCELLED');
});

test('respondToInvitation updates response status', async () => {
  const mockUser = { id: 'emp1', role: 'EMPLOYEE' };

  const mockPrisma = {
    meeting: {
      findFirst: async () => ({ id: 'm1', workspaceId: 'ws1' }),
    },
    meetingParticipant: {
      upsert: async ({ create, update }) => ({
        id: 'mp1',
        meetingId: 'm1',
        userId: 'emp1',
        responseStatus: update.responseStatus || create.responseStatus,
      }),
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const participant = await respondToInvitation('ws1', mockUser, 'm1', 'ACCEPTED');
  assert.equal(participant.responseStatus, 'ACCEPTED');
});
