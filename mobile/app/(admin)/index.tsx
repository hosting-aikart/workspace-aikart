import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/Card';
import { adminApi, AdminStatsData } from '../../src/api/adminApi';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>System Administration</Text>
        <Text style={styles.nameText}>{user?.name || 'Administrator'}</Text>
        <Text style={styles.roleSubtext}>Workspace Analytics & Control</Text>
      </View>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalEmployees ?? '-'}</Text>
          <Text style={styles.statLabel}>Total Employees</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalDepartments ?? '-'}</Text>
          <Text style={styles.statLabel}>Departments</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.activeEmployees ?? '-'}</Text>
          <Text style={styles.statLabel}>Active Employees</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.managerCount ?? '-'}</Text>
          <Text style={styles.statLabel}>Managers</Text>
        </Card>
      </View>
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
    color: '#A855F7',
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
    color: '#A855F7',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
});
