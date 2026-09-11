import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../Header';
import { emailApi } from '../../api/emailApi';
import { EmailMessage } from '../../types';

type EmailFolder = 'INBOX' | 'SENT' | 'DRAFTS' | 'COMPOSE';

export const EmailComponent: React.FC = () => {
  const [activeFolder, setActiveFolder] = useState<EmailFolder>('INBOX');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Email Detail Modal State
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Compose / Reply / Forward Form State
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Fetch emails based on active tab
  const fetchEmails = useCallback(async () => {
    if (activeFolder === 'COMPOSE') return;
    setLoading(true);
    try {
      let res: { messages: EmailMessage[] };
      if (searchQuery.trim()) {
        res = await emailApi.searchEmails(searchQuery.trim());
      } else if (activeFolder === 'INBOX') {
        res = await emailApi.getInbox();
      } else if (activeFolder === 'SENT') {
        res = await emailApi.getSent();
      } else {
        res = await emailApi.getDrafts();
      }
      setEmails(res.messages || []);
    } catch (err: any) {
      console.log(`[EmailComponent] Error loading ${activeFolder}:`, err.message);
      setEmails([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFolder, searchQuery]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmails();
  };

  const handleOpenDetail = async (emailItem: EmailMessage) => {
    setSelectedEmail(emailItem);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const fullDetail = await emailApi.getMessageDetail(emailItem.id);
      setSelectedEmail(fullDetail);
    } catch (err) {
      console.log('Failed to load full detail for email:', emailItem.id);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      Alert.alert('Required Fields', 'Please fill in recipient email, subject, and body.');
      return;
    }

    setSending(true);
    try {
      await emailApi.sendEmail({
        to: recipient.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
      Alert.alert('Success', 'Email sent successfully via Workspace Email integration.');
      setRecipient('');
      setSubject('');
      setBody('');
      setActiveFolder('SENT');
    } catch (err: any) {
      Alert.alert('Send Failed', err.response?.data?.message || err.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim() && !body.trim()) {
      Alert.alert('Required', 'Please enter a subject or body to save draft.');
      return;
    }
    setSavingDraft(true);
    try {
      await emailApi.saveDraft({
        to: recipient.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
      Alert.alert('Draft Saved', 'Your email draft was saved successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleInitiateReply = (emailItem: EmailMessage) => {
    setShowDetailModal(false);
    setRecipient(emailItem.from || '');
    setSubject(`Re: ${emailItem.subject || ''}`);
    setBody(`\n\n--- Original Message ---\nFrom: ${emailItem.from}\nDate: ${emailItem.date || ''}\nSubject: ${emailItem.subject}\n\n${emailItem.body || emailItem.snippet || ''}`);
    setActiveFolder('COMPOSE');
  };

  const handleInitiateForward = (emailItem: EmailMessage) => {
    setShowDetailModal(false);
    setRecipient('');
    setSubject(`Fwd: ${emailItem.subject || ''}`);
    setBody(`\n\n--- Forwarded Message ---\nFrom: ${emailItem.from}\nDate: ${emailItem.date || ''}\nSubject: ${emailItem.subject}\n\n${emailItem.body || emailItem.snippet || ''}`);
    setActiveFolder('COMPOSE');
  };

  const renderEmailItem = ({ item }: { item: EmailMessage }) => {
    const displayUser = activeFolder === 'SENT' ? `To: ${item.to || 'Recipient'}` : item.from || 'Workspace User';
    const initial = displayUser.replace(/^To:\s*/i, '').charAt(0).toUpperCase() || 'E';
    const dateFormatted = item.date
      ? new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
      : '';

    return (
      <TouchableOpacity style={styles.emailCard} onPress={() => handleOpenDetail(item)}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.emailCardBody}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.senderText} numberOfLines={1}>
              {displayUser}
            </Text>
            <Text style={styles.dateText}>{dateFormatted}</Text>
          </View>

          <Text style={[styles.subjectText, item.isRead === false && styles.unreadSubject]} numberOfLines={1}>
            {item.subject || '(No Subject)'}
          </Text>

          <Text style={styles.snippetText} numberOfLines={2}>
            {item.snippet || item.body || 'No preview available'}
          </Text>

          {item.hasAttachments || (item.attachments && item.attachments.length > 0) ? (
            <View style={styles.attachmentBadge}>
              <MaterialCommunityIcons name="paperclip" size={12} color="#818CF8" />
              <Text style={styles.attachmentBadgeText}>Attachment</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Workspace Email" />

      {/* Folders & Tabs Header */}
      <View style={styles.tabsContainer}>
        {(
          [
            { id: 'INBOX', label: 'Inbox', icon: 'inbox' },
            { id: 'SENT', label: 'Sent', icon: 'send' },
            { id: 'DRAFTS', label: 'Drafts', icon: 'file-document-outline' },
            { id: 'COMPOSE', label: 'Compose', icon: 'pencil-plus-outline' },
          ] as const
        ).map((tab) => {
          const isActive = activeFolder === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.activeTabBtn]}
              onPress={() => {
                setActiveFolder(tab.id);
                setSearchQuery('');
              }}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={16}
                color={isActive ? '#FFFFFF' : '#94A3B8'}
              />
              <Text style={[styles.tabBtnText, isActive && styles.activeTabBtnText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main View Area */}
      {activeFolder === 'COMPOSE' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.composeCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="email-fast-outline" size={24} color="#6366F1" />
              <Text style={styles.cardTitle}>Compose Workspace Email</Text>
            </View>

            <Text style={styles.label}>Recipient Email (To):</Text>
            <TextInput
              style={styles.input}
              placeholder="colleague@aikart.com"
              placeholderTextColor="#94A3B8"
              value={recipient}
              onChangeText={setRecipient}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Subject:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Project Status & Deliverables Update"
              placeholderTextColor="#94A3B8"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.label}>Message Body:</Text>
            <TextInput
              style={[styles.input, { height: 160, textAlignVertical: 'top' }]}
              placeholder="Type your email body message here..."
              placeholderTextColor="#94A3B8"
              value={body}
              onChangeText={setBody}
              multiline
            />

            <View style={styles.composeActionsRow}>
              <TouchableOpacity
                style={[styles.draftBtn, savingDraft && { opacity: 0.6 }]}
                onPress={handleSaveDraft}
                disabled={savingDraft || sending}
              >
                {savingDraft ? (
                  <ActivityIndicator size="small" color="#CBD5E1" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="file-document-edit-outline" size={16} color="#CBD5E1" />
                    <Text style={styles.draftBtnText}>Save Draft</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSendEmail}
                disabled={sending || savingDraft}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.sendBtnText}>Send Email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Search Bar & Refresh Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${activeFolder.toLowerCase()} emails...`}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={fetchEmails}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={fetchEmails}>
              <MaterialCommunityIcons name="refresh" size={20} color="#818CF8" />
            </TouchableOpacity>
          </View>

          {/* List Content */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading {activeFolder.toLowerCase()} emails...</Text>
            </View>
          ) : emails.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="email-outline" size={64} color="#475569" />
              <Text style={styles.emptyTitle}>No {activeFolder.toLowerCase()} emails</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No emails matching your search query.'
                  : `Your ${activeFolder.toLowerCase()} folder is currently empty.`}
              </Text>
              <TouchableOpacity style={styles.composeNewBtn} onPress={() => setActiveFolder('COMPOSE')}>
                <MaterialCommunityIcons name="pencil-plus-outline" size={16} color="#FFFFFF" />
                <Text style={styles.composeNewBtnText}>Compose Email</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={emails}
              keyExtractor={(item, index) => item.id || `email-${index}`}
              renderItem={renderEmailItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
              contentContainerStyle={{ padding: 16 }}
            />
          )}
        </View>
      )}

      {/* Email Detail View Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalBackBtn}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#F8FAFC" />
                <Text style={styles.modalBackText}>Back to List</Text>
              </TouchableOpacity>

              <View style={styles.modalActionGroup}>
                {selectedEmail ? (
                  <>
                    <TouchableOpacity style={styles.headerActionBtn} onPress={() => handleInitiateReply(selectedEmail)}>
                      <MaterialCommunityIcons name="reply" size={18} color="#818CF8" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerActionBtn} onPress={() => handleInitiateForward(selectedEmail)}>
                      <MaterialCommunityIcons name="share" size={18} color="#818CF8" />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>

            {detailLoading ? (
              <View style={styles.modalLoadingWrap}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Fetching email details...</Text>
              </View>
            ) : selectedEmail ? (
              <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.detailSubject}>{selectedEmail.subject || '(No Subject)'}</Text>

                <View style={styles.metaBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>From:</Text>
                    <Text style={styles.metaValue}>{selectedEmail.from || 'Unknown'}</Text>
                  </View>
                  {selectedEmail.to ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>To:</Text>
                      <Text style={styles.metaValue}>{selectedEmail.to}</Text>
                    </View>
                  ) : null}
                  {selectedEmail.date ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Date:</Text>
                      <Text style={styles.metaValue}>
                        {new Date(selectedEmail.date).toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.bodyDivider} />

                <Text style={styles.detailBody}>
                  {selectedEmail.body || selectedEmail.snippet || 'No message content available.'}
                </Text>

                {selectedEmail.attachments && selectedEmail.attachments.length > 0 ? (
                  <View style={styles.attachmentSection}>
                    <Text style={styles.attachmentSectionTitle}>ATTACHMENTS ({selectedEmail.attachments.length})</Text>
                    {selectedEmail.attachments.map((att, idx) => (
                      <View key={att.id || idx} style={styles.attachmentItemCard}>
                        <MaterialCommunityIcons name="file-outline" size={20} color="#818CF8" />
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {att.filename}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.bottomDetailActions}>
                  <TouchableOpacity style={styles.replyBtn} onPress={() => handleInitiateReply(selectedEmail)}>
                    <MaterialCommunityIcons name="reply" size={16} color="#FFFFFF" />
                    <Text style={styles.replyBtnText}>Reply</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.forwardBtn} onPress={() => handleInitiateForward(selectedEmail)}>
                    <MaterialCommunityIcons name="share" size={16} color="#818CF8" />
                    <Text style={styles.forwardBtnText}>Forward</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabBtn: { backgroundColor: '#6366F1' },
  tabBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  activeTabBtnText: { color: '#FFFFFF' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 13, marginLeft: 6 },
  refreshBtn: {
    padding: 10,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginLeft: 8,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  composeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700', marginLeft: 10 },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#0F172A', color: '#F8FAFC', padding: 12, borderRadius: 10, fontSize: 14 },
  composeActionsRow: { flexDirection: 'row', marginTop: 20 },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 8,
  },
  draftBtnText: { color: '#CBD5E1', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  sendBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  loadingText: { color: '#94A3B8', fontSize: 14, marginTop: 12 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  composeNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  composeNewBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  emailCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#818CF8', fontWeight: '700', fontSize: 16 },
  emailCardBody: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  senderText: { color: '#F8FAFC', fontSize: 14, fontWeight: '700', flex: 1 },
  dateText: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  subjectText: { color: '#CBD5E1', fontSize: 13, fontWeight: '500', marginTop: 3 },
  unreadSubject: { color: '#FFFFFF', fontWeight: '800' },
  snippetText: { color: '#94A3B8', fontSize: 12, marginTop: 4, lineHeight: 16 },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  attachmentBadgeText: { color: '#818CF8', fontSize: 10, fontWeight: '600', marginLeft: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0F172A', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '92%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalBackBtn: { flexDirection: 'row', alignItems: 'center' },
  modalBackText: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', marginLeft: 6 },
  modalActionGroup: { flexDirection: 'row' },
  headerActionBtn: { padding: 8, backgroundColor: '#1E293B', borderRadius: 8, marginLeft: 8 },
  modalLoadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { flex: 1 },
  detailSubject: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  metaBox: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { color: '#64748B', fontSize: 12, fontWeight: '700', width: 50 },
  metaValue: { color: '#CBD5E1', fontSize: 12, flex: 1 },
  bodyDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginVertical: 16 },
  detailBody: { color: '#F8FAFC', fontSize: 14, lineHeight: 22 },
  attachmentSection: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  attachmentSectionTitle: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  attachmentItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 10, borderRadius: 8, marginBottom: 6 },
  attachmentName: { color: '#CBD5E1', fontSize: 13, marginLeft: 8, flex: 1 },
  bottomDetailActions: { flexDirection: 'row', marginTop: 28 },
  replyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 8,
  },
  replyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  forwardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 10,
  },
  forwardBtnText: { color: '#818CF8', fontWeight: '700', fontSize: 14, marginLeft: 6 },
});
