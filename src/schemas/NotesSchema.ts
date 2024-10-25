import { z } from "zod";

export const addNoteSchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string())
}).partial({ content: true })