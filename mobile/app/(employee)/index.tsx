import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { attendanceApi } from '../../src/api/attendanceApi';
import { tasksApi } from '../../src/api/tasksApi';
import { meetingsApi } from '../../src/api/meetingsApi';
import { Attendance, Task, Meeting } from '../../src/types';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const loadData = async () => {
    try {
      const [todayAtt, taskList, meetingList] = await Promise.all([
        attendanceApi.getToday().catch(() => null),
        tasksApi.getTasks().catch(() => []),
        meetingsApi.getMeetings().catch(() => []),
      ]);
      setAttendance(todayAtt);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setMeetings(Array.isArray(meetingList) ? meetingList : []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeMeetings = Array.isArray(meetings) ? meetings : [];

  const activeTasks = safeTasks.filter((t) => t && t.status !== 'DONE');
  const upcomingMeetings = safeMeetings.filter((m) => m && m.status === 'UPCOMING');

  const getAttendanceBadgeType = () => {
    switch (attendance?.status) {
      case 'WORKING':
        return 'success';
      case 'PAUSED':
        return 'warning';
      case 'CHECKED_OUT':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
    >
      <View style={styles.greetingHeader}>
        <Text style={styles.welcomeTitle}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.name || 'Employee'}</Text>
        <Text style={styles.roleSubtext}>{user?.position || user?.role}</Text>
      </View>

      {/* Today's Attendance Status Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionTitle}>Today's Attendance</Text>
          <Badge label={attendance?.status || 'NOT_STARTED'} type={getAttendanceBadgeType()} />
        </View>

        <Text style={styles.timeDisplay}>
          {attendance?.totalSeconds
            ? `${Math.floor(attendance.totalSeconds / 3600)}h ${Math.floor((attendance.totalSeconds % 3600) / 60)}m`
            : '0h 0m'}
        </Text>
      </Card>

      {/* Metrics Row */}
      <View style={styles.statsGrid}>
        <Card style={styles.statBox}>
          <Text style={styles.statNumber}>{activeTasks.length}</Text>
          <Text style={styles.statLabel}>Pending Tasks</Text>
        </Card>

        <Card style={styles.statBox}>
          <Text style={styles.statNumber}>{upcomingMeetings.length}</Text>
          <Text style={styles.statLabel}>Meetings Today</Text>
        </Card>
      </View>

      {/* Priority Tasks Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Assigned Tasks</Text>
      </View>

      {activeTasks.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No pending tasks assigned to you 🎉</Text>
        </Card>
      ) : (
        activeTasks.slice(0, 3).map((task) => (
          <Card key={task.id}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.itemTitle}>{task.title}</Text>
              <Badge label={task.priority} type={task.priority === 'URGENT' ? 'danger' : 'warning'} />
            </View>
            {task.description ? <Text style={styles.itemSubtitle}>{task.description}</Text> : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
  },
  greetingHeader: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  nameText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  roleSubtext: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  timeDisplay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 0.48,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366F1',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    flex: 1,
    marginRight: 8,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
  },
});
