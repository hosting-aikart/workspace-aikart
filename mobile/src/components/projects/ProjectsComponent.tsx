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
import { projectsApi } from '../../api/projectsApi';
import { adminApi } from '../../api/adminApi';
import { Project, User } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const ProjectsComponent: React.FC = () => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('PLANNING');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await projectsApi.getProjects();
      setProjects(data);
    } catch (err) {
      console.log('Failed to fetch projects', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a project name.');
      return;
    }
    setSubmitting(true);
    try {
      await projectsApi.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        status: status as any,
        priority: priority as any,
      });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      fetchProjects();
      Alert.alert('Success', 'Project created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <View style={styles.container}>
      <Header title="Projects" />

      <View style={styles.topBar}>
        {isManagerOrAdmin ? (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create Project</Text>
          </TouchableOpacity>
        ) : null}

        {/* Search */}
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {(['ALL', 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'] as const).map((st) => (
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
      ) : filteredProjects.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="folder-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>No projects found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchProjects();
          }}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const progress = typeof item.progress === 'number' ? item.progress : 0;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{item.status || 'PLANNING'}</Text>
                  </View>
                </View>

                {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressVal}>{progress}%</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
                  </View>
                </View>

                {item.manager?.name ? (
                  <Text style={styles.managerText}>Manager: {item.manager.name}</Text>
                ) : null}
              </View>
            );
          }}
        />
      )}

      {/* Create Project Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Project</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.label}>Project Name *:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. AIKart Mobile App Release"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Description:</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Key goals and scope of work..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.label}>Status:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chip, status === st && styles.selectedChip]}
                    onPress={() => setStatus(st)}
                  >
                    <Text style={[styles.chipText, status === st && styles.selectedChipText]}>
                      {st.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleCreateProject}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Create Project</Text>
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
  statusBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { color: '#818CF8', fontSize: 10, fontWeight: '800' },
  descText: { color: '#94A3B8', fontSize: 13, marginTop: 6, lineHeight: 18 },
  progressSection: { marginTop: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  progressVal: { color: '#818CF8', fontSize: 11, fontWeight: '700' },
  track: { height: 6, backgroundColor: '#0F172A', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#6366F1' },
  managerText: { color: '#64748B', fontSize: 11, marginTop: 10 },
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
  submitBtn: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 18 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
