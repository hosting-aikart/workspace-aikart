import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../Header';
import { attendanceApi } from '../../api/attendanceApi';
import { managerApi } from '../../api/managerApi';
import { adminApi } from '../../api/adminApi';
import { Attendance } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AttendanceComponent: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'EMPLOYEE';

  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [teamLogs, setTeamLogs] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAttendance = async () => {
    try {
      const [todayData, historyData] = await Promise.all([
        attendanceApi.getToday(),
        attendanceApi.getHistory(),
      ]);
      setTodayAttendance(todayData);
      setHistory(historyData);

      if (role === 'MANAGER') {
        const tLogs = await managerApi.getAttendance();
        setTeamLogs(tLogs);
      } else if (role === 'ADMIN') {
        const aLogs = await adminApi.getWorkspaceAttendance();
        setTeamLogs(aLogs);
      }
    } catch (err) {
      console.log('Failed to fetch attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleAction = async (actionFn: () => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    try {
      await actionFn();
      await fetchAttendance();
      Alert.alert('Success', successMsg);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const status = todayAttendance?.status || 'CHECKED_OUT';

  return (
    <View style={styles.container}>
      <Header title="Attendance & Hours" />

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Today's Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>TODAY'S STATUS</Text>

            <View style={styles.statusRow}>
              <View style={[styles.statusIndicator, status === 'WORKING' ? styles.greenDot : styles.redDot]} />
              <Text style={styles.statusText}>{status.replace('_', ' ')}</Text>
            </View>

            {todayAttendance?.checkIn ? (
              <Text style={styles.timeInfo}>
                Check-in: {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : null}

            {todayAttendance?.checkOut ? (
              <Text style={styles.timeInfo}>
                Check-out: {new Date(todayAttendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionGrid}>
              {status === 'CHECKED_OUT' || !todayAttendance?.checkIn ? (
                <TouchableOpacity
                  style={[styles.btn, styles.checkInBtn, actionLoading && { opacity: 0.6 }]}
                  onPress={() => handleAction(() => attendanceApi.checkIn(), 'Checked in successfully.')}
                  disabled={actionLoading}
                >
                  <MaterialCommunityIcons name="login" size={20} color="#FFFFFF" />
                  <Text style={styles.btnText}>Check In</Text>
                </TouchableOpacity>
              ) : null}

              {status === 'WORKING' ? (
                <>
                  <TouchableOpacity
                    style={[styles.btn, styles.pauseBtn, actionLoading && { opacity: 0.6 }]}
                    onPress={() => handleAction(() => attendanceApi.pause(), 'Timer paused.')}
                    disabled={actionLoading}
                  >
                    <MaterialCommunityIcons name="pause" size={20} color="#FFFFFF" />
                    <Text style={styles.btnText}>Pause</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.checkOutBtn, actionLoading && { opacity: 0.6 }]}
                    onPress={() => handleAction(() => attendanceApi.checkOut(), 'Checked out successfully.')}
                    disabled={actionLoading}
                  >
                    <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
                    <Text style={styles.btnText}>Check Out</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {status === 'PAUSED' ? (
                <>
                  <TouchableOpacity
                    style={[styles.btn, styles.resumeBtn, actionLoading && { opacity: 0.6 }]}
                    onPress={() => handleAction(() => attendanceApi.resume(), 'Timer resumed.')}
                    disabled={actionLoading}
                  >
                    <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
                    <Text style={styles.btnText}>Resume</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.checkOutBtn, actionLoading && { opacity: 0.6 }]}
                    onPress={() => handleAction(() => attendanceApi.checkOut(), 'Checked out successfully.')}
                    disabled={actionLoading}
                  >
                    <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
                    <Text style={styles.btnText}>Check Out</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>

          {/* Attendance History */}
          <Text style={styles.sectionHeaderTitle}>MY RECENT ATTENDANCE</Text>
          {history.length === 0 ? (
            <Text style={styles.noHistory}>No history records available.</Text>
          ) : (
            history.slice(0, 10).map((h) => (
              <View key={h.id} style={styles.historyCard}>
                <Text style={styles.historyDate}>
                  {new Date(h.date || h.checkIn || '').toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.historyStatus}>{h.status}</Text>
              </View>
            ))
          )}

          {/* Team / Workspace Attendance Overview (Manager / Admin) */}
          {role !== 'EMPLOYEE' && teamLogs.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionHeaderTitle}>TEAM ATTENDANCE OVERVIEW</Text>
              {teamLogs.slice(0, 15).map((log) => (
                <View key={log.id} style={styles.teamCard}>
                  <Text style={styles.teamUser}>{log.user?.name || log.userId || 'Employee'}</Text>
                  <Text style={styles.teamStatus}>{log.status}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  sectionTitle: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusIndicator: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  greenDot: { backgroundColor: '#10B981' },
  redDot: { backgroundColor: '#EF4444' },
  statusText: { color: '#F8FAFC', fontSize: 20, fontWeight: '800' },
  timeInfo: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  actionGrid: { flexDirection: 'row', marginTop: 18 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, marginRight: 8 },
  checkInBtn: { backgroundColor: '#10B981', marginRight: 0 },
  pauseBtn: { backgroundColor: '#F59E0B' },
  resumeBtn: { backgroundColor: '#6366F1' },
  checkOutBtn: { backgroundColor: '#EF4444', marginRight: 0 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  sectionHeaderTitle: { color: '#64748B', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10, marginTop: 10 },
  noHistory: { color: '#94A3B8', fontSize: 13 },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 8 },
  historyDate: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  historyStatus: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
  teamCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 8 },
  teamUser: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  teamStatus: { color: '#10B981', fontSize: 12, fontWeight: '700' },
});
