import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { managerApi } from '../../src/api/managerApi';
import { User } from '../../src/types';

export default function ManagerTeamScreen() {
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeam = async () => {
    try {
      const data = await managerApi.getTeam();
      setTeam(data);
    } catch (err) {
      console.error('Failed to fetch team:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTeam();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTeam();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingScreen message="Loading team members..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={team}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        ListEmptyComponent={<EmptyState title="No Team Members" subtitle="You have no assigned direct reports." />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{item.name || 'Employee'}</Text>
              <Badge label={item.role} type="info" />
            </View>

            <Text style={styles.email}>{item.email}</Text>
            {item.position ? <Text style={styles.meta}>Position: {item.position}</Text> : null}
            {item.phone ? <Text style={styles.meta}>Phone: {item.phone}</Text> : null}
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
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: '#64748B',
  },
});
