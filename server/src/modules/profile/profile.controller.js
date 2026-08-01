const { z } = require('zod');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const { getProfile, updateProfile } = require('./profile.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

// ─── Cloudinary config (reads from process.env) ───────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-().]{7,20}$/, { message: 'Enter a valid phone number.' })
    .optional(),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .optional(),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => {
    if (data.password || data.confirmPassword) {
      return data.password === data.confirmPassword;
    }
    return true;
  },
  { message: 'Passwords do not match.', path: ['confirmPassword'] }
);

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/me/profile
 * Returns the logged-in user's full profile.
 */
const getMyProfile = async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);
    return sendSuccess(res, profile);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch profile.', err.statusCode || 500);
  }
};

/**
 * PATCH /api/me/profile
 * Employee can update: phone, password.
 */
const updateMyProfile = async (req, res) => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors[0]?.message || 'Validation failed.';
    return sendError(res, message, 422);
  }

  // Strip confirmPassword — not stored
  const { confirmPassword: _omit, ...validData } = result.data;

  // Nothing to update?
  if (Object.keys(validData).length === 0) {
    return sendError(res, 'No valid fields to update.', 422);
  }

  try {
    const updated = await updateProfile(req.user.id, validData);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err.message || 'Failed to update profile.', err.statusCode || 500);
  }
};

/**
 * POST /api/me/profile/photo
 * Accepts multipart/form-data with field "photo".
 * Uploads to Cloudinary, saves returned URL.
 */
const uploadProfilePhoto = async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No image file provided.', 400);
  }

  try {
    // Stream buffer → Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'aikart/profile-photos',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      Readable.from(req.file.buffer).pipe(uploadStream);
    });

    const updated = await updateProfile(req.user.id, {
      profilePhoto: uploadResult.secure_url,
    });

    return sendSuccess(res, {
      profilePhoto: updated.profilePhoto,
    });
  } catch (err) {
    console.error('[uploadProfilePhoto]', err);
    return sendError(res, 'Photo upload failed. Please try again.', 500);
  }
};

module.exports = { getMyProfile, updateMyProfile, uploadProfilePhoto };
