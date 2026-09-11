import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../Header';
import { useAuth } from '../../context/AuthContext';

export const SettingsComponent: React.FC = () => {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <View style={styles.container}>
      <Header title="Settings & Preferences" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="bell-ring-outline" size={22} color="#6366F1" />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Push Notifications</Text>
                <Text style={styles.rowSub}>Receive real-time mobile push alerts</Text>
              </View>
            </View>
            <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ true: '#6366F1' }} />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="email-check-outline" size={22} color="#6366F1" />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Email Digest Alerts</Text>
                <Text style={styles.rowSub}>Daily meeting & task reminders</Text>
              </View>
            </View>
            <Switch value={emailAlerts} onValueChange={setEmailAlerts} trackColor={{ true: '#6366F1' }} />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="theme-light-dark" size={22} color="#6366F1" />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Dark Mode</Text>
                <Text style={styles.rowSub}>Use high contrast dark theme</Text>
              </View>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: '#6366F1' }} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ACCOUNT & SYSTEM</Text>

          <View style={styles.rowInfo}>
            <Text style={styles.infoLabel}>Account Name</Text>
            <Text style={styles.infoValue}>{user?.name || 'User'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowInfo}>
            <Text style={styles.infoLabel}>Account Role</Text>
            <Text style={styles.infoValue}>{user?.role || 'EMPLOYEE'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowInfo}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0 (Expo SDK 57)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out of AIKart Workspace</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  sectionTitle: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowTextWrap: { marginLeft: 12, flex: 1 },
  rowTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginVertical: 4 },
  rowInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  infoLabel: { color: '#94A3B8', fontSize: 14 },
  infoValue: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15, marginLeft: 8 },
});
