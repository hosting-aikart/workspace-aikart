import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../Header';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/ChatContext';
import { chatApi, Conversation, ChatMessage } from '../../api/chatApi';
import { User } from '../../types';
import { getSocket } from '../../utils/socket';

export const ChatScreenComponent: React.FC = () => {
  const { user } = useAuth();
  const {
    conversations,
    conversationsLoading,
    onlineUserIds,
    loadConversations,
    setActiveConversationId,
  } = useChatContext();

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Modals & Member selection
  const [showNewDirectModal, setShowNewDirectModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [renameInput, setRenameInput] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Fetch workspace members for new conversation modals (using /api/me/directory for all roles)
  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await chatApi.getDirectory();
      setWorkspaceMembers(data.filter((m: any) => m.id !== user?.id));
    } catch (err) {
      console.log('Failed to fetch members for chat', err);
    } finally {
      setMembersLoading(false);
    }
  };

  // Extract display name for conversation (Direct chat shows colleague name, Group shows group name)
  const getConvName = (conv: Conversation): string => {
    if (conv.type === 'GROUP') {
      return conv.name || 'Group Chat';
    }
    // For direct chats: check participants array
    if (conv.participants && Array.isArray(conv.participants)) {
      const other = conv.participants.find((p: any) => {
        const pId = p.userId || p.id || p.user?.id;
        return pId && pId !== user?.id;
      });
      if (other) {
        const u = (other as any).user || other;
        if (u.name) return u.name;
        if (u.email) return u.email;
      }
    }
    if (conv.name && conv.name !== 'Direct Message' && conv.name !== 'Direct Chat') {
      return conv.name;
    }
    return 'Direct Chat';
  };

  // Open conversation and auto-scroll to bottom
  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setActiveConversationId(conv.id);
    setMessagesLoading(true);

    try {
      const msgs = await chatApi.getMessages(conv.id);
      setMessages(msgs);
      // Join conversation room in socket
      const socket = getSocket();
      socket?.emit('conversation:join', conv.id);

      // Auto-scroll to bottom after loading messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 150);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  // Socket message listeners for active thread
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeConv) return;

    const handleMessage = (msg: ChatMessage) => {
      if (msg.conversationId === activeConv.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId === activeConv.id && data.userId !== user?.id) {
        setTypingUsers((prev) =>
          data.isTyping ? Array.from(new Set([...prev, data.userId])) : prev.filter((id) => id !== data.userId)
        );
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('message:new', handleMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('message:new', handleMessage);
      socket.off('typing', handleTyping);
      socket.emit('conversation:leave', activeConv.id);
    };
  }, [activeConv?.id, user?.id]);

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || !activeConv) return;
    const content = inputText.trim();
    setInputText('');

    try {
      const newMsg = await chatApi.sendMessage(activeConv.id, content);
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      // Emit via socket for real-time delivery
      const socket = getSocket();
      socket?.emit('message:send', { conversationId: activeConv.id, content });
    } catch (err: any) {
      Alert.alert('Send Error', err.message || 'Failed to send message');
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (activeConv) {
      const socket = getSocket();
      socket?.emit('typing', { conversationId: activeConv.id, isTyping: text.length > 0 });
    }
  };

  // Start Direct Chat
  const handleStartDirect = async (memberId: string) => {
    setShowNewDirectModal(false);
    try {
      const conv = await chatApi.startDirectConversation(memberId);
      await loadConversations();
      openConversation(conv);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start direct conversation');
    }
  };

  // Create Group Chat
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Required', 'Please enter a group name');
      return;
    }
    if (selectedMemberIds.length === 0) {
      Alert.alert('Required', 'Please select at least 1 group member');
      return;
    }
    setShowNewGroupModal(false);
    try {
      const conv = await chatApi.createGroupConversation(groupName.trim(), selectedMemberIds);
      setGroupName('');
      setSelectedMemberIds([]);
      await loadConversations();
      openConversation(conv);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create group');
    }
  };

  // Rename Group
  const handleRenameGroup = async () => {
    if (!renameInput.trim() || !activeConv) return;
    try {
      const updated = await chatApi.renameGroup(activeConv.id, renameInput.trim());
      setActiveConv(updated);
      await loadConversations();
      Alert.alert('Success', 'Group name updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to rename group');
    }
  };

  // Add members to existing group
  const handleAddMembersToGroup = async () => {
    if (addMemberIds.length === 0 || !activeConv) return;
    try {
      const updated = await chatApi.addParticipants(activeConv.id, addMemberIds);
      setActiveConv(updated);
      setAddMemberIds([]);
      setShowGroupSettingsModal(false);
      await loadConversations();
      Alert.alert('Success', 'New members added to group.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add members');
    }
  };

  const isConvOnline = (conv: Conversation) => {
    if (conv.type === 'GROUP') return false;
    const other = conv.participants?.find((p: any) => {
      const pId = p.userId || p.id || p.user?.id;
      return pId !== user?.id;
    });
    const otherId = (other as any)?.userId || (other as any)?.user?.id || (other as any)?.id;
    return otherId ? onlineUserIds.includes(otherId) : false;
  };

  return (
    <View style={styles.container}>
      <Header title={activeConv ? getConvName(activeConv) : 'Team Chat'} showBack={!!activeConv} />

      {!activeConv ? (
        // ── Conversation List View ──────────────────────────────────────────
        <View style={styles.listContainer}>
          <View style={styles.actionHeader}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                fetchMembers();
                setShowNewDirectModal(true);
              }}
            >
              <MaterialCommunityIcons name="message-plus" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>New Direct Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.groupBtn]}
              onPress={() => {
                fetchMembers();
                setShowNewGroupModal(true);
              }}
            >
              <MaterialCommunityIcons name="account-group-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>New Group</Text>
            </TouchableOpacity>
          </View>

          {conversationsLoading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
          ) : conversations.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="forum-outline" size={64} color="#64748B" />
              <Text style={styles.emptyText}>No conversations yet.</Text>
              <Text style={styles.emptySubtext}>Start a direct message or group chat with your team.</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const online = isConvOnline(item);
                const title = getConvName(item);
                return (
                  <TouchableOpacity style={styles.convCard} onPress={() => openConversation(item)}>
                    <View style={styles.avatarWrap}>
                      <View style={[styles.avatar, item.type === 'GROUP' && styles.groupAvatar]}>
                        <MaterialCommunityIcons
                          name={item.type === 'GROUP' ? 'account-group' : 'account'}
                          size={22}
                          color="#FFFFFF"
                        />
                      </View>
                      {online ? <View style={styles.onlineBadge} /> : null}
                    </View>

                    <View style={styles.convInfo}>
                      <View style={styles.convTitleRow}>
                        <Text style={styles.convTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        {item.lastMessageAt ? (
                          <Text style={styles.convTime}>
                            {new Date(item.lastMessageAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.convSubRow}>
                        <Text style={styles.lastMsgText} numberOfLines={1}>
                          {item.lastMessage?.content || 'No messages yet'}
                        </Text>
                        {item.unreadCount && item.unreadCount > 0 ? (
                          <View style={styles.unreadCountBadge}>
                            <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      ) : (
        // ── Active Message Thread View ───────────────────────────────────────
        <KeyboardAvoidingView
          style={styles.threadContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Thread Subheader */}
          <View style={styles.threadHeader}>
            <TouchableOpacity onPress={() => setActiveConv(null)} style={styles.backBtn}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="#818CF8" />
              <Text style={styles.backText}>All Chats</Text>
            </TouchableOpacity>

            {typingUsers.length > 0 ? (
              <Text style={styles.typingText}>Someone is typing...</Text>
            ) : null}

            {activeConv.type === 'GROUP' && !activeConv.isDefault ? (
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => {
                  fetchMembers();
                  setRenameInput(activeConv.name || '');
                  setShowGroupSettingsModal(true);
                }}
              >
                <MaterialCommunityIcons name="cog-outline" size={20} color="#818CF8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {messagesLoading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const isOwn = item.senderId === user?.id || item.sender?.id === user?.id;
                return (
                  <View style={[styles.msgBubble, isOwn ? styles.ownMsg : styles.otherMsg]}>
                    {!isOwn && item.sender?.name ? (
                      <Text style={styles.senderName}>{item.sender.name}</Text>
                    ) : null}
                    <Text style={[styles.msgContent, isOwn ? styles.ownMsgContent : styles.otherMsgContent]}>
                      {item.content}
                    </Text>
                    <Text style={styles.msgTime}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              }}
            />
          )}

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.disabledSendBtn]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* New Direct Chat Modal */}
      <Modal visible={showNewDirectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Direct Message</Text>
              <TouchableOpacity onPress={() => setShowNewDirectModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {membersLoading ? (
              <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 30 }} />
            ) : workspaceMembers.length === 0 ? (
              <Text style={styles.noMembersText}>No workspace members found.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 350 }}>
                {workspaceMembers.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.memberItem}
                    onPress={() => handleStartDirect(m.id)}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {m.name ? m.name.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.memberName}>{m.name || 'Employee'}</Text>
                      <Text style={styles.memberSub}>{m.email} • {m.role}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* New Group Modal */}
      <Modal visible={showNewGroupModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group Chat</Text>
              <TouchableOpacity onPress={() => setShowNewGroupModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.groupInput}
              placeholder="Group Name (e.g. Project Alpha)"
              placeholderTextColor="#94A3B8"
              value={groupName}
              onChangeText={setGroupName}
            />

            <Text style={styles.selectLabel}>Select Members:</Text>
            {membersLoading ? (
              <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 220 }}>
                {workspaceMembers.map((m) => {
                  const selected = selectedMemberIds.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberItem, selected && styles.selectedMemberItem]}
                      onPress={() => {
                        setSelectedMemberIds((prev) =>
                          selected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        );
                      }}
                    >
                      <MaterialCommunityIcons
                        name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                        size={22}
                        color={selected ? '#6366F1' : '#64748B'}
                      />
                      <Text style={[styles.memberName, { marginLeft: 12 }]}>{m.name || m.email} ({m.role})</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.createGroupBtn} onPress={handleCreateGroup}>
              <Text style={styles.createGroupBtnText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Group Settings / Add Members Modal */}
      <Modal visible={showGroupSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Settings</Text>
              <TouchableOpacity onPress={() => setShowGroupSettingsModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.selectLabel}>Rename Group:</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TextInput
                style={[styles.groupInput, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                placeholder="New Group Name"
                placeholderTextColor="#94A3B8"
                value={renameInput}
                onChangeText={setRenameInput}
              />
              <TouchableOpacity style={styles.saveRenameBtn} onPress={handleRenameGroup}>
                <Text style={styles.saveRenameText}>Save</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.selectLabel}>Add New Members:</Text>
            <ScrollView style={{ maxHeight: 180 }}>
              {workspaceMembers
                .filter((m) => !activeConv?.participants?.some((p: any) => (p.userId || p.id || p.user?.id) === m.id))
                .map((m) => {
                  const selected = addMemberIds.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberItem, selected && styles.selectedMemberItem]}
                      onPress={() => {
                        setAddMemberIds((prev) =>
                          selected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        );
                      }}
                    >
                      <MaterialCommunityIcons
                        name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                        size={22}
                        color={selected ? '#6366F1' : '#64748B'}
                      />
                      <Text style={[styles.memberName, { marginLeft: 12 }]}>{m.name || m.email}</Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.createGroupBtn, addMemberIds.length === 0 && { opacity: 0.5 }]}
              onPress={handleAddMembersToGroup}
              disabled={addMemberIds.length === 0}
            >
              <Text style={styles.createGroupBtnText}>Add Selected Members</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  listContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  actionHeader: { flexDirection: 'row', marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 6,
  },
  groupBtn: { backgroundColor: '#4F46E5', marginRight: 0, marginLeft: 6 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatar: { backgroundColor: '#818CF8' },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  convInfo: { flex: 1, marginLeft: 12 },
  convTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', flex: 1 },
  convTime: { color: '#64748B', fontSize: 11, marginLeft: 8 },
  convSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  lastMsgText: { color: '#94A3B8', fontSize: 13, flex: 1 },
  unreadCountBadge: { backgroundColor: '#6366F1', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 },
  unreadCountText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtext: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 30 },
  threadContainer: { flex: 1 },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#818CF8', fontWeight: '600', fontSize: 14 },
  typingText: { color: '#10B981', fontSize: 12, fontStyle: 'italic' },
  settingsBtn: { padding: 4 },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  ownMsg: { alignSelf: 'flex-end', backgroundColor: '#6366F1', borderBottomRightRadius: 2 },
  otherMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  senderName: { color: '#818CF8', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  msgContent: { fontSize: 14, lineHeight: 20 },
  ownMsgContent: { color: '#FFFFFF' },
  otherMsgContent: { color: '#F1F5F9' },
  msgTime: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderRadius: 20,
  },
  sendBtn: {
    backgroundColor: '#6366F1',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  disabledSendBtn: { backgroundColor: '#475569' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  noMembersText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  selectedMemberItem: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: '#FFFFFF', fontWeight: '700' },
  memberName: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  memberSub: { color: '#94A3B8', fontSize: 12 },
  groupInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  saveRenameBtn: { backgroundColor: '#6366F1', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  saveRenameText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  selectLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  createGroupBtn: { backgroundColor: '#6366F1', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  createGroupBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
