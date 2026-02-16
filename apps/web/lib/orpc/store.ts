import type { Task } from './schemas'

const STORE_KEY = Symbol.for('webmcp-task-store')

interface TaskStore {
  tasks: Task[]
  nextId: number
}

/** Shared via globalThis so route handlers and server components use the same instance */
function getStore(): TaskStore {
  const g = globalThis as any
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = {
      tasks: [
        {
          id: '1',
          title: 'Set up oRPC backend',
          description: 'Install oRPC and create router with procedures',
          status: 'done',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        {
          id: '2',
          title: 'Build frontend UI',
          description: 'Create task list page with shadcn components',
          status: 'in-progress',
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
        },
        {
          id: '3',
          title: 'Wire up WebMCP',
          description: 'Expose oRPC procedures as WebMCP tools',
          status: 'todo',
          createdAt: new Date('2025-01-03'),
          updatedAt: new Date('2025-01-03'),
        },
      ],
      nextId: 4,
    } satisfies TaskStore
  }
  return g[STORE_KEY]
}

/** Get all tasks, optionally filtered by status */
export const listTasks = (status?: Task['status']) => {
  const { tasks } = getStore()
  return status ? tasks.filter((t) => t.status === status) : [...tasks]
}

/** Get a single task by ID */
export const getTask = (id: string) => getStore().tasks.find((t) => t.id === id)

/** Create a new task */
export const createTask = (title: string, description: string) => {
  const store = getStore()
  const task: Task = {
    id: String(store.nextId++),
    title,
    description,
    status: 'todo',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  store.tasks.push(task)
  return task
}

/** Update an existing task */
export const updateTask = (
  id: string,
  data: Partial<Pick<Task, 'title' | 'description' | 'status'>>,
) => {
  const task = getStore().tasks.find((t) => t.id === id)
  if (!task) return null
  Object.assign(task, data, { updatedAt: new Date() })
  return task
}

/** Delete a task by ID */
export const deleteTask = (id: string) => {
  const { tasks } = getStore()
  const idx = tasks.findIndex((t) => t.id === id)
  if (idx === -1) return false
  tasks.splice(idx, 1)
  return true
}

/** Search tasks by keyword in title/description */
export const searchTasks = (query: string) => {
  const q = query.toLowerCase()
  return getStore().tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q),
  )
}
