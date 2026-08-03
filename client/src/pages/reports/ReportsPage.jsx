import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import Badge from '../../components/common/Badge';

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [data, setData] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalProjects: 0,
    teamSize: 0,
    checkInRate: '0%',
  });

  const loadEmployeeReport = async () => {
    setLoading(true);
    setError('');
    try {
      if (user?.role === 'MANAGER') {
        const { data: dashboardRes } = await api.get('/manager/dashboard');
        const stats = dashboardRes?.data || {};
        const teamSize = stats.teamMembersCount || 0;
        const checkedInCount = stats.todayAttendance?.checkedIn || 0;
        const checkInRate = teamSize > 0 ? `${Math.round((checkedInCount / teamSize) * 100)}%` : '0%';

        setData({
          totalTasks: stats.taskMetrics?.total || 0,
          completedTasks: stats.taskMetrics?.completed || 0,
          pendingTasks: stats.taskMetrics?.pending || 0,
          totalProjects: stats.managedProjectsCount || 0,
          teamSize,
          checkInRate,
        });
      } else {
        // Regular employee report
        const [{ data: tasksRes }, { data: projectsRes }] = await Promise.all([
          api.get('/tasks'),
          api.get('/projects'),
        ]);

        const tasks = tasksRes?.data || [];
        const projects = projectsRes?.data || [];
        const completed = tasks.filter((t) => t.status === 'DONE' || t.status === 'COMPLETED').length;

        setData({
          totalTasks: tasks.length,
          completedTasks: completed,
          pendingTasks: tasks.length - completed,
          totalProjects: projects.length,
          teamSize: 0,
          checkInRate: '0%',
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load reporting metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeReport();
  }, [user?.role]);

  const handleExport = () => {
    const csvRows = [
      ['Metric', 'Value'],
      ['Total Tasks', data.totalTasks],
      ['Completed Tasks', data.completedTasks],
      ['Pending Tasks', data.pendingTasks],
      ['Total Assigned Projects', data.totalProjects],
    ];

    if (user?.role === 'MANAGER') {
      csvRows.push(['Team Size', data.teamSize]);
      csvRows.push(['Team Presence Rate today', data.checkInRate]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `performance_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotice('CSV report downloaded successfully!');
    setTimeout(() => setNotice(''), 3000);
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="text-secondary">Loading reports overview…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <PageHeader
        title={user?.role === 'MANAGER' ? 'Team Performance Report' : 'My Performance Report'}
        subtitle={
          user?.role === 'MANAGER'
            ? 'Monitor department benchmarks, task tracking, and workforce attendance rates.'
            : 'Track your assigned work accomplishments, check-in history, and deadlines.'
        }
        action={
          <button className="btn btn-primary" onClick={handleExport}>
            Export Report CSV
          </button>
        }
      />

      {notice && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderColor: 'var(--color-success)' }}>
          <p style={{ margin: 0, color: 'var(--color-success)' }}>{notice}</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderColor: 'var(--color-danger)' }}>
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {user?.role === 'MANAGER' ? (
          <>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>TEAM ATTENDANCE</span>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#22c55e', margin: '0.2rem 0' }}>
                {data.checkInRate}
              </div>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.78rem' }}>Presence rate today</p>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>MANAGED PROJECTS</span>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0.2rem 0' }}>
                {data.totalProjects}
              </div>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.78rem' }}>Active team projects</p>
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>ASSIGNED PROJECTS</span>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0.2rem 0' }}>
                {data.totalProjects}
              </div>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.78rem' }}>Active project boards</p>
            </div>
          </>
        )}

        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>TASKS COMPLETED</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#4461F2', margin: '0.2rem 0' }}>
            {data.completedTasks}
          </div>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.78rem' }}>
            Out of {data.totalTasks} total tasks
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>PENDING BACKLOG</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b', margin: '0.2rem 0' }}>
            {data.pendingTasks}
          </div>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.78rem' }}>Tasks currently in progress/todo</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        {/* Productivity Chart Visualizer */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Task Completion Visualizer</h3>
          <p className="text-secondary" style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem' }}>
            Comparison of completed deliverables versus pending backlog.
          </p>

          {/* SVG Bar Chart */}
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '60px',
                  height: data.totalTasks > 0 ? `${(data.completedTasks / data.totalTasks) * 160}px` : '10px',
                  background: 'linear-gradient(180deg, #22c55e, #15803d)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.4s ease',
                }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Completed ({data.completedTasks})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '60px',
                  height: data.totalTasks > 0 ? `${(data.pendingTasks / data.totalTasks) * 160}px` : '10px',
                  background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.4s ease',
                }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pending ({data.pendingTasks})</span>
            </div>
          </div>
        </div>

        {/* Dynamic Activity Analysis */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Workplace Engagement</h3>
          <p className="text-secondary" style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>
            Performance benchmarks and milestone completion rates.
          </p>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                <span className="text-secondary">Task Completion Efficiency</span>
                <strong>
                  {data.totalTasks > 0 ? `${Math.round((data.completedTasks / data.totalTasks) * 100)}%` : '0%'}
                </strong>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: data.totalTasks > 0 ? `${(data.completedTasks / data.totalTasks) * 100}%` : '0%',
                    height: '100%',
                    background: 'var(--color-primary)',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                <span className="text-secondary">Workforce Check-in Rate</span>
                <strong>{data.checkInRate}</strong>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: data.checkInRate,
                    height: '100%',
                    background: '#22c55e',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
