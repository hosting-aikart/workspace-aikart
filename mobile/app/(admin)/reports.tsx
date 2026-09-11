import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../src/components/Header';
import { adminApi, AdminStatsData } from '../../src/api/adminApi';
import { projectsApi } from '../../src/api/projectsApi';
import { tasksApi } from '../../src/api/tasksApi';

export default function AdminReportsScreen() {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [statsData, projectsData, tasksData] = await Promise.all([
          adminApi.getStats(),
          projectsApi.getProjects(),
          tasksApi.getTasks(),
        ]);
        setStats(statsData);
        setProjectCount(projectsData.length);
        setTaskCount(tasksData.length);
      } catch (err) {
        console.log('Failed to fetch admin reports', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Reports & Analytics" />

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>WORKSPACE OVERVIEW</Text>

          <View style={styles.grid}>
            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="account-group" size={24} color="#6366F1" />
              <Text style={styles.metricVal}>{stats?.totalEmployees || 0}</Text>
              <Text style={styles.metricLabel}>Total Employees</Text>
            </View>

            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="office-building" size={24} color="#818CF8" />
              <Text style={styles.metricVal}>{stats?.totalDepartments || 0}</Text>
              <Text style={styles.metricLabel}>Departments</Text>
            </View>

            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="folder-text-outline" size={24} color="#10B981" />
              <Text style={styles.metricVal}>{projectCount}</Text>
              <Text style={styles.metricLabel}>Active Projects</Text>
            </View>

            <View style={styles.metricCard}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={24} color="#F59E0B" />
              <Text style={styles.metricVal}>{taskCount}</Text>
              <Text style={styles.metricLabel}>Total Tasks</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Workforce Breakdown</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Active Employees</Text>
              <Text style={styles.rowValue}>{stats?.activeEmployees || 0}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Managers</Text>
              <Text style={styles.rowValue}>{stats?.managerCount || 0}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  metricCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricVal: { color: '#F8FAFC', fontSize: 26, fontWeight: '800', marginTop: 8 },
  metricLabel: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  cardTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: '#94A3B8', fontSize: 14 },
  rowValue: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginVertical: 4 },
});
