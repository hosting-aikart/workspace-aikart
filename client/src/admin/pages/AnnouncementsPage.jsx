import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';

const announcements = [
  {
    id: 'A1',
    title: 'Policy Update',
    audience: 'All Employees',
    status: 'Published',
    date: 'Aug 01',
  },
  {
    id: 'A2',
    title: 'Office Reminder',
    audience: 'Managers',
    status: 'Draft',
    date: 'Aug 02',
  },
  {
    id: 'A3',
    title: 'Project Launch',
    audience: 'Engineering',
    status: 'Published',
    date: 'Aug 03',
  },
];

const columns = [
  { key: 'title', label: 'Announcement' },
  { key: 'audience', label: 'Audience' },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  {
    key: 'actions',
    label: 'Actions',
    render: () => <button className="btn btn-outline btn-sm">Review</button>,
  },
];

export default function AnnouncementsPage() {
  // TODO: Replace mock announcements with backend content management.
  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Share updates and internal comms."
        action={
          <button className="btn btn-primary">+ Create Announcement</button>
        }
      />
      <DataTable
        columns={columns}
        rows={announcements}
        emptyMessage="No announcements found."
      />
    </div>
  );
}
