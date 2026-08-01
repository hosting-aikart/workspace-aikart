const bcrypt = require('bcrypt');
const { getPrisma } = require('../../config/prisma');

// ─── Field Select (shared shape) ──────────────────────────────────────────────
// Only includes fields that exist in the Prisma schema
const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  workspaceId: true,
  isActive: true,
  mustChangePassword: true,
  lastLogin: true,
  profilePhoto: true,
  createdAt: true,
  updatedAt: true,
  workspace: { select: { id: true, name: true } },
};

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Returns the full profile for the given user id.
 * @param {string} userId
 */
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
 * Updates only the employee-editable fields: profilePhoto, password.
 * Password is hashed with bcrypt before saving.
 * @param {string} userId
 * @param {{ profilePhoto?: string, password?: string }} data
 */
const updateProfile = async (userId, data) => {
  const prisma = getPrisma();

  const updateData = {};

  if (data.profilePhoto !== undefined) updateData.profilePhoto = data.profilePhoto;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: PROFILE_SELECT,
  });

  return updated;
};

module.exports = { getProfile, updateProfile };
