import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { attendanceApi } from '../../src/api/attendanceApi';
import { Attendance } from '../../src/types';

export default function EmployeeAttendanceScreen() {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const fetchData = async () => {
    try {
      const [todayAtt, historyList] = await Promise.all([
        attendanceApi.getToday().catch(() => null),
        attendanceApi.getHistory().catch(() => []),
      ]);
      setAttendance(todayAtt);
      setHistory(historyList);
      if (todayAtt) {
        setTimerSeconds(todayAtt.totalSeconds || 0);
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Live timer interval while status is 'WORKING'
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (attendance?.status === 'WORKING') {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [attendance?.status]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAction = async (action: 'check-in' | 'pause' | 'resume' | 'check-out') => {
    try {
      setActionLoading(true);
      let updated: Attendance;
      if (action === 'check-in') updated = await attendanceApi.checkIn();
      else if (action === 'pause') updated = await attendanceApi.pause();
      else if (action === 'resume') updated = await attendanceApi.resume();
      else updated = await attendanceApi.checkOut();

      setAttendance(updated);
      setTimerSeconds(updated.totalSeconds || 0);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Attendance Action Failed', err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingScreen message="Loading attendance status..." />;
  }

  const status = attendance?.status || 'NOT_STARTED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
    >
      <Card style={styles.timerCard}>
        <Text style={styles.timerHeaderTitle}>Today's Work Timer</Text>
        <Badge
          label={status}
          type={status === 'WORKING' ? 'success' : status === 'PAUSED' ? 'warning' : 'default'}
        />

        <Text style={styles.clockDisplay}>{formatTime(timerSeconds)}</Text>

        {/* Dynamic Action Buttons depending on status */}
        <View style={styles.buttonGroup}>
          {status === 'NOT_STARTED' && (
            <Button
              title="Check In"
              onPress={() => handleAction('check-in')}
              loading={actionLoading}
              variant="primary"
              style={styles.fullBtn}
            />
          )}

          {status === 'WORKING' && (
            <View style={styles.rowButtons}>
              <Button
                title="Pause"
                onPress={() => handleAction('pause')}
                loading={actionLoading}
                variant="secondary"
                style={styles.halfBtn}
              />
              <Button
                title="Check Out"
                onPress={() => handleAction('check-out')}
                loading={actionLoading}
                variant="danger"
                style={styles.halfBtn}
              />
            </View>
          )}

          {status === 'PAUSED' && (
            <View style={styles.rowButtons}>
              <Button
                title="Resume"
                onPress={() => handleAction('resume')}
                loading={actionLoading}
                variant="primary"
                style={styles.halfBtn}
              />
              <Button
                title="Check Out"
                onPress={() => handleAction('check-out')}
                loading={actionLoading}
                variant="danger"
                style={styles.halfBtn}
              />
            </View>
          )}

          {status === 'CHECKED_OUT' && (
            <Text style={styles.checkedOutText}>You have checked out for today. See you tomorrow!</Text>
          )}
        </View>
      </Card>

      <Text style={styles.sectionHeaderTitle}>Recent Attendance History</Text>

      {history.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No recent attendance history recorded.</Text>
        </Card>
      ) : (
        history.slice(0, 7).map((item) => (
          <Card key={item.id} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <Text style={styles.historyDate}>
                {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.historyDuration}>
                {Math.floor(item.totalSeconds / 3600)}h {Math.floor((item.totalSeconds % 3600) / 60)}m
              </Text>
            </View>
            <Badge label={item.status} type={item.status === 'CHECKED_OUT' ? 'info' : 'default'} />
          </Card>
        ))
      )}
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
  timerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  timerHeaderTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  clockDisplay: {
    fontSize: 44,
    fontWeight: '800',
    color: '#F8FAFC',
    marginVertical: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonGroup: {
    width: '100%',
    marginTop: 8,
  },
  fullBtn: {
    width: '100%',
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfBtn: {
    flex: 0.48,
  },
  checkedOutText: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  historyCard: {
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  historyDuration: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
});
