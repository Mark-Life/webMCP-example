import { z } from 'zod'

export const TaskStatus = z.enum(['todo', 'in-progress', 'done'])

export const Task = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: TaskStatus,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Task = z.infer<typeof Task>
export type TaskStatus = z.infer<typeof TaskStatus>
