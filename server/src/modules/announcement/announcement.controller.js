const { z } = require('zod');
const announcementService = require('./announcement.service');

const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  targetType: z.enum(['ALL', 'SELECTED_USERS']).optional(),
  selectedUserIds: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  expiryDate: z.string().optional().or(z.null()),
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  targetType: z.enum(['ALL', 'SELECTED_USERS']).optional(),
  selectedUserIds: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  expiryDate: z.string().optional().or(z.null()),
});

const createAnnouncementHandler = async (req, res) => {
  try {
    const payload = createAnnouncementSchema.parse(req.body);
    const announcement = await announcementService.createAnnouncement(
      req.user.workspaceId,
      req.user.id,
      payload,
      req.user.role,
    );
    return res.status(201).json({ status: 'success', data: announcement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const getAnnouncementsHandler = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      search: req.query.search,
    };
    const announcements = await announcementService.getAnnouncements(
      req.user.workspaceId,
      filters,
      req.user,
    );
    return res.json({ status: 'success', data: announcements });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const getAnnouncementHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await announcementService.getAnnouncementById(
      req.user.workspaceId,
      id,
    );

    if (!announcement) {
      return res.status(404).json({ status: 'error', message: 'Announcement not found' });
    }

    return res.json({ status: 'success', data: announcement });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const updateAnnouncementHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = updateAnnouncementSchema.parse(req.body);
    const announcement = await announcementService.updateAnnouncement(
      req.user.workspaceId,
      id,
      payload,
    );
    return res.json({ status: 'success', data: announcement });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const deleteAnnouncementHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await announcementService.deleteAnnouncement(req.user.workspaceId, id);
    return res.json({ status: 'success', message: 'Announcement deleted successfully' });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createAnnouncementHandler,
  getAnnouncementsHandler,
  getAnnouncementHandler,
  updateAnnouncementHandler,
  deleteAnnouncementHandler,
};
