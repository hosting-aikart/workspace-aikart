import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Linking, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { meetingsApi } from '../../src/api/meetingsApi';
import { Meeting } from '../../src/types';

export default function EmployeeMeetingsScreen() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchMeetings = async () => {
    try {
      const data = await meetingsApi.getMeetings();
      setMeetings(data);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMeetings();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  };

  const handleJoinMeeting = async (meeting: Meeting) => {
    try {
      setJoiningId(meeting.id);
      let url = meeting.meetingUrl;
      if (!url) {
        url = await meetingsApi.joinMeeting(meeting.id);
      }

      if (url) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Unable to Open Link', `Meeting URL: ${url}`);
        }
      } else {
        Alert.alert('No Meeting Link', 'This meeting does not have an active video link yet.');
      }
    } catch (err: any) {
      Alert.alert('Error Joining Meeting', err.response?.data?.message || err.message);
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return <LoadingScreen message="Fetching meetings..." />;
  }

  const formatMeetingTime = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const startTimeStr = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} • ${startTimeStr} - ${endTimeStr}`;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
        ListEmptyComponent={<EmptyState title="No Meetings Scheduled" subtitle="You have no upcoming or recent meetings." />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{item.title}</Text>
              <Badge
                label={item.status}
                type={item.status === 'ONGOING' ? 'danger' : item.status === 'UPCOMING' ? 'info' : 'default'}
              />
            </View>

            <Text style={styles.timeText}>{formatMeetingTime(item.startTime, item.endTime)}</Text>

            {item.agenda ? <Text style={styles.agendaText}>Agenda: {item.agenda}</Text> : null}
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

            <View style={styles.footerRow}>
              <Text style={styles.organizerText}>Organizer: {item.organizer?.name || 'Workspace'}</Text>
              <Button
                title="Join Meeting"
                onPress={() => handleJoinMeeting(item)}
                loading={joiningId === item.id}
                variant="primary"
                style={styles.joinBtn}
              />
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
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 13,
    color: '#818CF8',
    fontWeight: '600',
    marginBottom: 8,
  },
  agendaText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  organizerText: {
    fontSize: 12,
    color: '#64748B',
  },
  joinBtn: {
    height: 36,
    paddingHorizontal: 16,
  },
});
