const prismaModule = require('../../config/prisma');
const notificationService = require('../notification/notification.service');
const { emitToUser } = require('../../socket/registry');
const { destroyAsset } = require('../../utils/cloudinary');

const getPrisma = () => prismaModule.getPrisma();

/**
 * destroyMessageAttachments
 * Cleans up Cloudinary storage for a batch of messages being permanently
 * deleted from the DB — called from deleteMessages, clearConversationMessages,
 * and leaveConversation, the three places a message row can disappear.
 * Fire-and-forget (destroyAsset swallows its own errors): a Cloudinary
 * hiccup here shouldn't hold up — or fail — the delete the caller asked for.
 */
const destroyMessageAttachments = (messages) => {
  messages
    .filter((m) => m.attachmentUrl)
    .forEach((m) => destroyAsset(m.attachmentUrl, m.attachmentType?.startsWith('image/') ? 'image' : 'raw'));
};

const MESSAGE_PAGE_SIZE = 50;

const senderSelect = {
  id: true,
  name: true,
  email: true,
  profilePhoto: true,
  role: true,
};

/**
 * ensureTeamChannel
 * Finds (or lazily creates) the single workspace-wide "Team Chat" GROUP
 * conversation. Every workspace member can access it without an explicit
 * invite — access is granted on read via `accessConversation`.
 */
const ensureTeamChannel = async (workspaceId) => {
  const prisma = getPrisma();

  let channel = await prisma.chatConversation.findFirst({
    where: { workspaceId, isDefault: true },
  });

  if (!channel) {
    channel = await prisma.chatConversation.create({
      data: {
        workspaceId,
        type: 'GROUP',
        name: 'Team Chat',
        isDefault: true,
      },
    });
  }

  return channel;
};

/**
 * accessConversation
 * Verifies the requesting user may read/write the given conversation and
 * returns it. The default Team Chat auto-enrolls any workspace member on
 * first touch; DIRECT (and future custom GROUP) conversations require an
 * existing ChatParticipant row.
 */
const accessConversation = async (conversationId, userId, workspaceId) => {
  const prisma = getPrisma();

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, workspaceId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.isDefault) {
    await prisma.chatParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: {},
      create: { conversationId, userId },
    });
    return conversation;
  }

  const participant = await prisma.chatParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

  if (!participant) {
    throw new Error('You do not have access to this conversation');
  }

  return conversation;
};

/**
 * listConversations
 * Returns every conversation the user belongs to (Team Chat first, then
 * direct messages by most recent activity), each with a message preview
 * and unread count.
 */
const listConversations = async (userId, workspaceId) => {
  const prisma = getPrisma();

  // ensureTeamChannel already fetches (or creates) this row — reusing its
  // return value instead of querying for the same channel again saves a
  // full extra round trip on every single call to this function, which
  // happens on every page load (ChatContext is app-wide, not just the Chat
  // page) and every DB round trip is real, non-trivial network latency.
  const teamChannel = await ensureTeamChannel(workspaceId);
  // Auto-join the caller into the team channel so it shows up on first visit.
  await prisma.chatParticipant.upsert({
    where: { conversationId_userId: { conversationId: teamChannel.id, userId } },
    update: {},
    create: { conversationId: teamChannel.id, userId },
  });

  const participations = await prisma.chatParticipant.findMany({
    where: { userId, conversation: { workspaceId } },
    include: {
      conversation: {
        include: {
          participants: {
            include: { user: { select: senderSelect } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: senderSelect } },
          },
        },
      },
    },
  });

  const conversations = await Promise.all(
    participations.map(async (p) => {
      const { conversation } = p;
      const unreadCount = await prisma.chatMessage.count({
        where: {
          conversationId: conversation.id,
          createdAt: { gt: p.lastReadAt ?? new Date(0) },
          senderId: { not: userId },
        },
      });

      const otherParticipants = conversation.participants
        .map((cp) => cp.user)
        .filter((u) => u.id !== userId);

      // For a DIRECT conversation, the other person's read cursor is enough
      // to derive a WhatsApp-style tick on every message *we* sent them
      // (sent vs. read) without having to store a per-message read flag —
      // see MessageThread's tick rendering on the client.
      const otherParticipantLastReadAt = conversation.type === 'DIRECT'
        ? conversation.participants.find((cp) => cp.userId !== userId)?.lastReadAt ?? null
        : null;

      return {
        id: conversation.id,
        type: conversation.type,
        isDefault: conversation.isDefault,
        name: conversation.isDefault
          ? 'Team Chat'
          : conversation.name || otherParticipants.map((u) => u.name).join(', ') || 'Direct Message',
        participants: otherParticipants,
        lastMessage: conversation.messages[0] || null,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount,
        otherParticipantLastReadAt,
      };
    }),
  );

  // Team channel always first, then most recently active.
  conversations.sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return conversations;
};

