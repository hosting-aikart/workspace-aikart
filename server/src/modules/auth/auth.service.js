const { getPrisma } = require("../../config/prisma");
const { comparePassword } = require("../../utils/password");
const { generateToken } = require("../../utils/jwt");

/**
 * Authenticate a user by email/password.
 * Returns { accessToken, user } on success.
 */
const loginUser = async (email, password) => {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("Account is disabled");
  }

  const validPassword = await comparePassword(password, user.passwordHash);

  if (!validPassword) {
    throw new Error("Invalid email or password");
  }

  // Update lastLogin timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const accessToken = generateToken(user);

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
      mustChangePassword: user.mustChangePassword,
      profilePhoto: user.profilePhoto,
    },
  };
};

/**
 * Returns the user profile for the authenticated user.
 */
const getUserById = async (userId) => {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      workspaceId: true,
      mustChangePassword: true,
      profilePhoto: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

module.exports = { loginUser, getUserById };