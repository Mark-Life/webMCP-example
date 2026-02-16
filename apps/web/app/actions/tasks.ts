'use server'

import { revalidatePath } from 'next/cache'
import { serverClient } from '@/lib/orpc/server-client'
import type { TaskStatus } from '@/lib/orpc/schemas'

/** Create a new task from form data */
export const createTask = async (formData: FormData) => {
  await serverClient.tasks.create({
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || '',
  })
  revalidatePath('/')
}

/** Update an existing task */
export const updateTask = async (formData: FormData) => {
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const status = formData.get('status') as TaskStatus | null

  await serverClient.tasks.update({
    id,
    ...(title && { title }),
    ...(description !== null && { description }),
    ...(status && { status }),
  })
  revalidatePath('/')
}

/** Update just the status of a task */
export const updateTaskStatus = async (id: string, status: TaskStatus) => {
  await serverClient.tasks.update({ id, status })
  revalidatePath('/')
}

/** Delete a task by ID */
export const deleteTask = async (id: string) => {
  await serverClient.tasks.delete({ id })
  revalidatePath('/')
}
