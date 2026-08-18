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

  // Arriving from elsewhere with a conversation to jump straight to — open
  // it once, then drop the state so a refresh/back-navigation doesn't keep
  // re-triggering it. Two shapes:
  //  - openConversationId: an existing conversation (e.g. a notification
  //    click) — just select it.
  //  - startDirectWithUser: the Directory page's "Message" button, for
  //    someone who may not have a conversation yet — opens a stand-in
  //    thread instantly and creates the real one in the background (see
  //    useChat's startDirectConversation), rather than Directory waiting on
  //    that round trip before navigating here at all.
  useEffect(() => {
    const openConversationId = location.state?.openConversationId;
    const startDirectWithUser = location.state?.startDirectWithUser;
    if (!openConversationId && !startDirectWithUser) return;

    if (openConversationId) {
      selectConversation(openConversationId);
    } else {
      startDirectConversation(startDirectWithUser).catch(() => {
        // Already surfaced via the `error` state.
      });
    }
    setMobileShowThread(true);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const handleSelect = (id) => {
    selectConversation(id);
    setMobileShowThread(true);
  };

  const handleSelectMember = async (person) => {
    setMobileShowThread(true);
    try {
      await startDirectConversation(person);
    } catch {
      // Already surfaced via the `error` state — nothing more to do here.
    }
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
