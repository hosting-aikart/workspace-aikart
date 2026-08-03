import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';

const meetings = [
  {
    id: 'M1',
    title: 'Weekly Sync',
    participants: '8',
    date: 'Aug 03',
    time: '10:00 AM',
    link: 'Join',
    status: 'Scheduled',
  },
  {
    id: 'M2',
    title: 'Project Review',
    participants: '5',
    date: 'Aug 05',
    time: '02:00 PM',
    link: 'Join',
    status: 'Pending',
  },
  {
    id: 'M3',
    title: 'HR Check-in',
    participants: '4',
    date: 'Aug 06',
    time: '11:30 AM',
    link: 'Join',
    status: 'Scheduled',
  },
];

const columns = [
  { key: 'title', label: 'Meeting Title' },
  { key: 'participants', label: 'Participants' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'link', label: 'Meeting Link' },
  { key: 'status', label: 'Status' },
  {
    key: 'actions',
    label: 'Actions',
    render: () => <button className="btn btn-outline btn-sm">Open</button>,
  },
];

export default function MeetingsPage() {
  // TODO: Replace mock meetings with backend-managed meeting data.
  return (
    <div>
      <PageHeader
        title="Meetings"
        subtitle="View meeting schedules and planning details."
        action={<button className="btn btn-primary">+ Create Meeting</button>}
      />
      <DataTable
        columns={columns}
        rows={meetings}
        emptyMessage="No meetings scheduled."
      />
    </div>
  );
}
