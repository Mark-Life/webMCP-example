import { os, ORPCError } from '@orpc/server'
import { z } from 'zod'
import { TaskStatus, Task } from './schemas'
import * as store from './store'

const p = os.$context<{ headers: Headers }>()

const tasks = {
  list: p
    .input(z.object({ status: TaskStatus.optional() }))
    .handler(({ input }) => store.listTasks(input.status)),

  get: p
    .input(z.object({ id: z.string() }))
    .handler(({ input }) => {
      const task = store.getTask(input.id)
      if (!task) throw new ORPCError('NOT_FOUND', { message: 'Task not found' })
      return task
    }),

  create: p
    .input(z.object({ title: z.string(), description: z.string().default('') }))
    .handler(({ input }) => store.createTask(input.title, input.description)),

  update: p
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: TaskStatus.optional(),
      }),
    )
    .handler(({ input }) => {
      const { id, ...data } = input
      const task = store.updateTask(id, data)
      if (!task) throw new ORPCError('NOT_FOUND', { message: 'Task not found' })
      return task
    }),

  delete: p
    .input(z.object({ id: z.string() }))
    .handler(({ input }) => {
      const ok = store.deleteTask(input.id)
      if (!ok) throw new ORPCError('NOT_FOUND', { message: 'Task not found' })
      return { success: true }
    }),

  search: p
    .input(z.object({ query: z.string() }))
    .handler(({ input }) => store.searchTasks(input.query)),
}

export const router = { tasks }
