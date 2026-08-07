import { useState, useEffect, useMemo } from 'react';
import api from '../../../utils/api';
import Modal from '../../../components/common/Modal';
import Badge from '../../../components/common/Badge';
import { useNavigate } from 'react-router-dom';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CreateMeetingModal({ initialData = null, userRole = 'ADMIN', onClose, onSuccess }) {
  const isEditing = !!(initialData && initialData.id);
  const [meetingType, setMeetingType] = useState(initialData?.meetingType || 'SCHEDULED');
  const navigate = useNavigate();
  // Format initial dates
  const defaultDate = initialData?.startTime
    ? new Date(initialData.startTime).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const defaultStart = initialData?.startTime
    ? new Date(initialData.startTime).toTimeString().slice(0, 5)
    : '10:00';
  const defaultEnd = initialData?.endTime
    ? new Date(initialData.endTime).toTimeString().slice(0, 5)
    : '11:00';

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    agenda: initialData?.agenda || '',
    date: defaultDate,
    startTime: defaultStart,
    endTime: defaultEnd,
  });

  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(
    initialData?.participants ? initialData.participants.filter(p => p.participantType === 'INTERNAL' || !p.participantType).map((p) => p.userId).filter(Boolean) : []
  );
  const [externalEmails, setExternalEmails] = useState(
    initialData?.participants ? initialData.participants.filter(p => p.participantType === 'EXTERNAL').map((p) => p.email) : []
  );
  const [newEmail, setNewEmail] = useState('');
  const [googleConnected, setGoogleConnected] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/google/status')
      .then(res => setGoogleConnected(res.data?.data?.connected ?? true))
      .catch(() => setGoogleConnected(false));
  }, []);

  // Fetch employee options
  useEffect(() => {
    let isMounted = true;
    async function loadEmployees() {
      try {
        setFetchingEmployees(true);
        const res = await api.get('/me/directory?limit=200');
        const list = res.data?.data?.employees || res.data?.employees || [];
        if (isMounted) {
          setAvailableEmployees(list);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Failed to load employee list:', err.message);
        }
      } finally {
        if (isMounted) setFetchingEmployees(false);
      }
    }
    loadEmployees();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    let list = availableEmployees;
    if (selectedRoleFilter !== 'ALL') {
      list = list.filter((emp) => emp.role === selectedRoleFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.position?.toLowerCase().includes(q)
    );
  }, [availableEmployees, searchQuery, selectedRoleFilter]);

  const toggleParticipant = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleSelectAll = () => {
    const filteredIds = filteredEmployees.map((emp) => emp.id);
    const allFilteredSelected = filteredIds.every((id) => selectedUserIds.includes(id));

    if (allFilteredSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleAddEmail = () => {
    const email = newEmail.trim();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email address format.');
      return;
    }
    if (externalEmails.includes(email)) {
      setError('Email is already added.');
      return;
    }
    setError('');
    setExternalEmails(prev => [...prev, email]);
    setNewEmail('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let finalTitle = formData.title.trim();
    if (!finalTitle) {
      if (meetingType === 'INSTANT') {
        finalTitle = `Instant Meeting - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        setError('Meeting title is required.');
        return;
      }
    }

    try {
      setLoading(true);

      let startIso, endIso;
      if (meetingType === 'INSTANT') {
        const now = new Date();
        startIso = now.toISOString();
        endIso = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
      } else {
        if (!formData.date || !formData.startTime || !formData.endTime) {
          setError('Please provide date, start time, and end time.');
          setLoading(false);
          return;
        }
        const startDate = new Date(`${formData.date}T${formData.startTime}:00`);
        const endDate = new Date(`${formData.date}T${formData.endTime}:00`);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          setError('Please provide a valid date and time.');
          setLoading(false);
          return;
        }
        if (endDate.getTime() <= startDate.getTime()) {
          setError('End time must be later than start time.');
          setLoading(false);
          return;
        }
        startIso = startDate.toISOString();
        endIso = endDate.toISOString();
      }

      const payload = {
        title: finalTitle,
        description: formData.description.trim() || undefined,
        agenda: formData.agenda.trim() || undefined,
        meetingType,
        startTime: startIso,
        endTime: endIso,
        participantIds: selectedUserIds,
        externalEmails,
      };

      if (isEditing) {
        await api.put(`/meetings/${initialData.id}`, payload);
      } else {
        await api.post('/meetings', payload);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save meeting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={true}
      title={isEditing ? 'Edit Meeting' : 'Create Meeting'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" form="create-meeting-form" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner spinner-sm" /> Saving...
              </span>
            ) : isEditing ? (
              'Update Meeting'
            ) : meetingType === 'INSTANT' ? (
              '⚡ Start Instant Meeting'
            ) : (
              '📅 Schedule Meeting'
            )}
          </button>
        </>
      }
    >
      <form id="create-meeting-form" noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && (
          <div className="card" style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem 1rem' }}>
            {error}
          </div>
        )}

        {/* Meeting Type Selector */}
        {!isEditing && (
          <div style={{ display: 'flex', gap: '0.75rem', padding: '0.25rem', background: '#f1f5f9', borderRadius: '8px' }}>
            <button
              type="button"
              className={`btn btn-sm ${meetingType === 'SCHEDULED' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, textTransform: 'capitalize' }}
              onClick={() => setMeetingType('SCHEDULED')}
            >
              📅 Scheduled Meeting
            </button>
            <button
              type="button"
              className={`btn btn-sm ${meetingType === 'INSTANT' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, textTransform: 'capitalize' }}
              onClick={() => setMeetingType('INSTANT')}
            >
              ⚡ Instant Meeting (Start Now)
            </button>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
            Meeting Title <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            className="input"
            placeholder="e.g. Weekly Product Sync"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        {/* Description & Agenda */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Description
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="Brief summary..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Agenda
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="Key discussion topics..."
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
            />
          </div>
        </div>

        {/* Date & Time (Only if Scheduled) */}
        {meetingType === 'SCHEDULED' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Date
              </label>
              <input
                type="date"
                className="input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Start Time
              </label>
              <input
                type="time"
                className="input"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                End Time
              </label>
              <input
                type="time"
                className="input"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>
        )}

        {/* Participants Selection */}
        <div>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
              Select Participants ({selectedUserIds.length} selected)
            </label>
            {filteredEmployees.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleToggleSelectAll}
                style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.8rem', textTransform: 'none' }}
              >
                {filteredEmployees.every((emp) => selectedUserIds.includes(emp.id))
                  ? '✕ Deselect Listed'
                  : '✓ Select Listed'}
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
            ✉ Google Meet & Email invites will be sent to participants
          </div>

          <input
            className="input"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          />

          {/* Role Filters */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {['ALL', 'ADMIN', 'MANAGER', 'EMPLOYEE'].map((r) => (
              <button
                key={r}
                type="button"
                className={`btn btn-xs ${selectedRoleFilter === r ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', height: 'auto', borderRadius: '4px', textTransform: 'capitalize' }}
                onClick={() => setSelectedRoleFilter(r)}
              >
                {r.toLowerCase()}
              </button>
            ))}
          </div>

          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            {fetchingEmployees ? (
              <div className="text-secondary text-sm" style={{ padding: '1rem', textAlign: 'center' }}>
                Loading workforce list...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-secondary text-sm" style={{ padding: '1rem', textAlign: 'center' }}>
                No matching team members found.
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedUserIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleParticipant(emp.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      border: isSelected ? '1px solid #93c5fd' : '1px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div className="avatar avatar-sm">{getInitials(emp.name)}</div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.2 }}>{emp.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.email}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge tone={emp.role === 'ADMIN' ? 'danger' : emp.role === 'MANAGER' ? 'warning' : 'info'}>
                        {emp.role}
                      </Badge>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* External Emails */}
        <div>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
            Invite by Email (External Guests)
          </label>
          {!googleConnected && (
            <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>Email is not connected. To send meeting invitations, please connect your email account first.</span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  const basePath = userRole === 'ADMIN' ? '/admin' : '/app';
                  navigate(`${basePath}/email`);
                  onClose();
                }}
              >
                Connect Email
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="email"
              className="input"
              placeholder="e.g. client@company.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={!googleConnected}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-outline"
              disabled={!googleConnected || !newEmail.trim()}
              onClick={handleAddEmail}
            >
              + Add
            </button>
          </div>
          {externalEmails.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {externalEmails.map(email => (
                <div key={email} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                  <span>{email}</span>
                  <button type="button" onClick={() => setExternalEmails(prev => prev.filter(e => e !== email))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
