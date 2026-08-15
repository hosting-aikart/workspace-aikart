const test = require('node:test');
const assert = require('node:assert/strict');

const prismaConfig = require('../src/config/prisma');
const {
  getEmployees,
  createEmployee,
} = require('../src/modules/admin/admin.service');

test('getEmployees returns filtered employees for the current workspace', async () => {
  const mockPrisma = {
    user: {
      findMany: async () => [
        {
          id: 'u1',
          name: 'Aisha Khan',
          email: 'aisha@aikart.com',
          role: 'MANAGER',
          employeeId: 'AIK-001',
          position: 'Manager',
          isActive: true,
          department: { id: 'd1', name: 'Operations' },
          reportingManager: null,
        },
      ],
      count: async () => 1,
    },
    department: {
      findFirst: async () => null,
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  const result = await getEmployees('ws1', {
    search: 'aisha',
    page: '1',
    limit: '10',
  });

  assert.equal(result.employees.length, 1);
  assert.equal(result.employees[0].email, 'aisha@aikart.com');
  assert.equal(result.pagination.total, 1);
});

test('createEmployee rejects duplicate employeeId inside the same workspace', async () => {
  const mockPrisma = {
    user: {
      findUnique: async () => null,
      findFirst: async () => ({ id: 'existing' }),
      create: async () => ({ id: 'created' }),
    },
    department: {
      findFirst: async () => null,
    },
  };

  prismaConfig.getPrisma = () => mockPrisma;

  await assert.rejects(
    () =>
      createEmployee('ws1', {
        name: 'Ravi',
        employeeId: 'AIK-100',
        email: 'ravi@aikart.com',
        role: 'EMPLOYEE',
        password: 'Welcome@123',
      }),
    /already exists/i,
  );
});

test('employeeCreateSchema parses valid payload with or without location', () => {
  const { employeeCreateSchema } = require('../src/modules/admin/admin.validation');

  const payloadWithoutLocation = {
    name: 'Test Employee',
    employeeId: 'EMP-999',
    email: 'test@example.com',
    password: 'Password123!',
  };

  const parsed = employeeCreateSchema.parse(payloadWithoutLocation);
  assert.equal(parsed.name, 'Test Employee');
  assert.equal(parsed.location, undefined);

  const payloadWithLocation = {
    ...payloadWithoutLocation,
    location: 'Remote',
  };

  const parsedWithLocation = employeeCreateSchema.parse(payloadWithLocation);
  assert.equal(parsedWithLocation.location, 'Remote');
});

