import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../Header';
import { notificationsApi } from '../../api/notificationsApi';
import { Notification } from '../../types';

export const NotificationsComponent: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.log('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      fetchNotifications();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      fetchNotifications();
      Alert.alert('Success', 'All notifications marked as read.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Notifications" />

      {notifications.length > 0 ? (
        <View style={styles.actionHeader}>
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <MaterialCommunityIcons name="check-all" size={18} color="#6366F1" />
            <Text style={styles.markAllBtnText}>Mark All Read</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="bell-off-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>No notifications yet.</Text>
          <Text style={styles.emptySubtext}>You will receive alerts here when assigned tasks or meeting invites arrive.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchNotifications();
          }}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.unreadCard]}
              onPress={() => handleMarkRead(item.id)}
            >
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name={item.isRead ? 'bell-outline' : 'bell-ring-outline'}
                  size={20}
                  color={item.isRead ? '#94A3B8' : '#6366F1'}
                />
              </View>

              <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.dateText}>
                  {new Date(item.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              {!item.isRead ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  actionHeader: { paddingHorizontal: 16, paddingTop: 12, alignItems: 'flex-end' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  markAllBtnText: { color: '#818CF8', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  unreadCard: { borderColor: 'rgba(99, 102, 241, 0.4)', backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  title: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  message: { color: '#CBD5E1', fontSize: 13, marginTop: 2, lineHeight: 18 },
  dateText: { color: '#64748B', fontSize: 11, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1', marginLeft: 8 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtext: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },
});
