import { prisma } from "../src/lib/prisma.js";
import bcrypt from "bcrypt";

async function main() {
  console.log("🌱 Seeding database...");

  console.log("🧹 Clearing all database data...");
  const tablenames = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  
  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: "AIKart Workspace",
      description: "Main AIKart Organization",
    },
  });

  const engineering = await prisma.department.create({
    data: { name: "Engineering", workspaceId: workspace.id },
  });
  const operations = await prisma.department.create({
    data: { name: "Operations", workspaceId: workspace.id },
  });

  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const managerPassword = await bcrypt.hash("Manager@123", 12);
  const employeePassword = await bcrypt.hash("Employee@123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@aikart.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      workspaceId: workspace.id,
      departmentId: operations.id,
      employeeId: "AIK-0001",
      position: "Workspace Administrator",
      phone: "+91 90000 00001",
      joiningDate: new Date("2024-01-01"),
      mustChangePassword: false,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Manager",
      email: "manager@aikart.com",
      passwordHash: managerPassword,
      role: "MANAGER",
      workspaceId: workspace.id,
      departmentId: engineering.id,
      employeeId: "AIK-0002",
      position: "Engineering Manager",
      phone: "+91 90000 00002",
      joiningDate: new Date("2024-02-01"),
      createdById: admin.id,
      mustChangePassword: true,
    },
  });

  await prisma.user.create({
    data: {
      name: "Employee",
      email: "employee@aikart.com",
      passwordHash: employeePassword,
      role: "EMPLOYEE",
      workspaceId: workspace.id,
      departmentId: engineering.id,
      employeeId: "AIK-0003",
      position: "Software Engineer",
      phone: "+91 90000 00003",
      joiningDate: new Date("2024-03-01"),
      reportingManagerId: manager.id,
      createdById: manager.id,
      mustChangePassword: true,
    },
  });

  console.log("✅ Database seeded successfully!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });