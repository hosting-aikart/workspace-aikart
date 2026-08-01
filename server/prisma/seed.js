import { prisma } from "../src/lib/prisma.js";
import bcrypt from "bcrypt";

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  // Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "AIKart Workspace",
      description: "Main AIKart Organization",
    },
  });

  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const managerPassword = await bcrypt.hash("Manager@123", 12);
  const employeePassword = await bcrypt.hash("Employee@123", 12);

  // Admin
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@aikart.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      workspaceId: workspace.id,
      mustChangePassword: false,
    },
  });

  // Manager
  const manager = await prisma.user.create({
    data: {
      name: "Manager",
      email: "manager@aikart.com",
      passwordHash: managerPassword,
      role: "MANAGER",
      workspaceId: workspace.id,
      createdById: admin.id,
      mustChangePassword: true,
    },
  });

  // Employee
  await prisma.user.create({
    data: {
      name: "Employee",
      email: "employee@aikart.com",
      passwordHash: employeePassword,
      role: "EMPLOYEE",
      workspaceId: workspace.id,
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