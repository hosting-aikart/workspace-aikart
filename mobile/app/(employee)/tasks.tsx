import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { tasksApi } from '../../src/api/tasksApi';
import { Task, TaskStatus } from '../../src/types';

const STATUS_FILTERS: { label: string; value: TaskStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Iterate', value: 'ITERATE' },
  { label: 'Done', value: 'DONE' },
];

export default function EmployeeTasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = async () => {
    try {
      const data = await tasksApi.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (taskId: string, currentStatus: TaskStatus) => {
    const nextStatusMap: Record<TaskStatus, TaskStatus> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      ITERATE: 'IN_PROGRESS',
      DONE: 'TODO',
    };
    const nextStatus = nextStatusMap[currentStatus];

    try {
      await tasksApi.updateTaskStatus(taskId, nextStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update task status');
    }
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const filteredTasks = selectedFilter === 'ALL'
    ? safeTasks
    : safeTasks.filter((t) => t && t.status === selectedFilter);

  const getStatusBadgeType = (status: TaskStatus) => {
    switch (status) {
      case 'DONE':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'ITERATE':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <LoadingScreen message="Fetching tasks..." />;
  }

  return (
    <View style={styles.container}>
      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setSelectedFilter(f.value)}
            style={[styles.filterChip, selectedFilter === f.value ? styles.filterChipActive : null]}
          >
            <Text style={[styles.filterText, selectedFilter === f.value ? styles.filterTextActive : null]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
        ListEmptyComponent={<EmptyState title="No Tasks Found" subtitle="No tasks match the selected filter." />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{item.title}</Text>
              <Badge label={item.status} type={getStatusBadgeType(item.status)} />
            </View>

            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

            <View style={styles.footerRow}>
              <Badge label={`Priority: ${item.priority}`} type={item.priority === 'URGENT' ? 'danger' : 'warning'} />
              
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleUpdateStatus(item.id, item.status)}
              >
                <Text style={styles.actionBtnText}>
                  {item.status === 'DONE' ? 'Reopen' : 'Advance Status'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600',
  },
});
