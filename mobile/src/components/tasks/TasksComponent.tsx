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
import { tasksApi } from '../../api/tasksApi';
import { adminApi } from '../../api/adminApi';
import { Task, TaskStatus, User } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const TasksComponent: React.FC = () => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Members for assignment
  const [members, setMembers] = useState<User[]>([]);

  const fetchTasks = async () => {
    try {
      const data = await tasksApi.getTasks();
      setTasks(data);
    } catch (err) {
      console.log('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const data = await adminApi.getEmployees();
      setMembers(data);
    } catch (err) {
      console.log('Failed to fetch members for task assignment', err);
    }
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }
    setSubmitting(true);
    try {
      await tasksApi.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        status: taskStatus,
        priority: priority as any,
        assignedToId: assignedToId || undefined,
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setAssignedToId('');
      fetchTasks();
      Alert.alert('Success', 'Task created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await tasksApi.updateTaskStatus(taskId, newStatus);
      fetchTasks();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to update task status.');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <View style={styles.container}>
      <Header title="Tasks" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Task</Text>
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {(['ALL', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.filterPill, statusFilter === st && styles.activeFilterPill]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[styles.filterPillText, statusFilter === st && styles.activeFilterPillText]}>
                {st.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>No tasks found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchTasks();
          }}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'DONE'
                      ? styles.completedBadge
                      : item.status === 'IN_PROGRESS'
                      ? styles.inProgressBadge
                      : styles.todoBadge,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>

              {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}

              {item.assignedTo?.name ? (
                <Text style={styles.assigneeText}>Assigned to: {item.assignedTo.name}</Text>
              ) : null}

              <View style={styles.statusActionsRow}>
                <Text style={styles.quickLabel}>Change Status:</Text>
                {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.smallStatusBtn, item.status === st && styles.activeSmallStatusBtn]}
                    onPress={() => handleUpdateStatus(item.id, st)}
                  >
                    <Text style={styles.smallStatusText}>{st.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
      )}

      {/* Create Task Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Task</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Task Title *:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Implement Socket.IO reconnect logic"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description:</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Task details and expectations..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.label}>Priority:</Text>
              <View style={{ flexDirection: 'row' }}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[styles.chip, priority === pr && styles.selectedChip]}
                    onPress={() => setPriority(pr)}
                  >
                    <Text style={[styles.chipText, priority === pr && styles.selectedChipText]}>
                      {pr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Assign to Employee:</Text>
              {members.map((m) => {
                const selected = assignedToId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberRow, selected && styles.selectedMemberRow]}
                    onPress={() => setAssignedToId(m.id)}
                  >
                    <MaterialCommunityIcons
                      name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color={selected ? '#6366F1' : '#64748B'}
                    />
                    <Text style={styles.memberName}>{m.name} ({m.role})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleCreateTask}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Create Task</Text>
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
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', paddingVertical: 12, borderRadius: 12, marginBottom: 10 },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14, marginLeft: 6 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, backgroundColor: '#1E293B', marginRight: 6 },
  activeFilterPill: { backgroundColor: '#6366F1' },
  filterPillText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  activeFilterPillText: { color: '#FFFFFF' },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  todoBadge: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  inProgressBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  completedBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusBadgeText: { color: '#818CF8', fontSize: 10, fontWeight: '800' },
  descText: { color: '#94A3B8', fontSize: 13, marginTop: 6, lineHeight: 18 },
  assigneeText: { color: '#818CF8', fontSize: 12, marginTop: 8, fontWeight: '600' },
  statusActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)' },
  quickLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', marginRight: 6 },
  smallStatusBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#0F172A', marginRight: 4 },
  activeSmallStatusBtn: { backgroundColor: '#6366F1' },
  smallStatusText: { color: '#CBD5E1', fontSize: 10, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#0F172A', color: '#F8FAFC', padding: 12, borderRadius: 10, fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#0F172A', marginRight: 6, marginBottom: 6 },
  selectedChip: { backgroundColor: '#6366F1' },
  chipText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  selectedChipText: { color: '#FFFFFF' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  selectedMemberRow: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  memberName: { color: '#F8FAFC', fontSize: 13, marginLeft: 10 },
  submitBtn: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 18 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
