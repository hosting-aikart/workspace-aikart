import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';

const projects = [
  {
    id: 'P1',
    name: 'CRM Launch',
    progress: '72%',
    deadline: 'Aug 20',
    status: 'On Track',
    members: '8',
  },
  {
    id: 'P2',
    name: 'HR Portal',
    progress: '45%',
    deadline: 'Sep 02',
    status: 'Planning',
    members: '5',
  },
  {
    id: 'P3',
    name: 'Attendance Sync',
    progress: '90%',
    deadline: 'Aug 10',
    status: 'Review',
    members: '4',
  },
];

const columns = [
  { key: 'id', label: 'Project ID' },
  { key: 'name', label: 'Project Name' },
  { key: 'progress', label: 'Progress' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'status', label: 'Status' },
  { key: 'members', label: 'Members' },
  {
    key: 'actions',
    label: 'Actions',
    render: () => <button className="btn btn-outline btn-sm">Open</button>,
  },
];

export default function ProjectsPage() {
  // TODO: Replace mock project data with live project records from the backend.
  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Track initiatives, deadlines, and progress."
        action={<button className="btn btn-primary">+ Create Project</button>}
      />
      <DataTable
        columns={columns}
        rows={projects}
        emptyMessage="No projects found."
      />
    </div>
  );
}
