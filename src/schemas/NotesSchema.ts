import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

export const addNoteSchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string())
}).partial({ content: true })

export type addNoteType = z.infer<typeof addNoteSchema>

export const updateNoteSchema = z.object({
  title: z.string(),
  content: z.string(),
}).partial({
  title: true,
  content: true,
})

export type updateNoteType = z.infer<typeof updateNoteSchema>

export type firebaseAddNote = {
  id: string,
  title: string,
  content: string,
  tagsId: string[],
  createdAt: Timestamp,
  updatedAt: Timestamp
}