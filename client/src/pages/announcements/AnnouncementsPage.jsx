import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    selectedUserIds: [],
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // The "New Broadcast" recipient picker is available to EMPLOYEE too
      // (see the action button below), not just MANAGER — it needs the
      // directory either way, or the picker just renders "No team members
      // found" with nothing to select. This was previously gated to
      // MANAGER only, which is why employees couldn't select anyone.
      const [announcementsRes, directoryRes] = await Promise.all([
        api.get('/announcements'),
        api.get('/me/directory?limit=200'),
      ]);
      setAnnouncements(announcementsRes?.data?.data || []);

      const list = directoryRes.data?.data?.employees || directoryRes.data?.employees || [];
      setTeamMembers(list.filter((m) => m.id !== user?.id));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleToggleSelectUser = (userId) => {
    setForm((prev) => {
      const exists = prev.selectedUserIds.includes(userId);
      return {
        ...prev,
        selectedUserIds: exists
          ? prev.selectedUserIds.filter((id) => id !== userId)
          : [...prev.selectedUserIds, userId],
      };
    });
  };

  const handleSelectAllTeam = () => {
    if (form.selectedUserIds.length === teamMembers.length) {
      setForm((prev) => ({ ...prev, selectedUserIds: [] }));
    } else {
      setForm((prev) => ({ ...prev, selectedUserIds: teamMembers.map((m) => m.id) }));
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    if (form.selectedUserIds.length === 0) {
      setError('Please select at least one team member recipient.');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        targetType: 'SELECTED_USERS',
        selectedUserIds: form.selectedUserIds,
        status: 'PUBLISHED',
      };

      await api.post('/announcements', payload);
      setNotice('Team announcement broadcasted successfully!');
      setIsModalOpen(false);
      setForm({ title: '', description: '', priority: 'MEDIUM', selectedUserIds: [] });
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to send announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Announcement Title',
      render: (row) => (
        <button
          type="button"
          onClick={() => setViewingAnnouncement(row)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
          title="Click to read the full announcement"
        >
          <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>{row.title}</strong>
          <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
            {row.description.length > 70 ? row.description.slice(0, 70) + '…' : row.description}
          </div>
        </button>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => <Badge tone={row.priority === 'URGENT' ? 'danger' : 'primary'}>{row.priority}</Badge>,
    },
    {
      key: 'publishDate',
      label: 'Date',
      render: (row) =>
        row.publishDate
          ? new Date(row.publishDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
          : '—',
    },
  ];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      <PageHeader
        title="Announcements"
        description="View latest workspace announcements and broadcasts."
        action={
          (user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') ? (
            <button
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              New Broadcast
            </button>
          ) : null
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

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading announcements…</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={announcements}
          emptyMessage="No team announcements broadcasted yet."
        />
      )}

      {/* New Team Announcement Modal */}
      <Modal
        open={isModalOpen}
        title="New Team Announcement"
        footer={[
          <button key="cancel" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </button>,
          <button key="save" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Broadcasting…' : 'Send Announcement'}
          </button>,
        ]}
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Title <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="e.g. Sprint Sync Rescheduled to 3 PM"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Announcement Message <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: '90px' }}
              placeholder="Write update details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Priority
            </label>
            <select
              className="input"
              style={{ width: '100%' }}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600 }}>
                Select Team Recipients <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleSelectAllTeam}
              >
                {form.selectedUserIds.length === teamMembers.length ? 'Deselect All' : 'Select All Team'}
              </button>
            </div>

            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '0.5rem',
                display: 'grid',
                gap: '0.4rem',
              }}
            >
              {teamMembers.length > 0 ? (
                teamMembers.map((m) => {
                  const isChecked = form.selectedUserIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        background: isChecked ? 'rgba(68, 97, 242, 0.08)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectUser(m.id)}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.name}</span>
                      <span className="text-secondary" style={{ fontSize: '0.78rem' }}>({m.position || m.role})</span>
                    </label>
                  );
                })
              ) : (
                <p className="text-secondary" style={{ fontSize: '0.85rem', margin: 0, padding: '0.5rem' }}>
                  No team members found.
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Read the full announcement — the table row only ever showed a
          70-character preview with no way to see the rest. */}
      <Modal
        open={!!viewingAnnouncement}
        title={viewingAnnouncement?.title || 'Announcement'}
        footer={[
          <button key="close" className="btn btn-outline" onClick={() => setViewingAnnouncement(null)}>
            Close
          </button>,
        ]}
      >
        {viewingAnnouncement && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Badge tone={viewingAnnouncement.priority === 'URGENT' ? 'danger' : 'primary'}>
                {viewingAnnouncement.priority}
              </Badge>
              <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                {viewingAnnouncement.publishDate
                  ? new Date(viewingAnnouncement.publishDate).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : ''}
              </span>
            </div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {viewingAnnouncement.description}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
