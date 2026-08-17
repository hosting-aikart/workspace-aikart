const { z } = require('zod');

const employeeCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.'),
  employeeId: z.string().trim().min(1).optional().or(z.literal('')),
  email: z.string().trim().email('Please enter a valid email.'),
  phone: z.string().trim().optional().or(z.literal('')),
  position: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().optional().or(z.literal('')),
  departmentId: z.string().trim().optional().or(z.literal('')),
  reportingManagerId: z.string().trim().optional().or(z.literal('')),
  joiningDate: z.string().trim().optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  password: z
    .string()
    .trim()
    .min(8, 'Temporary password must be at least 8 characters.'),
  profilePhoto: z.string().trim().optional().or(z.literal('')),
});

const employeeUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  employeeId: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional().or(z.literal('')),
  position: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().optional().or(z.literal('')),
  departmentId: z.string().trim().optional().or(z.literal('')),
  reportingManagerId: z.string().trim().optional().or(z.literal('')),
  joiningDate: z.string().trim().optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  profilePhoto: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

const roleUpdateSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
});

const statusUpdateSchema = z.object({
  isActive: z.boolean(),
});

const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required.'),
});

const departmentUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required.'),
});

module.exports = {
  employeeCreateSchema,
  employeeUpdateSchema,
  roleUpdateSchema,
  statusUpdateSchema,
  departmentCreateSchema,
  departmentUpdateSchema,
};
