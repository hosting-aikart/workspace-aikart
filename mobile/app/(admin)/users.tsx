import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { Header } from '../../src/components/Header';
import { adminApi } from '../../src/api/adminApi';
import { User } from '../../src/types';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getEmployees();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingScreen message="Loading workspace employees..." />;
  }

  return (
    <View style={styles.container}>
      <Header title="Employees" />
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />}
        ListEmptyComponent={<EmptyState title="No Employees Found" subtitle="No users registered in this workspace." />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{item.name || 'User'}</Text>
              <Badge label={item.role} type={item.role === 'ADMIN' ? 'purple' : item.role === 'MANAGER' ? 'info' : 'default'} />
            </View>

            <Text style={styles.email}>{item.email}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Dept: {item.department?.name || 'General'}</Text>
              <Text style={styles.meta}>Status: {item.isActive !== false ? 'Active' : 'Disabled'}</Text>
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
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  email: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  meta: {
    fontSize: 12,
    color: '#64748B',
  },
});
