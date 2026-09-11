import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../Header';
import { meetingsApi } from '../../api/meetingsApi';
import { adminApi } from '../../api/adminApi';
import { Meeting, ParticipantResponseStatus, User } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const MeetingsComponent: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agenda, setAgenda] = useState('');
  const [meetingType, setMeetingType] = useState<'SCHEDULED' | 'INSTANT'>('SCHEDULED');
  const [externalEmails, setExternalEmails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Participant selection
  const [members, setMembers] = useState<User[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  const fetchMeetings = async () => {
    try {
      const data = await meetingsApi.getMeetings();
      setMeetings(data);
    } catch (err) {
      console.log('Failed to fetch meetings', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const openCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const data = await adminApi.getEmployees();
      setMembers(data.filter((m) => m.id !== user?.id));
    } catch (err) {
      console.log('Failed to fetch members for meeting creation', err);
    }
  };

  const handleCreateMeeting = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a meeting title.');
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const startTime = now.toISOString();
      const endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

      const emails = externalEmails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      await meetingsApi.createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        agenda: agenda.trim() || undefined,
        meetingType,
        startTime,
        endTime,
        participantIds: selectedParticipantIds,
        externalEmails: emails.length > 0 ? emails : undefined,
      });

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setAgenda('');
      setExternalEmails('');
      setSelectedParticipantIds([]);
      fetchMeetings();
      Alert.alert('Success', 'Meeting created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to create meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (meeting: Meeting) => {
    try {
      let url = meeting.meetingUrl;
      if (!url) {
        url = await meetingsApi.joinMeeting(meeting.id);
      }
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Meeting Link', url);
        }
      } else {
        Alert.alert('No Video Link', 'This meeting does not have an active video link yet.');
      }
    } catch (err: any) {
      Alert.alert('Join Failed', err.response?.data?.message || err.message);
    }
  };

  const handleRespond = async (meetingId: string, status: ParticipantResponseStatus) => {
    try {
      await meetingsApi.respondToInvitation(meetingId, status);
      fetchMeetings();
      Alert.alert('Response Saved', `You have ${status.toLowerCase()} this invitation.`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (statusFilter === 'ALL') return true;
    return m.status === statusFilter;
  });

  return (
    <View style={styles.container}>
      <Header title="Meetings" />

      {/* Top Header Actions */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Meeting</Text>
        </TouchableOpacity>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.filterPill, statusFilter === st && styles.activeFilterPill]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[styles.filterPillText, statusFilter === st && styles.activeFilterPillText]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : filteredMeetings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="video-off-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>No meetings found.</Text>
          <Text style={styles.emptySubtext}>Schedule or join meetings with your team.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMeetings}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchMeetings();
          }}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={[styles.statusBadge, item.status === 'ONGOING' ? styles.ongoingBadge : styles.upcomingBadge]}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.timeText}>
                {new Date(item.startTime).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              {item.agenda ? <Text style={styles.agendaText}>Agenda: {item.agenda}</Text> : null}
              {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(item)}>
                  <MaterialCommunityIcons name="video-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.joinBtnText}>Join Meeting</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRespond(item.id, 'ACCEPTED')}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#10B981" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.declineBtn} onPress={() => handleRespond(item.id, 'DECLINED')}>
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Create Meeting Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule / Instant Meeting</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Title *:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Weekly Product Sync"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Meeting Type:</Text>
              <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                {(['SCHEDULED', 'INSTANT'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, meetingType === t && styles.selectedTypeChip]}
                    onPress={() => setMeetingType(t)}
                  >
                    <Text style={[styles.typeChipText, meetingType === t && styles.selectedTypeText]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Agenda:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Discuss Q4 goals & roadmaps"
                placeholderTextColor="#94A3B8"
                value={agenda}
                onChangeText={setAgenda}
              />

              <Text style={styles.label}>Description:</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="Additional notes for participants..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.label}>External Invite Emails (Comma-separated):</Text>
              <TextInput
                style={styles.input}
                placeholder="client@external.com, partner@company.com"
                placeholderTextColor="#94A3B8"
                value={externalEmails}
                onChangeText={setExternalEmails}
              />

              <Text style={styles.label}>Select Workspace Participants:</Text>
              {members.map((m) => {
                const selected = selectedParticipantIds.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberRow, selected && styles.selectedMemberRow]}
                    onPress={() =>
                      setSelectedParticipantIds((prev) =>
                        selected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                      )
                    }
                  >
                    <MaterialCommunityIcons
                      name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={20}
                      color={selected ? '#6366F1' : '#64748B'}
                    />
                    <Text style={styles.memberName}>{m.name} ({m.email})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleCreateMeeting}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Create Meeting</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBar: { paddingHorizontal: 16, paddingTop: 12 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  filterScroll: { flexDirection: 'row' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1E293B', marginRight: 8 },
  activeFilterPill: { backgroundColor: '#6366F1' },
  filterPillText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  activeFilterPillText: { color: '#FFFFFF' },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  upcomingBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  ongoingBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusBadgeText: { color: '#818CF8', fontSize: 10, fontWeight: '800' },
  timeText: { color: '#818CF8', fontSize: 12, marginTop: 4, fontWeight: '600' },
  agendaText: { color: '#CBD5E1', fontSize: 13, marginTop: 8 },
  descText: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  joinBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 10 },
  joinBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  acceptBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  declineBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtext: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#0F172A', color: '#F8FAFC', padding: 12, borderRadius: 10, fontSize: 14 },
  typeChip: { flex: 1, paddingVertical: 8, backgroundColor: '#0F172A', borderRadius: 8, alignItems: 'center', marginRight: 6 },
  selectedTypeChip: { backgroundColor: '#6366F1' },
  typeChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  selectedTypeText: { color: '#FFFFFF' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  selectedMemberRow: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  memberName: { color: '#F8FAFC', fontSize: 13, marginLeft: 10 },
  submitBtn: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 18 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
