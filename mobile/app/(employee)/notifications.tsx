import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { notificationsApi } from '../../src/api/notificationsApi';
import { Notification } from '../../src/types';

export default function EmployeeNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (loading) {
    return <LoadingScreen message="Fetching alerts..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topActionsRow}>
        <Text style={styles.totalText}>{notifications.filter((n) => !n.isRead).length} Unread</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllBtnText}>Mark All as Read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
        ListEmptyComponent={<EmptyState title="No Alerts" subtitle="You're all caught up with your workspace notifications." />}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleMarkRead(item.id)}>
            <Card style={[styles.card, !item.isRead ? styles.unreadCard : null]}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{item.title}</Text>
                <Badge label={item.type} type={item.isRead ? 'default' : 'purple'} />
              </View>

              {item.body ? <Text style={styles.bodyText}>{item.body}</Text> : null}

              <Text style={styles.timeText}>
                {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
              </Text>
            </Card>
          </TouchableOpacity>
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
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#818CF8',
  },
  markAllBtnText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 10,
  },
  unreadCard: {
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  bodyText: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
});
