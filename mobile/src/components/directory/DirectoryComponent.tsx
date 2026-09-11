import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../Header';
import { adminApi } from '../../api/adminApi';
import { chatApi } from '../../api/chatApi';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const DirectoryComponent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const rolePrefix = user?.role === 'ADMIN' ? '/(admin)' : user?.role === 'MANAGER' ? '/(manager)' : '/(employee)';

  const fetchDirectory = async () => {
    try {
      const data = await adminApi.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      console.log('Failed to fetch directory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  const filteredEmployees = employees.filter((e) => {
    const query = search.toLowerCase();
    return (
      (e.name && e.name.toLowerCase().includes(query)) ||
      (e.email && e.email.toLowerCase().includes(query)) ||
      (e.role && e.role.toLowerCase().includes(query)) ||
      (e.department?.name && e.department.name.toLowerCase().includes(query))
    );
  });

  const handleMessage = async (recipientId: string) => {
    try {
      await chatApi.startDirectConversation(recipientId);
      router.push(`${rolePrefix}/chat` as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start chat');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Workspace Directory" />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, department, role..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : filteredEmployees.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="account-search-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>No employees found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name || 'Workspace Member'}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{item.role}</Text>
                  </View>
                </View>

                <Text style={styles.email}>{item.email}</Text>
                {item.department?.name ? (
                  <Text style={styles.dept}>{item.department.name}</Text>
                ) : null}
              </View>

              <View style={styles.actions}>
                {item.id !== user?.id ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleMessage(item.id)}
                  >
                    <MaterialCommunityIcons name="forum-outline" size={18} color="#6366F1" />
                  </TouchableOpacity>
                ) : null}

                {item.phone ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  >
                    <MaterialCommunityIcons name="phone-outline" size={18} color="#10B981" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  info: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', flex: 1 },
  roleBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  roleBadgeText: { color: '#818CF8', fontSize: 10, fontWeight: '700' },
  email: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  dept: { color: '#64748B', fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 12 },
});
