const bcrypt = require('bcrypt');
const { getPrisma } = require('../../config/prisma');

// ─── Field Select (shared shape) ──────────────────────────────────────────────
const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  employeeId: true,
  phone: true,
  position: true,
  joiningDate: true,
  isActive: true,
  mustChangePassword: true,
  lastLogin: true,
  profilePhoto: true,
  createdAt: true,
  updatedAt: true,
  workspace: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  reportingManager: { select: { id: true, name: true, email: true } },
};

// ─── Service Functions ────────────────────────────────────────────────────────

const getProfile = async (userId) => {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

/**
 * Updates only the employee-editable fields: phone, profilePhoto, password.
 * Name, position, department, employeeId, joiningDate, reportingManager are
 * admin-only edits (handled in the Admin Panel module, not here).
 */
const updateProfile = async (userId, data) => {
  const prisma = getPrisma();

  const updateData = {};

  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.profilePhoto !== undefined) updateData.profilePhoto = data.profilePhoto;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
    updateData.mustChangePassword = false;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: PROFILE_SELECT,
  });

  return updated;
};

module.exports = { getProfile, updateProfile };