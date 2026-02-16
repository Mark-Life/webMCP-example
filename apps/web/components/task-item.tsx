'use client'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { MoreHorizontalIcon, PencilIcon, TrashIcon, CircleIcon, CircleDotIcon, CircleCheckIcon } from 'lucide-react'
import { deleteTask, updateTaskStatus } from '@/app/actions/tasks'
import { TaskForm } from './task-form'
import type { Task, TaskStatus } from '@/lib/orpc/schemas'

const statusConfig: Record<TaskStatus, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: typeof CircleIcon }> = {
  todo: { label: 'Todo', variant: 'outline', icon: CircleIcon },
  'in-progress': { label: 'In Progress', variant: 'secondary', icon: CircleDotIcon },
  done: { label: 'Done', variant: 'default', icon: CircleCheckIcon },
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  todo: 'in-progress',
  'in-progress': 'done',
  done: 'todo',
}

/** Single task row with status badge and actions dropdown */
export function TaskItem({ task }: { task: Task }) {
  const config = statusConfig[task.status]
  const StatusIcon = config.icon

  return (
    <div className="group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50">
      <button
        onClick={() => updateTaskStatus(task.id, nextStatus[task.status])}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title={`Mark as ${nextStatus[task.status]}`}
      >
        <StatusIcon className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </span>
          <Badge variant={config.variant} className="shrink-0">
            {config.label}
          </Badge>
        </div>
        {task.description && (
          <p className="mt-0.5 text-sm text-muted-foreground truncate">{task.description}</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <TaskForm task={task}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
          </TaskForm>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => deleteTask(task.id)}>
            <TrashIcon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
