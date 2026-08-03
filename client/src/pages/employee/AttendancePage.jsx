import { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';

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
    };
    const { label, cls } = map[status] ?? { label: status, cls: 'badge-neutral' };
    return <span className={`badge ${cls}`}>{label}</span>;
}

export default function AttendancePage() {
    const [status,         setStatus]         = useState(null);
    const [liveSeconds,    setLiveSeconds]    = useState(0);
    const [weeklySeconds,  setWeeklySeconds]  = useState(0);
    const [monthlySeconds, setMonthlySeconds] = useState(0);
    const [loading,        setLoading]        = useState(true);
    const [actionLoading,  setActionLoading]  = useState(false);
    const [error,          setError]          = useState('');
    const [history,        setHistory]        = useState([]);

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

    useEffect(() => {
        fetchToday();
        fetchHistory();
        fetchSummaries();
    }, [fetchToday, fetchHistory, fetchSummaries]);

    // Client-side ticking clock while WORKING
    useEffect(() => {
        if (status?.status !== 'WORKING') return;
        const interval = setInterval(() => {
            setLiveSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [status?.status]);

    const runAction = async (endpoint) => {
        setActionLoading(true);
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
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner" />
                <span className="text-secondary">Loading attendance...</span>
            </div>
        );
    }

    const isNotStarted  = status?.status === 'NOT_STARTED';
    const isWorking     = status?.status === 'WORKING';
    const isPaused      = status?.status === 'PAUSED';
    const isCheckedOut  = status?.status === 'CHECKED_OUT';

    return (
        <div className="attendance-page animate-fade-in">

            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance &amp; Work Timer</h1>
                    <p className="text-secondary">Track your daily working hours</p>
                </div>
            </div>

            {/* Timer card */}
            <div className="card attendance-timer-card">
                <div className="card-body attendance-timer-body">

                    <div className="attendance-clock">
                        {formatDuration(liveSeconds)}
                    </div>

                    <StatusBadge status={status?.status ?? 'NOT_STARTED'} />

                    {error && (
                        <div className="alert alert-error">{error}</div>
                    )}

                    <div className="attendance-actions">
                        {isNotStarted && (
                            <button
                                id="btn-check-in"
                                className="btn btn-success btn-lg"
                                onClick={() => runAction('check-in')}
                                disabled={actionLoading}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                                </svg>
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
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                                    </svg>
                                    Pause
                                </button>
                                <button
                                    id="btn-check-out"
                                    className="btn btn-danger btn-lg"
                                    onClick={() => runAction('check-out')}
                                    disabled={actionLoading}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
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
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="5 3 19 12 5 21 5 3"/>
                                    </svg>
                                    Resume
                                </button>
                                <button
                                    id="btn-check-out-paused"
                                    className="btn btn-danger btn-lg"
                                    onClick={() => runAction('check-out')}
                                    disabled={actionLoading}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                    Check Out
                                </button>
                            </>
                        )}

                        {isCheckedOut && (
                            <p className="text-secondary">
                                You have checked out for today. See you tomorrow!
                            </p>
                        )}
                    </div>

                    {status?.checkIn && (
                        <p className="attendance-times">
                            Checked in at <strong>{new Date(status.checkIn).toLocaleTimeString()}</strong>
                            {status.checkOut && (
                                <> &middot; Checked out at <strong>{new Date(status.checkOut).toLocaleTimeString()}</strong></>
                            )}
                        </p>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            <div className="attendance-summary-grid">
                <div className="card attendance-summary-card">
                    <div className="card-body">
                        <p className="attendance-summary-label">Today</p>
                        <p className="attendance-summary-value">{formatDuration(liveSeconds)}</p>
                    </div>
                </div>
                <div className="card attendance-summary-card">
                    <div className="card-body">
                        <p className="attendance-summary-label">This Week</p>
                        <p className="attendance-summary-value">{formatDuration(weeklySeconds)}</p>
                    </div>
                </div>
                <div className="card attendance-summary-card">
                    <div className="card-body">
                        <p className="attendance-summary-label">This Month</p>
                        <p className="attendance-summary-value">{formatDuration(monthlySeconds)}</p>
                    </div>
                </div>
            </div>

            {/* History table */}
            <div className="card mt-6">
                <div className="card-header">
                    <h2 className="card-title">Attendance History</h2>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th>Total Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((h) => (
                                <tr key={h.id}>
                                    <td>{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                    <td>{h.checkIn  ? new Date(h.checkIn).toLocaleTimeString()  : '—'}</td>
                                    <td>{h.checkOut ? new Date(h.checkOut).toLocaleTimeString() : '—'}</td>
                                    <td className="font-mono">{formatDuration(h.totalSeconds)}</td>
                                    <td><StatusBadge status={h.status} /></td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="table-empty">
                                        No attendance history yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