/**
 * getOrCreateDirectConversation
 * Finds the existing 1:1 conversation between the two users, or creates one.
 */
const getOrCreateDirectConversation = async (workspaceId, userId, otherUserId) => {
  const prisma = getPrisma();

  if (userId === otherUserId) {
    throw new Error('Cannot start a conversation with yourself');
  }

  const otherUser = await prisma.user.findFirst({
    where: { id: otherUserId, workspaceId },
  });

  if (!otherUser) {
    throw new Error('User not found in this workspace');
  }

  const existing = await prisma.chatConversation.findFirst({
    where: {
      workspaceId,
      type: 'DIRECT',
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.chatConversation.create({
    data: {
      workspaceId,
      type: 'DIRECT',
      createdById: userId,
      participants: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
  });

  return created;
};

/**
 * createGroupConversation
 * Creates a custom (non-default) GROUP conversation with the creator plus
 * whichever colleagues they selected at creation time. Unlike the
 * workspace-wide Team Chat, membership here is explicit — only the
 * creator and the chosen members get a ChatParticipant row, so only they
 * can access it (see accessConversation).
 */
const createGroupConversation = async (workspaceId, creatorId, { name, memberIds }) => {
  const prisma = getPrisma();

  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Group name is required');
  }

  const uniqueMemberIds = Array.from(new Set(memberIds || [])).filter((id) => id && id !== creatorId);
  if (uniqueMemberIds.length === 0) {
    throw new Error('Select at least one member to add to the group');
  }

  const members = await prisma.user.findMany({
    where: { id: { in: uniqueMemberIds }, workspaceId },
    select: { id: true },
  });
  if (members.length !== uniqueMemberIds.length) {
    throw new Error('One or more selected members were not found in this workspace');
  }

  const conversation = await prisma.chatConversation.create({
    data: {
      workspaceId,
      type: 'GROUP',
      name: trimmedName,
      createdById: creatorId,
      participants: {
        create: [{ userId: creatorId }, ...uniqueMemberIds.map((userId) => ({ userId }))],
      },
    },
  });

  await notifyGroupMembers(workspaceId, creatorId, conversation, uniqueMemberIds);

  return conversation;
};

/**
 * notifyGroupMembers
 * Notifies everyone added to a new group (not the creator) and nudges
 * their conversation list to refresh live over the socket, so the group
 * shows up without waiting for their next page load. Best-effort.
 */
const notifyGroupMembers = async (workspaceId, creatorId, conversation, memberIds) => {
  try {
    const prisma = getPrisma();
    const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { name: true } });

    await notificationService.createNotificationsForUsers(workspaceId, memberIds, {
      type: 'GROUP_INVITE',
      title: `Added to "${conversation.name}"`,
      body: `${creator?.name || 'Someone'} added you to a group chat.`,
      link: '/app/chat',
      entityId: conversation.id,
    });

    memberIds.forEach((userId) => emitToUser(userId, 'conversation:new', { conversationId: conversation.id }));
  } catch (err) {
    console.error('Failed to notify new group members:', err.message);
  }
};

/**
 * updateConversationName
 * Renames a custom group (any current member may rename it, matching
 * WhatsApp's default "everyone can edit group info" behaviour — this app
 * has no group-admin concept to restrict it further). Not available for
 * the default Team Chat or DIRECT conversations, neither of which have an
 * editable "name" in the UI.
 */
const updateConversationName = async (conversationId, userId, workspaceId, name) => {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Group name is required');
  }

  const conversation = await accessConversation(conversationId, userId, workspaceId);
  if (conversation.type !== 'GROUP' || conversation.isDefault) {
    throw new Error('Only custom groups can be renamed');
  }

  const prisma = getPrisma();
  const updated = await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { name: trimmedName },
  });

  try {
    const participants = await prisma.chatParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    participants.forEach((p) =>
      emitToUser(p.userId, 'conversation:renamed', { conversationId, name: trimmedName }),
    );
  } catch (err) {
    console.error('Failed to broadcast group rename:', err.message);
  }

  return updated;
};

