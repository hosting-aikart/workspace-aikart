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
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../Header';
import { announcementsApi, Announcement } from '../../api/announcementsApi';
import { useAuth } from '../../context/AuthContext';

export const AnnouncementsComponent: React.FC = () => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const data = await announcementsApi.getAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      console.log('Failed to load announcements', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Required', 'Please fill in both title and content.');
      return;
    }
    setSubmitting(true);
    try {
      await announcementsApi.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        priority,
      });
      setShowCreateModal(false);
      setTitle('');
      setContent('');
      setPriority('NORMAL');
      fetchAnnouncements();
      Alert.alert('Success', 'Announcement published successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this announcement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await announcementsApi.deleteAnnouncement(id);
            setSelectedItem(null);
            fetchAnnouncements();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete announcement.');
          }
        },
      },
    ]);
  };

  const getPriorityBadgeStyle = (p?: string) => {
    switch (p) {
      case 'URGENT':
        return { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' };
      case 'HIGH':
        return { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' };
      default:
        return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' };
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Announcements" />

      {isManagerOrAdmin ? (
        <View style={styles.actionHeader}>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Publish Announcement</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : announcements.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="bullhorn-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>No announcements posted yet.</Text>
          <Text style={styles.emptySubtext}>Workspace updates and company notices will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAnnouncements();
          }}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const badge = getPriorityBadgeStyle(item.priority);
            return (
              <TouchableOpacity style={styles.card} onPress={() => setSelectedItem(item)}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                      {item.priority || 'NORMAL'}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardContent} numberOfLines={2}>
                  {item.content}
                </Text>

                {item.author?.name ? (
                  <Text style={styles.authorText}>Posted by {item.author.name}</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedItem} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.badge, { backgroundColor: getPriorityBadgeStyle(selectedItem?.priority).bg }]}>
                <Text style={[styles.badgeText, { color: getPriorityBadgeStyle(selectedItem?.priority).text }]}>
                  {selectedItem?.priority || 'NORMAL'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.detailTitle}>{selectedItem?.title}</Text>
              <Text style={styles.detailDate}>
                Published on {selectedItem ? new Date(selectedItem.createdAt).toLocaleString() : ''}
              </Text>
              <Text style={styles.detailContent}>{selectedItem?.content}</Text>
            </ScrollView>

            {isManagerOrAdmin && selectedItem ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(selectedItem.id)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Delete Announcement</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Publish Announcement</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Title:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Q4 All-Hands Meeting"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Priority:</Text>
            <View style={styles.priorityRow}>
              {(['NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityChip, priority === p && styles.selectedPriorityChip]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityChipText, priority === p && styles.selectedPriorityText]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Content:</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Write the full announcement message..."
              placeholderTextColor="#94A3B8"
              value={content}
              onChangeText={setContent}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Publish Announcement</Text>
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
  actionHeader: { paddingHorizontal: 16, paddingTop: 12 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 8 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  dateText: { color: '#64748B', fontSize: 12 },
  cardTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 10 },
  cardContent: { color: '#94A3B8', fontSize: 13, marginTop: 6, lineHeight: 18 },
  authorText: { color: '#818CF8', fontSize: 11, fontWeight: '600', marginTop: 10 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtext: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalHeaderTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  detailTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginTop: 8 },
  detailDate: { color: '#64748B', fontSize: 12, marginTop: 4, marginBottom: 14 },
  detailContent: { color: '#CBD5E1', fontSize: 14, lineHeight: 22 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 10 },
  deleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#0F172A', color: '#F8FAFC', padding: 12, borderRadius: 10, fontSize: 14 },
  priorityRow: { flexDirection: 'row', marginBottom: 6 },
  priorityChip: { flex: 1, paddingVertical: 8, backgroundColor: '#0F172A', borderRadius: 8, alignItems: 'center', marginRight: 6 },
  selectedPriorityChip: { backgroundColor: '#6366F1' },
  priorityChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  selectedPriorityText: { color: '#FFFFFF' },
  submitBtn: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 18 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
