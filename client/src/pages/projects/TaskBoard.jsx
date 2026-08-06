import { useMemo, useState } from 'react';

const STATUS_COLUMNS = [
  { key: 'TODO', label: 'Todo' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' },
  { key: 'ITERATE', label: 'Iterate' },
];

const statusClassMap = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-sky-100 text-sky-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  ITERATE: 'bg-amber-100 text-amber-700',
};

const priorityClassMap = {
  URGENT: 'bg-rose-100 text-rose-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  LOW: 'bg-gray-100 text-gray-700',
};

export default function TaskBoard({
  tasks = [],
  canManage = false,
  onMoveTask,
  onCreateTask,
  onEditTask,
  onDeleteTask,
}) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const groupedTasks = useMemo(() => {
    return STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.key] = tasks.filter((task) => task.status === column.key);
      return acc;
    }, {});
  }, [tasks]);

  const handleDrop = (status) => {
    if (!draggedTaskId) return;
    onMoveTask?.(draggedTaskId, status);
    setDraggedTaskId(null);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {STATUS_COLUMNS.map((column) => (
        <div
          key={column.key}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(column.key)}
          className="rounded-xl border border-gray-200 bg-gray-50 p-3 min-h-70"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {column.label}
              </h3>
              <p className="text-xs text-gray-500">
                {groupedTasks[column.key].length} task(s)
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => onCreateTask?.(column.key)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                + Add
              </button>
            )}
          </div>

          <div className="space-y-2">
            {groupedTasks[column.key].length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3 text-center text-xs text-gray-500">
                Drop tasks here
              </div>
            ) : (
              groupedTasks[column.key].map((task) => (
                <div
                  key={task.id}
                  draggable={canManage}
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onDragEnd={() => setDraggedTaskId(null)}
                  className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {task.title}
                      </p>
                      {task.description ? (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTask?.(task)}
                          className="text-xs text-gray-500 hover:text-indigo-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask?.(task)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClassMap[task.status] || statusClassMap.TODO}`}
                    >
                      {column.label}
                    </span>
                    {task.priority ? (
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${priorityClassMap[task.priority] || priorityClassMap.LOW}`}
                      >
                        {task.priority}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
