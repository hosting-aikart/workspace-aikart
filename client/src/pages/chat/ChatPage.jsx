import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import NewGroupModal from './components/NewGroupModal';
import { useChat } from './hooks/useChat';

export default function ChatPage() {
  const {
    conversations,
    conversationsLoading,
    activeId,
    messages,
    messagesLoading,
    onlineUserIds,
    typingUserIds,
    error,
    setError,
    selectConversation,
    sendMessage,
    sendImage,
    notifyTyping,
    startDirectConversation,
    createGroupConversation,
    renameGroup,
    clearChat,
    leaveChat,
    deleteMessages,
    forwardMessages,
    currentUserId,
  } = useChat();

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Arriving from elsewhere (e.g. the Directory page's "message" icon) with
  // a conversation to jump straight to — open it once, then drop the state
  // so a refresh/back-navigation doesn't keep re-triggering it.
  useEffect(() => {
    const openConversationId = location.state?.openConversationId;
    if (!openConversationId) return;
    selectConversation(openConversationId);
    setMobileShowThread(true);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const handleSelect = (id) => {
    selectConversation(id);
    setMobileShowThread(true);
  };

  const handleSelectMember = async (userId) => {
    await startDirectConversation(userId);
    setMobileShowThread(true);
  };

  const handleCreateGroup = async (name, memberIds) => {
    await createGroupConversation(name, memberIds);
    setShowNewGroup(false);
    setMobileShowThread(true);
  };

  const handleLeaveChat = async (conversationId) => {
    await leaveChat(conversationId);
    setMobileShowThread(false);
  };

  return (
    <div className="chat-page">
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }} onClick={() => setError('')}>
          {error}
        </div>
      )}

      <div className="chat-shell">
        <div className={`chat-sidebar-wrap ${mobileShowThread ? 'hide-mobile' : ''}`}>
          <ConversationList
            conversations={conversations}
            loading={conversationsLoading}
            activeId={activeId}
            currentUserId={currentUserId}
            onSelect={handleSelect}
            onSelectMember={handleSelectMember}
            onNewGroup={() => setShowNewGroup(true)}
            onlineUserIds={onlineUserIds}
          />
        </div>

        <div className={`chat-thread-wrap ${mobileShowThread ? '' : 'hide-mobile'}`}>
          <MessageThread
            conversation={activeConversation}
            messages={messages}
            loading={messagesLoading}
            currentUserId={currentUserId}
            onlineUserIds={onlineUserIds}
            typingUserIds={typingUserIds}
            onSend={(content) => sendMessage(activeId, content)}
            onSendImage={(file, caption) => sendImage(activeId, file, caption)}
            onTyping={() => notifyTyping(activeId)}
            onBack={() => setMobileShowThread(false)}
            onRenameGroup={renameGroup}
            onClearChat={clearChat}
            onLeaveChat={handleLeaveChat}
            onDeleteMessages={(messageIds) => deleteMessages(activeId, messageIds)}
            onForwardMessages={(messageIds, targetConversationIds) =>
              forwardMessages(activeId, messageIds, targetConversationIds)
            }
            onError={setError}
          />
        </div>
      </div>

      {showNewGroup && (
        <NewGroupModal
          currentUserId={currentUserId}
          onClose={() => setShowNewGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}
