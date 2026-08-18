const { z } = require('zod');
const { Readable } = require('stream');
const { cloudinary } = require('../../utils/cloudinary');
const chatService = require('./chat.service');
const { getIo } = require('../../socket');

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});

const bulkDeleteMessagesSchema = z.object({
  messageIds: z.array(z.string()).min(1, 'Select at least one message'),
});

const forwardMessagesSchema = z.object({
  messageIds: z.array(z.string()).min(1, 'Select at least one message'),
  targetConversationIds: z.array(z.string()).min(1, 'Select at least one conversation to forward to'),
});

const startDirectSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(80, 'Group name is too long'),
  memberIds: z.array(z.string()).min(1, 'Select at least one member'),
});

const updateNameSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(80, 'Group name is too long'),
});

const listConversationsHandler = async (req, res) => {
  try {
    const conversations = await chatService.listConversations(req.user.id, req.user.workspaceId);
    return res.json({ status: 'success', data: conversations });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const startDirectConversationHandler = async (req, res) => {
  try {
    const { userId } = startDirectSchema.parse(req.body);
    const conversation = await chatService.getOrCreateDirectConversation(
      req.user.workspaceId,
      req.user.id,
      userId,
    );
    return res.status(201).json({ status: 'success', data: conversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const createGroupConversationHandler = async (req, res) => {
  try {
    const { name, memberIds } = createGroupSchema.parse(req.body);
    const conversation = await chatService.createGroupConversation(req.user.workspaceId, req.user.id, {
      name,
      memberIds,
    });
    return res.status(201).json({ status: 'success', data: conversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const updateConversationNameHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = updateNameSchema.parse(req.body);
    const conversation = await chatService.updateConversationName(id, req.user.id, req.user.workspaceId, name);
    return res.json({ status: 'success', data: conversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const getMessagesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { before, limit } = req.query;
    const messages = await chatService.getMessages(id, req.user.id, req.user.workspaceId, {
      before,
      limit,
    });
    return res.json({ status: 'success', data: messages });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const sendMessageHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = sendMessageSchema.parse(req.body);
    const message = await chatService.sendMessage(id, req.user.id, req.user.workspaceId, content);

    // Broadcast to any socket clients in the room (covers senders/viewers who
    // are connected via socket but posted through this REST fallback).
    try {
      getIo()?.to(`conv:${id}`).emit('message:new', message);
    } catch {
      // Socket layer may not be initialised in some contexts (tests) — ignore.
    }

    return res.status(201).json({ status: 'success', data: message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

/**
 * sendAttachmentHandler
 * Uploads a file (already type/size-validated by multer in chat.routes.js —
 * images plus PDFs/Office docs/text/ZIP) to Cloudinary, then creates the
 * chat message pointing at it — mirrors uploadProfilePhoto in
 * profile.controller.js. The optional `caption` field becomes the message's
 * `content`. Images upload as Cloudinary "image" resources (with a delivered
 * size cap); everything else uploads as "raw" — Cloudinary's category for
 * non-transformable files, which just stores and serves them as-is.
 */
const sendAttachmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'A file is required.' });
    }

    const caption = String(req.body.caption || '').trim();
    const isImage = req.file.mimetype.startsWith('image/');

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'aikart/chat-attachments',
          resource_type: isImage ? 'image' : 'raw',
          // Cap delivered dimensions rather than the original upload — keeps
          // full-res photos out of the free plan's shared storage/bandwidth
          // credit pool without needing a client-side resize step. Ignored
          // for non-image ("raw") uploads, which Cloudinary can't transform.
          ...(isImage ? { transformation: [{ width: 1600, height: 1600, crop: 'limit' }] } : {}),
          // Keeps the delivered URL ending in a recognizable name (e.g.
          // "resume_ab12cd.pdf") instead of a bare Cloudinary id, which
          // matters for raw files since the client links straight to it.
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      Readable.from(req.file.buffer).pipe(uploadStream);
    });

    const message = await chatService.sendMessage(id, req.user.id, req.user.workspaceId, {
      content: caption,
      attachment: {
        url: uploadResult.secure_url,
        type: req.file.mimetype,
        name: req.file.originalname,
      },
    });

    try {
      getIo()?.to(`conv:${id}`).emit('message:new', message);
    } catch {
      // Socket layer may not be initialised in some contexts (tests) — ignore.
    }

    return res.status(201).json({ status: 'success', data: message });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const bulkDeleteMessagesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { messageIds } = bulkDeleteMessagesSchema.parse(req.body);
    await chatService.deleteMessages(id, req.user.id, req.user.workspaceId, messageIds);
    return res.json({ status: 'success' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

/**
 * forwardMessagesHandler
 * Creates the forwarded copies (via chatService.forwardMessages) then, like
 * sendMessageHandler/sendAttachmentHandler, broadcasts each one to its
 * conversation's room so anyone with that conversation open sees it land
 * live instead of waiting for a refetch.
 */
const forwardMessagesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { messageIds, targetConversationIds } = forwardMessagesSchema.parse(req.body);
    const created = await chatService.forwardMessages(
      id,
      req.user.id,
      req.user.workspaceId,
      messageIds,
      targetConversationIds,
    );

    try {
      const io = getIo();
      created.forEach((message) => io?.to(`conv:${message.conversationId}`).emit('message:new', message));
    } catch {
      // Socket layer may not be initialised in some contexts (tests) — ignore.
    }

    return res.status(201).json({ status: 'success', data: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', message: error.errors[0].message });
    }
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const markReadHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { readAt } = await chatService.markConversationRead(id, req.user.id, req.user.workspaceId);
    return res.json({ status: 'success', data: { readAt } });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const clearMessagesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await chatService.clearConversationMessages(id, req.user.id, req.user.workspaceId);
    return res.json({ status: 'success' });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const leaveConversationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await chatService.leaveConversation(id, req.user.id, req.user.workspaceId);
    return res.json({ status: 'success' });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  listConversationsHandler,
  startDirectConversationHandler,
  createGroupConversationHandler,
  updateConversationNameHandler,
  getMessagesHandler,
  sendMessageHandler,
  sendAttachmentHandler,
  bulkDeleteMessagesHandler,
  forwardMessagesHandler,
  markReadHandler,
  clearMessagesHandler,
  leaveConversationHandler,
};