/**
 * getMessages
 * Cursor-paginated message history (newest page first, ascending order
 * within the page for straightforward rendering).
 */
const getMessages = async (conversationId, userId, workspaceId, { before, limit } = {}) => {
  await accessConversation(conversationId, userId, workspaceId);
  const prisma = getPrisma();

  const take = Math.min(Number(limit) || MESSAGE_PAGE_SIZE, 100);

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: { sender: { select: senderSelect } },
  });

  return messages.reverse();
};

/**
 * sendMessage
 * Persists a message and bumps the conversation's lastMessageAt so
 * conversation lists sort by recency. `content` is a plain string for a
 * text-only message; pass an options object instead ({ content, attachment,
 * isForwarded }) to attach a single already-uploaded image (see
 * sendAttachmentHandler, which uploads to Cloudinary before calling this) or
 * to mark the message as forwarded from elsewhere (see forwardMessages,
 * which reuses this same function for each target conversation). A message
 * needs a non-empty `content` OR an attachment — an image with no caption is
 * fine, but neither present is not a message.
 */
const sendMessage = async (conversationId, userId, workspaceId, contentOrOptions) => {
  const { content, attachment, isForwarded } =
    typeof contentOrOptions === 'string'
      ? { content: contentOrOptions, attachment: null, isForwarded: false }
      : (contentOrOptions || {});

  const trimmed = String(content || '').trim();
  if (!trimmed && !attachment) {
    throw new Error('Message content is required');
  }
  if (trimmed.length > 4000) {
    throw new Error('Message is too long (max 4000 characters)');
  }

  const conversation = await accessConversation(conversationId, userId, workspaceId);
  const prisma = getPrisma();

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: trimmed,
        attachmentUrl: attachment?.url || null,
        attachmentType: attachment?.type || null,
        attachmentName: attachment?.name || null,
        isForwarded: !!isForwarded,
      },
      include: { sender: { select: senderSelect } },
    }),
    prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
    prisma.chatParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  await notifyDirectMessage(workspaceId, conversation, message);

  return message;
};

/**
 * notifyDirectMessage
 * Notifies the other side of a 1:1 conversation about a new message. The
 * workspace-wide Team Chat is intentionally excluded — a notification per
 * message there would spam everyone every time anyone posts. Best-effort:
 * a notification failure shouldn't fail the message send.
 */
const notifyDirectMessage = async (workspaceId, conversation, message) => {
  if (conversation.type !== 'DIRECT') return;

  try {
    const prisma = getPrisma();
    const participants = await prisma.chatParticipant.findMany({
      where: { conversationId: conversation.id, userId: { not: message.senderId } },
      select: { userId: true },
    });

    await notificationService.createNotificationsForUsers(
      workspaceId,
      participants.map((p) => p.userId),
      {
        type: 'CHAT_MESSAGE',
        title: message.sender?.name || 'New message',
        body: message.content
          ? message.content.slice(0, 140)
          : message.attachmentType?.startsWith('image/') ? '📷 Photo' : '📎 File',
        link: '/app/chat',
        entityId: conversation.id,
      },
    );
  } catch (err) {
    console.error('Failed to notify direct message recipient:', err.message);
  }
};

