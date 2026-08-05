import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import StatsCard from '../../components/common/StatsCard';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common/Skeleton';
import CreateMeetingModal from '../meetings/components/CreateMeetingModal';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const getStatusBadgeTone = (status) => {
  switch (status) {
    case 'UPCOMING': return 'info';
    case 'ONGOING': return 'success';
    case 'COMPLETED': return 'neutral';
    case 'CANCELLED': return 'danger';
    default: return 'neutral';
  }
};

const getResponseBadgeTone = (resStatus) => {
  switch (resStatus) {
    case 'ACCEPTED': return 'success';
    case 'DECLINED': return 'danger';
    case 'JOINED': return 'primary';
    case 'INVITED': return 'warning';
    default: return 'neutral';
  }
};

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [notificationMsg, setNotificationMsg] = useState('');

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/meetings');
      setMeetings(res.data?.data?.meetings || []);
    } catch (err) {
      console.warn('Failed to fetch meetings:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const showNotification = (msg) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 4000);
  };

  const filteredMeetings = useMemo(() => {
    if (activeTab === 'ALL') return meetings;
    return meetings.filter((m) => m.status === activeTab);
  }, [meetings, activeTab]);

  const stats = useMemo(() => {
    const total = meetings.length;
    const upcoming = meetings.filter((m) => m.status === 'UPCOMING' || m.status === 'ONGOING').length;
    const completed = meetings.filter((m) => m.status === 'COMPLETED').length;
    const cancelled = meetings.filter((m) => m.status === 'CANCELLED').length;
    return { total, upcoming, completed, cancelled };
  }, [meetings]);

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      setActionLoadingId(meetingId);
      await api.delete(`/meetings/${meetingId}`);
      showNotification('Meeting deleted successfully.');
      fetchMeetings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete meeting.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleJoinMeeting = async (meeting) => {
    let targetUrl = meeting.meetingUrl || `https://meet.jit.si/aikart-room-${meeting.id}`;
    try {
      const res = await api.post(`/meetings/${meeting.id}/join`);
      if (res.data?.data?.meetingUrl) {
        targetUrl = res.data.data.meetingUrl;
      }
      fetchMeetings();
    } catch {
      // fallback
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Meetings & Conferences"
        description="Schedule instant or upcoming Google Meet conferences, calendar events, and invitations."
        action={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-outline"
              onClick={() => {
                setEditingMeeting({ meetingType: 'INSTANT' });
                setIsModalOpen(true);
              }}
            >
              ⚡ Instant Meeting
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingMeeting(null);
                setIsModalOpen(true);
              }}
            >
              📅 Schedule Meeting
            </button>
          </div>
        }
      />

      {notificationMsg && (
        <div className="card" style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '0.75rem 1.25rem', fontWeight: 600 }}>
          ✓ {notificationMsg}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatsCard label="Total Meetings" value={stats.total} hint="All time workspace meetings" />
        <StatsCard label="Upcoming & Ongoing" value={stats.upcoming} hint="Scheduled & active" />
        <StatsCard label="Completed" value={stats.completed} hint="Finished sessions" />
        <StatsCard label="Cancelled" value={stats.cancelled} hint="Cancelled events" />
      </div>

      {/* Status Tabs */}
      <div className="card" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          {['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(tab)}
              style={{ textTransform: 'capitalize' }}
            >
              {tab === 'ALL' ? 'All Meetings' : tab.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : filteredMeetings.length === 0 ? (
        <EmptyState
          title="No meetings found"
          description={
            activeTab === 'ALL'
              ? 'No meetings have been scheduled yet. Click "Create Meeting" to schedule your first meeting.'
              : `No ${activeTab.toLowerCase()} meetings.`
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredMeetings.map((meeting) => {
            const isOrganizer = true; // Admin has full privileges
            const startDate = new Date(meeting.startTime);
            const endDate = new Date(meeting.endTime);

            return (
              <div
                key={meeting.id}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderLeft: `4px solid ${
                    meeting.status === 'UPCOMING'
                      ? '#4461F2'
                      : meeting.status === 'ONGOING'
                      ? '#10b981'
                      : meeting.status === 'CANCELLED'
                      ? '#ef4444'
                      : '#94a3b8'
                  }`,
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{meeting.title}</h3>
                      <Badge tone={meeting.meetingType === 'INSTANT' ? 'warning' : 'info'}>
                        {meeting.meetingType === 'INSTANT' ? '⚡ Instant' : '📅 Scheduled'}
                      </Badge>
                      <Badge tone={getStatusBadgeTone(meeting.status)}>{meeting.status}</Badge>
                    </div>
                    {meeting.description && (
                      <p className="text-secondary" style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                        {meeting.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {meeting.meetingUrl && meeting.status !== 'CANCELLED' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleJoinMeeting(meeting)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                        </svg>
                        Join Google Meet
                      </button>
                    )}

                    {meeting.status !== 'CANCELLED' && (
                      <>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setEditingMeeting(meeting);
                            setIsModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={actionLoadingId === meeting.id}
                          onClick={() => handleDeleteMeeting(meeting.id)}
                        >
                          {actionLoadingId === meeting.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Details Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem',
                    background: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span className="text-secondary" style={{ display: 'block', fontWeight: 600 }}>
                      Organizer
                    </span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {meeting.organizer?.name || 'Unknown'} ({meeting.organizer?.email})
                    </span>
                  </div>

                  <div>
                    <span className="text-secondary" style={{ display: 'block', fontWeight: 600 }}>
                      Date & Time
                    </span>
                    <span style={{ color: '#1e293b' }}>
                      {startDate.toLocaleDateString()} | {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {meeting.agenda && (
                    <div>
                      <span className="text-secondary" style={{ display: 'block', fontWeight: 600 }}>
                        Agenda
                      </span>
                      <span style={{ color: '#334155' }}>{meeting.agenda}</span>
                    </div>
                  )}
                </div>

                {/* Participants Row */}
                <div>
                  <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Participants ({meeting.participants?.length || 0})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {meeting.participants?.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div className="avatar avatar-sm" style={{ width: '20px', height: '20px', fontSize: '0.65rem' }}>
                          {getInitials(p.user?.name)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{p.user?.name}</span>
                        <Badge tone={getResponseBadgeTone(p.responseStatus)}>
                          {p.responseStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <CreateMeetingModal
          initialData={editingMeeting}
          userRole="ADMIN"
          onClose={() => {
            setIsModalOpen(false);
            setEditingMeeting(null);
          }}
          onSuccess={() => {
            showNotification(editingMeeting?.id ? 'Meeting updated successfully.' : 'Meeting created successfully.');
            fetchMeetings();
          }}
        />
      )}
    </div>
  );
}
