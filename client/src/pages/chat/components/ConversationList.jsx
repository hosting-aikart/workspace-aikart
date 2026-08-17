import { useMemo } from 'react';
import { useDirectory } from '../hooks/useDirectory';
import Avatar from '../../../components/common/Avatar';

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

  // Colleagues who don't already have a DIRECT conversation in the list —
  // clicking one starts that conversation immediately, no "new chat" modal
  // needed. Everyone with an existing conversation (DM or otherwise) is
  // reached by clicking their entry above instead.
  const colleagues = useMemo(() => {
    const directPartnerIds = new Set(
      conversations
        .filter((c) => c.type === 'DIRECT')
        .map((c) => c.participants?.[0]?.id)
        .filter(Boolean),
    );
    return directory.filter((u) => u.id !== currentUserId && !directPartnerIds.has(u.id));
  }, [directory, conversations, currentUserId]);

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h3 className="chat-sidebar-title">Messages</h3>
        <button
          className="btn btn-primary btn-sm btn-icon"
          onClick={onNewGroup}
          aria-label="Create a new group"
          title="New group"
        >
          <GroupIcon />
        </button>
      </div>

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

            {!directoryLoading && colleagues.length > 0 && (
              <>
                <p className="chat-list-section-label">Colleagues</p>
                {colleagues.map((person) => {
                  const isOnline = onlineUserIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      className="chat-conversation-item"
                      onClick={() => onSelectMember(person.id)}
                    >
                      <div className="avatar-wrapper">
                        <Avatar name={person.name} photo={person.profilePhoto} size="sm" />
                        {isOnline && <span className="avatar-status online" />}
                      </div>
                      <div className="chat-conversation-info">
                        <div className="chat-conversation-top">
                          <span className="chat-conversation-name">{person.name}</span>
                        </div>
                        <div className="chat-conversation-bottom">
                          <span className="chat-conversation-preview">{person.position || person.email}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {conversations.length === 0 && colleagues.length === 0 && !directoryLoading && (
              <div className="chat-empty-list">
                <p className="text-secondary text-sm">No conversations yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