/**
 * deleteMessages
 * Permanently deletes one or more of the caller's own messages from a
 * conversation — mirrors clearConversationMessages' "this is shared,
 * server-stored history" stance (see that function's comment): there's no
 * per-user "delete for me" here, only "delete for everyone", and only for
 * messages the caller actually sent. All-or-nothing: if any requested id
 * isn't found in this conversation or wasn't sent by the caller, nothing is
 * deleted — the client is expected to only ever offer this action for the
 * caller's own messages, so hitting this is a sign of a stale selection
 * rather than something to silently partial-apply.
 */
const deleteMessages = async (conversationId, userId, workspaceId, messageIds) => {
  await accessConversation(conversationId, userId, workspaceId);
  const prisma = getPrisma();

  const ids = Array.from(new Set(messageIds || []));
  if (ids.length === 0) {
    throw new Error('No messages selected');
  }

  const messages = await prisma.chatMessage.findMany({
    where: { id: { in: ids }, conversationId },
    select: { id: true, senderId: true, attachmentUrl: true, attachmentType: true },
  });

  if (messages.length !== ids.length) {
    throw new Error('One or more messages were not found in this conversation');
  }
  if (messages.some((m) => m.senderId !== userId)) {
    throw new Error('You can only delete your own messages');
  }

  await prisma.chatMessage.deleteMany({ where: { id: { in: ids } } });
  destroyMessageAttachments(messages);

  // The conversation list's preview/sort order is driven by the stored
  // lastMessageAt column (bumped on every send), not recomputed on read —
  // so a deletion has to recompute it from whatever's left, same as
  // clearConversationMessages resets it to null when everything's gone.
  const latest = await prisma.chatMessage.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: latest?.createdAt || null },
  });

  try {
    const participants = await prisma.chatParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    participants.forEach((p) =>
      emitToUser(p.userId, 'message:deleted', { conversationId, messageIds: ids }),
    );
  } catch (err) {
    console.error('Failed to broadcast message deletion:', err.message);
  }

  return true;
};

/**
 * forwardMessages
 * Copies the content/attachment of one or more messages the caller can see
 * in `sourceConversationId` into one or more target conversations, as brand
 * new messages sent by the caller (not moved — the originals are untouched).
 * Built on top of sendMessage so each forwarded copy gets the same
 * lastMessageAt bump, read-cursor update, and direct-message notification a
 * normal send would, plus `isForwarded: true` so the client can label it.
 * Returns the created messages, in (target, then original selection) order.
 */
const forwardMessages = async (sourceConversationId, userId, workspaceId, messageIds, targetConversationIds) => {
  await accessConversation(sourceConversationId, userId, workspaceId);
  const prisma = getPrisma();

  const ids = Array.from(new Set(messageIds || []));
  const targetIds = Array.from(new Set(targetConversationIds || []));
  if (ids.length === 0) throw new Error('No messages selected');
  if (targetIds.length === 0) throw new Error('No conversation selected to forward to');

  const found = await prisma.chatMessage.findMany({
    where: { id: { in: ids }, conversationId: sourceConversationId },
    select: { id: true, content: true, attachmentUrl: true, attachmentType: true, attachmentName: true },
  });
  if (found.length !== ids.length) {
    throw new Error('One or more messages were not found in this conversation');
  }
  // Preserve the order the caller selected them in, not the DB's return order.
  const byId = new Map(found.map((m) => [m.id, m]));
  const orderedMessages = ids.map((id) => byId.get(id));

  const created = [];
  for (const targetId of targetIds) {
    for (const message of orderedMessages) {
      const sent = await sendMessage(targetId, userId, workspaceId, {
        content: message.content,
        attachment: message.attachmentUrl
          ? { url: message.attachmentUrl, type: message.attachmentType, name: message.attachmentName }
          : null,
        isForwarded: true,
      });
      created.push(sent);
    }
  }

  return created;
};

/**
 * markConversationRead
 * Advances the caller's read cursor to now, and tells the other
 * participant(s) live over the socket — that's what flips a sent message's
 * ticks from delivered (grey) to read (blue) on their screen without them
 * needing to refresh.
 */
