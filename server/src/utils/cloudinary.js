/**
 * Shared Cloudinary client + cleanup helper.
 *
 * Every upload in this app (profile photos, chat attachments) creates a
 * brand-new asset and never reuses a public_id, so without an explicit
 * delete the account's storage only ever grows — a photo re-upload leaves
 * the old one behind, and deleting a chat message/clearing a chat only
 * removed the database row, never the file. See destroyAsset's call sites:
 * uploadProfilePhoto (deletes the previous photo before saving the new
 * one) and chat.service.js's deleteMessages/clearConversationMessages/
 * leaveConversation (delete each removed message's attachment).
 */

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * extractPublicId
 * Recovers the public_id a destroy call needs from a delivered secure_url,
 * e.g. ".../upload/v1690000000/aikart/chat-attachments/resume_ab12cd.pdf"
 * -> "aikart/chat-attachments/resume_ab12cd". Works for both profile
 * photos and chat attachments since both are plain (non-transformed-at-
 * delivery) upload URLs under the same Cloudinary account.
 */
const extractPublicId = (url) => {
  if (!url) return null;
  const afterUpload = url.split('/upload/')[1];
  if (!afterUpload) return null;
  const withoutVersion = afterUpload.replace(/^v\d+\//, '');
  return withoutVersion.replace(/\.[^./]+$/, '') || null;
};

/**
 * destroyAsset
 * Best-effort delete — logs and swallows failures instead of throwing, so
 * a Cloudinary hiccup never blocks the database operation (a profile
 * update, a message delete) it's cleaning up after. A stray undeleted file
 * is a much smaller problem than failing someone's profile save.
 */
const destroyAsset = async (url, resourceType = 'image') => {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('[cloudinary] Failed to delete asset:', publicId, err.message);
  }
};

module.exports = { cloudinary, extractPublicId, destroyAsset };
