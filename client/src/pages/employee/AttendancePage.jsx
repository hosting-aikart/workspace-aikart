import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { SkeletonPageHeader, SkeletonCard, SkeletonTable } from '../../components/common/Skeleton';

function formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function StatusBadge({ status }) {
    const map = {
        NOT_STARTED: { label: 'Not Started',  cls: 'badge-neutral'  },
        WORKING:     { label: 'Working',       cls: 'badge-success'  },
        PAUSED:      { label: 'Paused',        cls: 'badge-warning'  },
        CHECKED_OUT: { label: 'Checked Out',   cls: 'badge-primary'  },
        ABSENT:      { label: 'Absent',        cls: 'badge-danger'   },
    };
    const { label, cls } = map[status] ?? { label: status, cls: 'badge-neutral' };
    return <span className={`badge ${cls}`}>{label}</span>;
}

export default function AttendancePage() {
    const { user } = useAuth();
    const isManager = user?.role === 'MANAGER';
    
    const [activeTab, setActiveTab] = useState('my-attendance');
    const [status,         setStatus]         = useState(null);
    const [liveSeconds,    setLiveSeconds]    = useState(0);
    const [weeklySeconds,  setWeeklySeconds]  = useState(0);
    const [monthlySeconds, setMonthlySeconds] = useState(0);
    const [loading,        setLoading]        = useState(true);
    // Which action (check-in / pause / check-out / resume) is currently in
    // flight, if any — not just a boolean, so the specific button that was
    // clicked can show its own spinner immediately instead of the whole
    // control cluster just going quietly disabled with no visible feedback
    // until the round trip finishes (that dead-feeling gap is what read as
    // "check-in doesn't start for 2-3 seconds").
    const [loadingAction,  setLoadingAction]  = useState(null);
    const actionLoading = loadingAction !== null;
    const [error,          setError]          = useState('');
    const [history,        setHistory]        = useState([]);
    const [teamAttendance, setTeamAttendance] = useState([]);
    const [teamLoading,    setTeamLoading]    = useState(false);

    const fetchToday = useCallback(async () => {
        try {
            const res = await api.get('/attendance/today');
            const data = res.data.data;
            setStatus(data);
            setLiveSeconds(data.liveTotalSeconds ?? data.totalSeconds ?? 0);
        } catch {
            setError('Could not load attendance status.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await api.get('/attendance/history');
            setHistory(res.data.data);
        } catch {
            // non-fatal
        }
    }, []);

    const fetchSummaries = useCallback(async () => {
        try {
            const [weekRes, monthRes] = await Promise.all([
                api.get('/attendance/summary/weekly'),
                api.get('/attendance/summary/monthly'),
            ]);
            setWeeklySeconds(weekRes.data.data.totalSeconds);
            setMonthlySeconds(monthRes.data.data.totalSeconds);
        } catch {
            // non-fatal
        }
    }, []);

    const fetchTeamAttendance = useCallback(async () => {
        if (!isManager) return;
        setTeamLoading(true);
        try {
            const { data } = await api.get('/manager/attendance');
            setTeamAttendance(data?.data || []);
        } catch (err) {
            console.error('Failed to load team attendance', err);
        } finally {
            setTeamLoading(false);
        }
    }, [isManager]);

    useEffect(() => {
        fetchToday();
        fetchHistory();
        fetchSummaries();
        if (isManager) fetchTeamAttendance();
    }, [fetchToday, fetchHistory, fetchSummaries, fetchTeamAttendance, isManager]);

    // Client-side ticking clock while WORKING
    useEffect(() => {
        if (status?.status !== 'WORKING') return;
        const interval = setInterval(() => {
            setLiveSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [status?.status]);

    const runAction = async (endpoint) => {
        setLoadingAction(endpoint);
        setError('');
        try {
            const res = await api.post(`/attendance/${endpoint}`);
            setStatus(res.data.data);
            setLiveSeconds(res.data.data.totalSeconds ?? 0);
            fetchHistory();
            fetchSummaries();
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed.');
        } finally {
            setLoadingAction(null);
        }
    };

    if (loading) {
        return (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <SkeletonPageHeader />
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr', marginBottom: '2rem' }}>
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
                <SkeletonTable rows={4} columns={4} />
            </div>
        );
    }

    const isNotStarted  = status?.status === 'NOT_STARTED';
    const isWorking     = status?.status === 'WORKING';
    const isPaused      = status?.status === 'PAUSED';
    const isCheckedOut  = status?.status === 'CHECKED_OUT';

    return (
        <div className="attendance-page animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Attendance &amp; Work Timer</h1>
                    <p className="text-secondary">Track your daily working hours</p>
                </div>
            </div>

            {isManager && (
                <div className="tab-scroll-row" style={{ gap: '1rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                    <button
                        onClick={() => setActiveTab('my-attendance')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'my-attendance' ? '2px solid var(--color-primary)' : '2px solid transparent',
                            color: activeTab === 'my-attendance' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        My Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab('team-attendance')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'team-attendance' ? '2px solid var(--color-primary)' : '2px solid transparent',
                            color: activeTab === 'team-attendance' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Team Attendance
                    </button>
                </div>
            )}

            {activeTab === 'my-attendance' ? (
                <>
                    {/* Timer card */}
                    <div className="card attendance-timer-card" style={{ marginBottom: '2rem' }}>
                        <div className="card-body attendance-timer-body" style={{ textAlign: 'center', padding: '3rem 1rem' }}>

                            <div className="attendance-clock" style={{ fontWeight: 800, color: 'var(--color-text)', marginBottom: '1rem', fontVariantNumeric: 'tabular-nums' }}>
                                {formatDuration(liveSeconds)}
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <StatusBadge status={status?.status ?? 'NOT_STARTED'} />
                            </div>

                            {error && (
                                <div className="alert alert-error" style={{ marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>{error}</div>
                            )}

                            <div className="attendance-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                {isNotStarted && (
                                    <button
                                        id="btn-check-in"
                                        className="btn btn-success btn-lg"
                                        onClick={() => runAction('check-in')}
                                        disabled={actionLoading}
                                    >
                                        {loadingAction === 'check-in' ? (
                                            <span className="spinner spinner-sm" />
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                                            </svg>
                                        )}
                                        Check In
                                    </button>
                                )}

                                {isWorking && (
                                    <>
                                        <button
                                            id="btn-pause"
                                            className="btn btn-warning btn-lg"
                                            onClick={() => runAction('pause')}
                                            disabled={actionLoading}
                                        >
                                            {loadingAction === 'pause' ? (
                                                <span className="spinner spinner-sm" />
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                                                </svg>
                                            )}
                                            Pause
                                        </button>
                                        <button
                                            id="btn-check-out"
                                            className="btn btn-danger btn-lg"
                                            onClick={() => runAction('check-out')}
                                            disabled={actionLoading}
                                        >
                                            {loadingAction === 'check-out' ? (
                                                <span className="spinner spinner-sm" />
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                                                </svg>
                                            )}
                                            Check Out
                                        </button>
                                    </>
                                )}

                                {isPaused && (
                                    <>
                                        <button
                                            id="btn-resume"
                                            className="btn btn-primary btn-lg"
                                            onClick={() => runAction('resume')}
                                            disabled={actionLoading}
                                        >
                                            {loadingAction === 'resume' ? (
                                                <span className="spinner spinner-sm" />
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polygon points="5 3 19 12 5 21 5 3"/>
                                                </svg>
                                            )}
                                            Resume
                                        </button>
                                        <button
                                            id="btn-check-out-paused"
                                            className="btn btn-danger btn-lg"
                                            onClick={() => runAction('check-out')}
                                            disabled={actionLoading}
                                        >
                                            {loadingAction === 'check-out' ? (
                                                <span className="spinner spinner-sm" />
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                                                </svg>
                                            )}
                                            Check Out
                                        </button>
                                    </>
                                )}

                                {isCheckedOut && (
                                    <p className="text-secondary" style={{ fontSize: '1.1rem' }}>
                                        You have checked out for today. See you tomorrow!
                                    </p>
                                )}
                            </div>

                            {status?.checkIn && (
                                <p className="attendance-times" style={{ marginTop: '1.5rem', color: 'var(--color-text-secondary)' }}>
                                    Checked in at <strong style={{ color: 'var(--color-text)' }}>{new Date(status.checkIn).toLocaleTimeString()}</strong>
                                    {status.checkOut && (
                                        <> &middot; Checked out at <strong style={{ color: 'var(--color-text)' }}>{new Date(status.checkOut).toLocaleTimeString()}</strong></>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="attendance-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="card attendance-summary-card">
                            <div className="card-body" style={{ textAlign: 'center' }}>
                                <p className="attendance-summary-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Today</p>
                                <p className="attendance-summary-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatDuration(liveSeconds)}</p>
                            </div>
                        </div>
                        <div className="card attendance-summary-card">
                            <div className="card-body" style={{ textAlign: 'center' }}>
                                <p className="attendance-summary-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>This Week</p>
                                <p className="attendance-summary-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatDuration(weeklySeconds)}</p>
                            </div>
                        </div>
                        <div className="card attendance-summary-card">
                            <div className="card-body" style={{ textAlign: 'center' }}>
                                <p className="attendance-summary-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>This Month</p>
                                <p className="attendance-summary-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatDuration(monthlySeconds)}</p>
                            </div>
                        </div>
                    </div>

                    {/* History table */}
                    <div className="card">
                        <div className="card-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                            <h2 className="card-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Attendance History</h2>
                        </div>
                        <div className="table-wrapper">
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Date</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Check In</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Check Out</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Total Hours</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h) => (
                                        <tr key={h.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1rem' }}>{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                            <td style={{ padding: '1rem' }}>{h.checkIn  ? new Date(h.checkIn).toLocaleTimeString()  : '—'}</td>
                                            <td style={{ padding: '1rem' }}>{h.checkOut ? new Date(h.checkOut).toLocaleTimeString() : '—'}</td>
                                            <td className="font-mono" style={{ padding: '1rem' }}>{formatDuration(h.totalSeconds)}</td>
                                            <td style={{ padding: '1rem' }}><StatusBadge status={h.status} /></td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="table-empty" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                                No attendance history yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="card">
                    <div className="card-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                        <h2 className="card-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Team Attendance (Today)</h2>
                    </div>
                    {teamLoading ? (
                        <div style={{ padding: '1rem' }}>
                            <SkeletonTable rows={3} columns={5} />
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Team Member</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Check In</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Check Out</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Total Hours</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-secondary)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamAttendance.map((log) => (
                                        <tr key={log.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <strong style={{ display: 'block' }}>{log.user?.name || '—'}</strong>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{log.user?.position}</span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{log.checkIn ? new Date(log.checkIn).toLocaleTimeString() : '—'}</td>
                                            <td style={{ padding: '1rem' }}>{log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : '—'}</td>
                                            <td className="font-mono" style={{ padding: '1rem' }}>{formatDuration(log.totalSeconds)}</td>
                                            <td style={{ padding: '1rem' }}><StatusBadge status={log.status} /></td>
                                        </tr>
                                    ))}
                                    {teamAttendance.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="table-empty" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                                No team attendance data available for today.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
