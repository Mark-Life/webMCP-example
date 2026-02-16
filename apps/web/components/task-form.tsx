'use client'

import { useRef, useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { PlusIcon } from 'lucide-react'
import { createTask, updateTask } from '@/app/actions/tasks'
import type { Task, TaskStatus } from '@/lib/orpc/schemas'

/** Dialog for creating or editing a task */
export function TaskForm({ task, children }: { task?: Task; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const isEdit = !!task

  const handleSubmit = async (formData: FormData) => {
    if (isEdit) {
      formData.set('id', task.id)
      await updateTask(formData)
    } else {
      await createTask(formData)
    }
    setOpen(false)
    formRef.current?.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm">
            <PlusIcon />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="grid gap-3">
          <Input
            name="title"
            placeholder="Task title"
            defaultValue={task?.title}
            required
            autoFocus
          />
          <Textarea
            name="description"
            placeholder="Description (optional)"
            defaultValue={task?.description}
            className="min-h-20"
          />
          {isEdit && (
            <Select name="status" defaultValue={task.status}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button type="submit">{isEdit ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
