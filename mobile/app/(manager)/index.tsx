import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/Card';
import { Header } from '../../src/components/Header';
import { managerApi, ManagerDashboardData } from '../../src/api/managerApi';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ManagerDashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await managerApi.getDashboard();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch manager dashboard:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <Header title="Manager Dashboard" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>Manager Workspace</Text>
        <Text style={styles.nameText}>{user?.name || 'Manager'}</Text>
        <Text style={styles.roleSubtext}>Team Operations & Dashboard</Text>
      </View>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.teamCount ?? '-'}</Text>
          <Text style={styles.statLabel}>Team Members</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.activeProjectsCount ?? '-'}</Text>
          <Text style={styles.statLabel}>Active Projects</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.pendingTasksCount ?? '-'}</Text>
          <Text style={styles.statLabel}>Pending Tasks</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.todayActiveAttendanceCount ?? '-'}</Text>
          <Text style={styles.statLabel}>Working Today</Text>
        </Card>
      </View>
    </ScrollView>
  </View>
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
  header: {
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
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
});
