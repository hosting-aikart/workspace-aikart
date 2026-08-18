import { useEffect, useMemo, useRef, useState } from 'react';
import { useDirectory } from '../hooks/useDirectory';
import Avatar from '../../../components/common/Avatar';
import NewChatModal from './NewChatModal';

function formatPreviewTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const GroupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function ConversationList({
  conversations,
  loading,
  activeId,
  currentUserId,
  onSelect,
  onSelectMember,
  onNewGroup,
  onlineUserIds,
}) {
  const { users: directory, loading: directoryLoading } = useDirectory();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const menuRef = useRef(null);

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

  // Colleagues who don't already have a DIRECT conversation in the list —
  // clicking one (here, in the inline list below, or from the "New Chat"
  // modal) starts that conversation immediately. Everyone with an existing
  // conversation (DM or otherwise) is reached by clicking their entry
  // above instead.
  const colleagues = useMemo(() => {
    const directPartnerIds = new Set(
      conversations
        .filter((c) => c.type === 'DIRECT')
        .map((c) => c.participants?.[0]?.id)
        .filter(Boolean),
    );
    return directory.filter((u) => u.id !== currentUserId && !directPartnerIds.has(u.id));
  }, [directory, conversations, currentUserId]);

  const handleSelectNewChatMember = (person) => {
    setShowNewChat(false);
    onSelectMember(person);
  };

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h3 className="chat-sidebar-title">Messages</h3>
        <div ref={menuRef} className="chat-thread-menu-wrap">
          <button
            className="btn btn-primary btn-sm btn-icon"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Start a new chat or group"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            title="New chat or group"
          >
            <PlusIcon />
          </button>

          {menuOpen && (
            <div className="chat-thread-menu">
              <button
                className="chat-thread-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setShowNewChat(true);
                }}
              >
                <ChatBubbleIcon />
                New Chat
              </button>
              <button
                className="chat-thread-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onNewGroup();
                }}
              >
                <GroupIcon />
                Create Group
              </button>
            </div>
          )}
        </div>
      </div>

      {showNewChat && (
        <NewChatModal
          colleagues={colleagues}
          loading={directoryLoading}
          onClose={() => setShowNewChat(false)}
          onSelectMember={handleSelectNewChatMember}
        />
      )}

      <div className="chat-conversation-list">
        {loading ? (
          <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div className="skeleton skeleton-avatar" />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '45%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {conversations.map((conv) => {
              const isGroup = conv.type === 'GROUP';
              const other = !isGroup ? conv.participants?.[0] : null;
              const isOnline = other && onlineUserIds.includes(other.id);
              const previewSender = conv.lastMessage?.sender?.name ? `${conv.lastMessage.sender.name.split(' ')[0]}: ` : '';
              const previewText = conv.lastMessage?.content || (conv.lastMessage?.attachmentUrl ? '📷 Photo' : '');

              return (
                <button
                  key={conv.id}
                  className={`chat-conversation-item ${activeId === conv.id ? 'chat-conversation-item-active' : ''}`}
                  onClick={() => onSelect(conv.id)}
                >
                  <div className="avatar-wrapper">
                    {isGroup ? (
                      <div className="avatar avatar-sm" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                        <GroupIcon />
                      </div>
                    ) : (
                      <Avatar name={other?.name} photo={other?.profilePhoto} size="sm" />
                    )}
                    {isOnline && <span className="avatar-status online" />}
                  </div>

                  <div className="chat-conversation-info">
                    <div className="chat-conversation-top">
                      <span className="chat-conversation-name">{conv.name}</span>
                      <span className="chat-conversation-time">{formatPreviewTime(conv.lastMessageAt)}</span>
                    </div>
                    <div className="chat-conversation-bottom">
                      <span className="chat-conversation-preview">
                        {conv.lastMessage ? `${previewSender}${previewText}` : 'No messages yet'}
                      </span>
                      {conv.unreadCount > 0 && <span className="nav-badge chat-unread-badge">{conv.unreadCount}</span>}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Colleagues you haven't messaged yet are reached through New
                Chat now, not listed inline here — this list is only actual
                conversations. */}
            {conversations.length === 0 && (
              <div className="chat-empty-list">
                <p className="text-secondary text-sm">
                  No conversations yet — tap <strong>+</strong> and choose New Chat to message a colleague.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
