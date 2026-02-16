import { serverClient } from '@/lib/orpc/server-client'
import { TaskItem } from '@/components/task-item'
import { TaskForm } from '@/components/task-form'
import { ListTodoIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tasks = await serverClient.tasks.list({})

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ListTodoIcon className="size-6" />
          <h1 className="text-2xl font-bold">Tasks</h1>
          <span className="text-sm text-muted-foreground">({tasks.length})</span>
        </div>
        <TaskForm />
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
          <ListTodoIcon className="size-10 mb-3" />
          <p className="text-sm">No tasks yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