const markConversationRead = async (conversationId, userId, workspaceId) => {
  await accessConversation(conversationId, userId, workspaceId);
  const prisma = getPrisma();

  const readAt = new Date();
  await prisma.chatParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: readAt },
  });

  const otherParticipants = await prisma.chatParticipant.findMany({
    where: { conversationId, userId: { not: userId } },
    select: { userId: true },
  });
  otherParticipants.forEach((p) =>
    emitToUser(p.userId, 'conversation:read', { conversationId, userId, readAt }),
  );

  return { readAt };
};

/**
 * clearConversationMessages
 * Wipes every message in a conversation for all participants — this is a
 * shared, server-stored history (unlike WhatsApp's per-device local
 * storage), so there's no way to clear it for just the caller without
 * either hiding history from everyone else too or adding a per-user
 * "cleared before" cursor. We go with the straightforward, honest option:
 * clearing really deletes it, for everyone, and every other participant's
 * open thread is told to blank out live. Not available on the default
 * Team Chat — nuking a workspace-wide channel's history for everyone is
 * too destructive to leave a single click away.
 */
const clearConversationMessages = async (conversationId, userId, workspaceId) => {
  const conversation = await accessConversation(conversationId, userId, workspaceId);
  if (conversation.isDefault) {
    throw new Error('Team Chat cannot be cleared');
  }

  const prisma = getPrisma();
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId, attachmentUrl: { not: null } },
    select: { attachmentUrl: true, attachmentType: true },
  });

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { conversationId } }),
    prisma.chatConversation.update({ where: { id: conversationId }, data: { lastMessageAt: null } }),
  ]);
  destroyMessageAttachments(messages);

  try {
    const participants = await prisma.chatParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    participants.forEach((p) => emitToUser(p.userId, 'conversation:cleared', { conversationId }));
  } catch (err) {
    console.error('Failed to broadcast chat clear:', err.message);
  }

  return true;
};

/**
 * leaveConversation
 * Removes the caller as a participant — for a custom GROUP this is "leave
 * group": the conversation stays for whoever's left, and if leaving empties
 * it entirely, the now-orphaned conversation and its messages are deleted
 * too rather than left behind forever.
 *
 * For a DIRECT conversation this is "delete chat", and a DIRECT chat is
 * inherently two-party — there's no "whoever's left" to keep it alive for.
 * So instead of just dropping the caller's own ChatParticipant row (which
 * would leave a broken, un-named ghost conversation behind for the other
 * person — their `otherParticipants` list would come up empty, showing
 * "Direct Message" with no avatar), the whole conversation and its messages
 * are deleted outright. That also matches what the client's confirm dialog
 * already promises: "if they message you again, it'll start fresh" — via
 * getOrCreateDirectConversation finding nothing and creating a new one.
 * Not available on the default Team Chat, which every workspace member is
 * expected to have access to.
 */
const leaveConversation = async (conversationId, userId, workspaceId) => {
  const conversation = await accessConversation(conversationId, userId, workspaceId);
  if (conversation.isDefault) {
    throw new Error('Team Chat cannot be left');
  }

  const prisma = getPrisma();

  if (conversation.type === 'DIRECT') {
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId, attachmentUrl: { not: null } },
      select: { attachmentUrl: true, attachmentType: true },
    });
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { conversationId } }),
      prisma.chatConversation.delete({ where: { id: conversationId } }),
    ]);
    destroyMessageAttachments(messages);
    return true;
  }

  await prisma.chatParticipant.delete({
    where: { conversationId_userId: { conversationId, userId } },
  });

  const remaining = await prisma.chatParticipant.count({ where: { conversationId } });
  if (remaining === 0) {
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId, attachmentUrl: { not: null } },
      select: { attachmentUrl: true, attachmentType: true },
    });
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { conversationId } }),
      prisma.chatConversation.delete({ where: { id: conversationId } }),
    ]);
    destroyMessageAttachments(messages);
  }

  return true;
};

module.exports = {
  ensureTeamChannel,
  accessConversation,
  listConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  updateConversationName,
  getMessages,
  sendMessage,
  deleteMessages,
  forwardMessages,
  markConversationRead,
  clearConversationMessages,
  leaveConversation,
};
