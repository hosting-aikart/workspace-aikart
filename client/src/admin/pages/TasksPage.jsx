import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';

const tasks = [
  {
    id: 'T1',
    title: 'Review onboarding flow',
    priority: 'High',
    status: 'In Progress',
    assignedTo: 'Rohan Verma',
    assignedBy: 'Aisha Khan',
    dueDate: 'Aug 05',
  },
  {
    id: 'T2',
    title: 'Prepare department report',
    priority: 'Medium',
    status: 'Pending',
    assignedTo: 'Neha Singh',
    assignedBy: 'Aisha Khan',
    dueDate: 'Aug 08',
  },
  {
    id: 'T3',
    title: 'Schedule team sync',
    priority: 'Low',
    status: 'Completed',
    assignedTo: 'Aisha Khan',
    assignedBy: 'Neha Singh',
    dueDate: 'Aug 01',
  },
];

const columns = [
  { key: 'id', label: 'Task ID' },
  { key: 'title', label: 'Task' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'assignedTo', label: 'Assigned Employee' },
  { key: 'assignedBy', label: 'Assigned By' },
  { key: 'dueDate', label: 'Due Date' },
  {
    key: 'actions',
    label: 'Actions',
    render: () => <button className="btn btn-outline btn-sm">Open</button>,
  },
];

export default function TasksPage() {
  // TODO: Replace mock tasks with backend-managed task data.
  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Coordinate work items across the workspace."
        action={<button className="btn btn-primary">+ Create Task</button>}
      />
      <DataTable
        columns={columns}
        rows={tasks}
        emptyMessage="No tasks found."
      />
    </div>
  );
}
