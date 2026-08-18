import { useEffect, useRef, useState } from 'react';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import Avatar from '../../../components/common/Avatar';
import GroupInfoModal from './GroupInfoModal';
import MessageContextMenu from './MessageContextMenu';
import ForwardModal from './ForwardModal';
import UserProfileModal from './UserProfileModal';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(iso) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * MessageTicks
 * WhatsApp-style read receipt for our own messages:
 *  - 'sent'      — one grey tick. Saved on the server. In a DIRECT chat the
 *                  other person's app hasn't necessarily seen it yet
 *                  (they're offline); in a GROUP this is the only state we
 *                  compute at all (see below).
 *  - 'delivered' — two grey ticks (DIRECT only). They're online right now,
 *                  so their app has it, they just haven't opened this chat.
 *  - 'read'      — two blue ticks (DIRECT only). They've actually opened
 *                  the chat past this message (their read cursor moved
 *                  beyond it).
 * There's no separate "delivered" timestamp stored anywhere — it's derived
 * live from presence, same as the green dot elsewhere in the app, so it can
 * only reflect *current* online state rather than "was online at send time".
 * Good enough for the same reason WhatsApp's own ticks are just an
 * approximation of what actually happened on the other end.
 *
 * Group chats only ever get 'sent' — "read by everyone" is a different,
 * harder problem (whose read cursor counts? all of them? most?) that we're
 * not taking on here, but that's no reason to withhold the unambiguous
 * baseline confirmation that the message actually reached the server.
 */
function MessageTicks({ status }) {
  const double = status === 'delivered' || status === 'read';
  return (
    <svg
      width="15"
      height="11"
      viewBox="0 0 20 14"
      fill="none"
      className={`chat-tick ${status === 'read' ? 'chat-tick-read' : ''}`}
      aria-label={status}
    >
      <path d="M1 7.5l4 4L13 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {double && (
        <path d="M7 7.5l4 4L19 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

// Kept in sync with the server's multer config in chat.routes.js — checking
// client-side too avoids a wasted round trip for an obviously-bad file.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

// Document types the "Document" attach option accepts — mirrors the
// DOCUMENT_MIME_TYPES/DOCUMENT_EXTENSIONS whitelist in chat.routes.js.
// Checked by extension as a fallback since some browser/OS combos hand
// these generic or empty MIME types (.docx/.xlsx are technically zip
// containers under the hood).
const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'];

const isAllowedDocument = (file) => {
  if (DOCUMENT_MIME_TYPES.includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return DOCUMENT_EXTENSIONS.includes(ext);
};

// Colored badge shown on a non-image attachment bubble, keyed by extension —
// same idea as the little file-type icons WhatsApp/Slack show, without
// needing a distinct icon asset per format.
const DOCUMENT_KIND_STYLES = {
  pdf: { label: 'PDF', color: '#DC2626' },
  doc: { label: 'DOC', color: '#2563EB' },
  docx: { label: 'DOC', color: '#2563EB' },
  xls: { label: 'XLS', color: '#16A34A' },
  xlsx: { label: 'XLS', color: '#16A34A' },
  csv: { label: 'CSV', color: '#16A34A' },
  ppt: { label: 'PPT', color: '#EA580C' },
  pptx: { label: 'PPT', color: '#EA580C' },
  txt: { label: 'TXT', color: '#6B7280' },
  zip: { label: 'ZIP', color: '#7C3AED' },
};

function getDocumentKind(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  return DOCUMENT_KIND_STYLES[ext] || { label: ext ? ext.slice(0, 4).toUpperCase() : 'FILE', color: '#6B7280' };
}

/**
 * FileAttachment
 * The non-image half of a message's attachment (see the image branch inline
 * in the message list below) — a WhatsApp-style document chip: a colored
 * extension badge, the original filename, and a hint that it opens in a new
 * tab. There's no stored file size to show (see attachmentUrl/Type/Name on
 * ChatMessage in schema.prisma), so the chip stays deliberately simple.
 */
function FileAttachment({ url, name }) {
  const kind = getDocumentKind(name);
  return (
    <a href={url} target="_blank" rel="noreferrer" className="chat-bubble-file-link">
      <span className="chat-bubble-file-icon" style={{ backgroundColor: kind.color }}>{kind.label}</span>
      <span className="chat-bubble-file-meta">
        <span className="chat-bubble-file-name">{name || 'File'}</span>
        <span className="chat-bubble-file-ext">Tap to open</span>
      </span>
    </a>
  );
}

export default function MessageThread({
  conversation,
  messages,
  loading,
  currentUserId,
  onlineUserIds,
  typingUserIds,
  onSend,
  onSendImage,
  onTyping,
  onBack,
  onRenameGroup,
  onClearChat,
  onLeaveChat,
  onDeleteMessages,
  onForwardMessages,
  onError,
}) {
  const [draft, setDraft] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  // Which colleague's contact-info modal is open — the DM header, or a
  // sender's name/avatar within a group chat, can both trigger this, so it
  // tracks a user id rather than a plain boolean.
  const [profileUserId, setProfileUserId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'clear' | 'leave' | null

  // ── Per-message selection (WhatsApp-style: right-click/long-press a
  //    message, or "Select messages" from the header menu) ─────────────────
  const [contextMenu, setContextMenu] = useState(null); // { x, y, message } | null
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteMessageIds, setDeleteMessageIds] = useState(null); // string[] | null — confirm-dialog target
  const [forwardTarget, setForwardTarget] = useState(null); // Message[] | null

  // Attach-menu ("+" button in the composer) — WhatsApp-style choice between
  // a photo and a document, each backed by its own hidden file input so the
  // browser's picker can be scoped to the right `accept` filter.
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const photoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  // A sentinel at the end of the list — scrollIntoView() on it is more
  // reliable than computing the container's scrollHeight ourselves (which
  // can read stale on the same tick a new message's DOM node is added).
  const bottomRef = useRef(null);
  const menuRef = useRef(null);
  const attachMenuRef = useRef(null);
  // Jump straight to the bottom (no animation) the moment a different
  // conversation opens — a smooth scroll through someone else's entire
  // history looks like a glitch. New messages arriving in the conversation
  // you're already viewing still animate in.
  const prevConversationIdRef = useRef(null);

  useEffect(() => {
    // Wait for the real history to be in — scrolling while `loading` is
    // still true jumps an empty/skeleton container and, worse, marks this
    // conversation as "already switched to" before its actual messages
    // exist. Then when they arrive a moment later, it's treated as just a
    // new message in the *same* conversation and only gets a smooth scroll
    // instead of a guaranteed instant jump — which is what made opening a
    // chat not reliably land on the latest message.
    if (loading) return;
    const isConversationSwitch = conversation?.id !== prevConversationIdRef.current;
    prevConversationIdRef.current = conversation?.id;
    bottomRef.current?.scrollIntoView({ behavior: isConversationSwitch ? 'auto' : 'smooth', block: 'end' });
  }, [conversation?.id, messages, typingUserIds, loading]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!attachMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [attachMenuOpen]);

  if (!conversation) {
    return (
      <div className="chat-thread chat-thread-empty">
        <EmptyState
          title="Select a conversation"
          description="Pick a colleague, group, or Team Chat from the left to start messaging."
        />
      </div>
    );
  }

  const isGroup = conversation.type === 'GROUP';
  const isCustomGroup = isGroup && !conversation.isDefault;
  const other = !isGroup ? conversation.participants?.[0] : null;
  const isOnline = other && onlineUserIds.includes(other.id);
  const memberCount = isGroup ? (conversation.participants?.length || 0) + 1 : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Whatever's already typed in the composer rides along as the
  // attachment's caption — no separate caption box, so sending a photo or
  // file mid-sentence just works the way it does in most chat apps. `kind`
  // is which attach-menu option was used, so e.g. a .docx picked through
  // "Photo" gets a clear error instead of silently failing on the server.
  const handleFileChange = (e, kind) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;

    if (kind === 'photo' && !file.type.startsWith('image/')) {
      onError?.('Only image files can be sent as a photo.');
      return;
    }
    if (kind === 'document' && !isAllowedDocument(file)) {
      onError?.('Unsupported document type. Try PDF, Word, Excel, PowerPoint, text, or ZIP.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      onError?.('File must be 10 MB or smaller.');
      return;
    }

    onSendImage(file, draft);
    setDraft('');
  };

  const handleConfirmAction = async () => {
    if (confirmAction === 'clear') {
      await onClearChat(conversation.id);
    } else if (confirmAction === 'leave') {
      await onLeaveChat(conversation.id);
    }
    setConfirmAction(null);
  };

  // ── Selection mode ──────────────────────────────────────────────────────
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectMode = (preselectId) => {
    setSelectMode(true);
    setSelectedIds(preselectId ? new Set([preselectId]) : new Set());
  };

  const toggleSelected = (messageId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const selectedOwnedByMe = Array.from(selectedIds).every(
    (id) => messages.find((m) => m.id === id)?.senderId === currentUserId,
  );

  // ── Per-message context menu (right-click, or the hover "⋯" button) ──────
  // Not offered on a still-sending optimistic bubble — it doesn't have a
  // server-confirmed id yet, so delete/forward would have nothing to act on.
  const openMessageMenu = (event, message) => {
    if (message.pending) return;
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, message });
  };

  const openMessageMenuFromButton = (event, message) => {
    if (message.pending) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu({ x: rect.right, y: rect.bottom + 4, message });
  };

  // ── Delete (single, from the context menu, or bulk, from the selection
  //    toolbar — both funnel through the same confirm dialog) ─────────────
  const handleConfirmDeleteMessages = async () => {
    if (!deleteMessageIds) return;
    try {
      await onDeleteMessages(deleteMessageIds);
    } catch (err) {
      onError?.(err?.response?.data?.message || 'Failed to delete message(s).');
    }
    setDeleteMessageIds(null);
    exitSelectMode();
  };

  // ── Forward (single, from the context menu, or bulk, from the selection
  //    toolbar — both open the same modal) ──────────────────────────────────
  const handleForward = async (targetConversationIds) => {
    if (!forwardTarget) return;
    await onForwardMessages(forwardTarget.map((m) => m.id), targetConversationIds);
    setForwardTarget(null);
    exitSelectMode();
  };

  let lastDay = null;

  return (
    <div className="chat-thread">
      <div className="chat-thread-header">
        {selectMode ? (
          <>
            <button className="btn btn-ghost btn-icon" onClick={exitSelectMode} aria-label="Cancel selection">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="chat-thread-title-wrap">
              <p className="chat-thread-title">{selectedIds.size} selected</p>
            </div>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setForwardTarget(messages.filter((m) => selectedIds.has(m.id)))}
              disabled={selectedIds.size === 0}
              aria-label="Forward selected messages"
              title="Forward"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" />
              </svg>
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setDeleteMessageIds(Array.from(selectedIds))}
              disabled={selectedIds.size === 0 || !selectedOwnedByMe}
              aria-label="Delete selected messages"
              title={selectedIds.size > 0 && !selectedOwnedByMe ? 'You can only delete your own messages' : 'Delete'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          </>
        ) : (
          <>
        <button className="btn btn-ghost btn-icon hide-desktop" onClick={onBack} aria-label="Back to conversations">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {isGroup ? (
          <div
            className={isCustomGroup ? 'avatar avatar-sm chat-thread-avatar-clickable' : 'avatar avatar-sm'}
            style={{ background: 'var(--color-primary)', color: '#fff' }}
            onClick={isCustomGroup ? () => setShowGroupInfo(true) : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        ) : (
          <div
            className={other?.id ? 'avatar-wrapper chat-thread-avatar-clickable' : 'avatar-wrapper'}
            onClick={other?.id ? () => setProfileUserId(other.id) : undefined}
          >
            <Avatar name={other?.name} photo={other?.profilePhoto} size="sm" />
            {isOnline && <span className="avatar-status online" />}
          </div>
        )}

        <div
          className={isCustomGroup || (!isGroup && other?.id) ? 'chat-thread-title-wrap chat-thread-title-clickable' : 'chat-thread-title-wrap'}
          onClick={isCustomGroup ? () => setShowGroupInfo(true) : !isGroup && other?.id ? () => setProfileUserId(other.id) : undefined}
          role={isCustomGroup || (!isGroup && other?.id) ? 'button' : undefined}
          tabIndex={isCustomGroup || (!isGroup && other?.id) ? 0 : undefined}
        >
          <p className="chat-thread-title">{conversation.name}</p>
          <p className="chat-thread-subtitle">
            {conversation.isDefault
              ? 'Everyone in your workspace'
              : isGroup
                ? `${memberCount} members · tap for group info`
                : other?.id
                  ? `${isOnline ? 'Online' : 'Offline'} · tap for contact info`
                  : isOnline ? 'Online' : 'Offline'}
          </p>
        </div>

        {!conversation.isDefault && !conversation.isPending && (
          <div ref={menuRef} className="chat-thread-menu-wrap">
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Chat options"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>

            {menuOpen && (
              <div className="chat-thread-menu">
                <button
                  className="chat-thread-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    enterSelectMode();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Select messages
                </button>
                <button
                  className="chat-thread-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmAction('clear');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                  Clear chat
                </button>
                <button
                  className="chat-thread-menu-item chat-thread-menu-item-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmAction('leave');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {isCustomGroup ? 'Leave group' : 'Delete chat'}
                </button>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction === 'clear'}
        title="Clear this chat?"
        description="This permanently deletes every message in this conversation for everyone in it. This can't be undone."
        confirmLabel="Clear chat"
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />

      <ConfirmDialog
        open={confirmAction === 'leave'}
        title={isCustomGroup ? 'Leave this group?' : 'Delete this chat?'}
        description={
          isCustomGroup
            ? 'You’ll be removed from this group and lose access to its messages. Other members keep the conversation.'
            : 'This removes the chat from your list. If they message you again, it’ll start fresh.'
        }
        confirmLabel={isCustomGroup ? 'Leave group' : 'Delete chat'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />

      {showGroupInfo && isCustomGroup && (
        <GroupInfoModal
          conversation={conversation}
          onClose={() => setShowGroupInfo(false)}
          onRename={(name) => onRenameGroup(conversation.id, name)}
        />
      )}

      {profileUserId && (
        <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}

      <ConfirmDialog
        open={Boolean(deleteMessageIds)}
        title={deleteMessageIds?.length > 1 ? `Delete ${deleteMessageIds.length} messages?` : 'Delete message?'}
        description="This deletes it for everyone in this conversation. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteMessageIds(null)}
        onConfirm={handleConfirmDeleteMessages}
      />

      {contextMenu && (
        <MessageContextMenu
          anchor={{ x: contextMenu.x, y: contextMenu.y }}
          message={contextMenu.message}
          isOwn={contextMenu.message.senderId === currentUserId}
          onClose={() => setContextMenu(null)}
          onCopy={() => navigator.clipboard?.writeText(contextMenu.message.content || '')}
          onForward={() => setForwardTarget([contextMenu.message])}
          onSelect={() => enterSelectMode(contextMenu.message.id)}
          onDelete={() => setDeleteMessageIds([contextMenu.message.id])}
        />
      )}

      {forwardTarget && (
        <ForwardModal
          messages={forwardTarget}
          excludeConversationId={conversation.id}
          onClose={() => setForwardTarget(null)}
          onForward={handleForward}
        />
      )}

      <div className="chat-messages">
        {loading ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: `${40 + i * 10}%` }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-secondary text-sm chat-thread-hint">
            No messages yet — say hello to {isGroup ? (conversation.isDefault ? 'the team' : 'the group') : other?.name?.split(' ')[0] || 'them'}.
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            const day = formatDayLabel(message.createdAt);
            const showDayDivider = day !== lastDay;
            lastDay = day;

            // Every own message gets at least a "sent" tick once it's
            // persisted, in any conversation type — that's just "the server
            // has it", not a claim about who's seen it, so it's unambiguous
            // even in a group. The richer delivered/read distinction only
            // gets computed for a DIRECT chat, where there's exactly one
            // other participant to check against; a group's "read by
            // everyone" state is a different, harder problem we're not
            // taking on here, so group messages stay at the baseline tick.
            let tickStatus = null;
            if (isOwn && !message.pending) {
              if (isGroup) {
                tickStatus = 'sent';
              } else {
                const otherReadAt = conversation.otherParticipantLastReadAt;
                if (otherReadAt && new Date(message.createdAt) <= new Date(otherReadAt)) {
                  tickStatus = 'read';
                } else if (other?.id && onlineUserIds.includes(other.id)) {
                  tickStatus = 'delivered';
                } else {
                  tickStatus = 'sent';
                }
              }
            }

            return (
              <div key={message.id}>
                {showDayDivider && (
                  <div className="chat-day-divider"><span>{day}</span></div>
                )}
                <div
                  className={`chat-message-row ${isOwn ? 'chat-message-own' : ''} ${selectMode ? 'chat-message-row-selectable' : ''} ${selectedIds.has(message.id) ? 'chat-message-row-selected' : ''}`}
                  onClick={selectMode ? (e) => { e.preventDefault(); toggleSelected(message.id); } : undefined}
                  onContextMenu={(e) => openMessageMenu(e, message)}
                >
                  {selectMode && (
                    <input
                      type="checkbox"
                      className="chat-message-checkbox"
                      checked={selectedIds.has(message.id)}
                      readOnly
                    />
                  )}
                  {!isOwn && isGroup && (
                    <Avatar
                      name={message.sender?.name}
                      photo={message.sender?.profilePhoto}
                      size="xs"
                      className={message.sender?.id ? 'chat-message-avatar chat-thread-avatar-clickable' : 'chat-message-avatar'}
                      onClick={message.sender?.id && !selectMode ? () => setProfileUserId(message.sender.id) : undefined}
                    />
                  )}
                  <div>
                    {!isOwn && isGroup && (
                      <p
                        className={message.sender?.id ? 'chat-message-sender chat-thread-title-clickable' : 'chat-message-sender'}
                        onClick={message.sender?.id && !selectMode ? () => setProfileUserId(message.sender.id) : undefined}
                      >
                        {message.sender?.name}
                      </p>
                    )}
                    <div className="chat-bubble-group">
                      <div
                        className={`chat-bubble ${isOwn ? 'chat-bubble-own' : ''} ${message.pending ? 'chat-bubble-pending' : ''} ${message.attachmentUrl && message.attachmentType?.startsWith('image/') ? 'chat-bubble-has-image' : ''}`}
                      >
                        {message.isForwarded && (
                          <p className="chat-bubble-forwarded-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                            </svg>
                            Forwarded
                          </p>
                        )}
                        {message.attachmentUrl && (
                          message.attachmentType?.startsWith('image/') ? (
                            <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="chat-bubble-image-link">
                              <img
                                src={message.attachmentUrl}
                                alt={message.attachmentName || 'Shared image'}
                                className="chat-bubble-image"
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <FileAttachment url={message.attachmentUrl} name={message.attachmentName} />
                          )
                        )}
                        {message.content && <span className="chat-bubble-text">{message.content}</span>}
                      </div>
                      {!selectMode && !message.pending && (
                        <button
                          type="button"
                          className="chat-message-more-btn"
                          onClick={(e) => openMessageMenuFromButton(e, message)}
                          aria-label="Message options"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className={`chat-message-time ${isOwn ? 'chat-message-time-own' : ''}`}>
                      {message.pending ? 'Sending…' : formatTime(message.createdAt)}
                      {tickStatus && <MessageTicks status={tickStatus} />}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {typingUserIds.length > 0 && (
          <div className="chat-typing-indicator">
            <span className="chat-typing-dot" />
            <span className="chat-typing-dot" />
            <span className="chat-typing-dot" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="chat-composer-file-input"
          onChange={(e) => handleFileChange(e, 'photo')}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          className="chat-composer-file-input"
          onChange={(e) => handleFileChange(e, 'document')}
        />

        <div ref={attachMenuRef} className="chat-composer-attach-wrap">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setAttachMenuOpen((open) => !open)}
            aria-label="Attach a file"
            title="Attach"
            aria-haspopup="true"
            aria-expanded={attachMenuOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {attachMenuOpen && (
            <div className="chat-composer-attach-menu">
              <button
                type="button"
                className="chat-composer-attach-item"
                onClick={() => {
                  setAttachMenuOpen(false);
                  photoInputRef.current?.click();
                }}
              >
                <span className="chat-composer-attach-icon" style={{ backgroundColor: 'var(--color-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </span>
                Photo
              </button>
              <button
                type="button"
                className="chat-composer-attach-item"
                onClick={() => {
                  setAttachMenuOpen(false);
                  documentInputRef.current?.click();
                }}
              >
                <span className="chat-composer-attach-icon" style={{ backgroundColor: 'var(--color-info)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
                  </svg>
                </span>
                Document
              </button>
            </div>
          )}
        </div>

        <textarea
          className="textarea chat-composer-input"
          placeholder={`Message ${isGroup ? conversation.name : other?.name?.split(' ')[0] || ''}…`}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onTyping();
          }}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button type="submit" className="btn btn-primary btn-icon" disabled={!draft.trim()} aria-label="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
