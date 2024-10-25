// src/index.ts
import express, { Express } from "express";
import dotenv from "dotenv";
import { AddNotes, DeleteNotes, GetNotes } from "./handler/NotesHandler";
import { AddTags, DeleteTags, GetTags } from "./handler/TagsHandler";

import 'dotenv/config'
import { error } from "console";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { validateData } from "./middleware/ValidationMiddleware";
import { addTagsSchema } from "./schemas/TagsSchema";
import bodyParser from "body-parser";
import { AuthMiddleware, MockAuthMiddleware } from "./middleware/AuthMiddleware";
import { registerUserSchema } from "./schemas/UsersSchema";
import { GetCurrentUserData, RegisterUsers } from "./handler/UserHandler";
import { addNoteSchema } from "./schemas/NotesSchema";

dotenv.config();
const firebaseSecret = process.env.FIREBASE_SECRET
if (!firebaseSecret) {
  error("firebase secret env var not available")
  process.exit(1)
}

const initFirebase = () => {
  const credentials = JSON.parse(firebaseSecret);
  const firebaseApp = initializeApp({
    credential: cert(credentials)
  });

  return firebaseApp
}

const firebaseService = initFirebase()
export const db = getFirestore(firebaseService)
export const auth = getAuth(firebaseService)

const app: Express = express();
const port = process.env.PORT || 8000;
app.use(bodyParser.json());

const usersRouter = express.Router();
usersRouter.use(MockAuthMiddleware())
usersRouter.get('/users', GetCurrentUserData)
usersRouter.post('/users/register', validateData(registerUserSchema), RegisterUsers)

const tagsRouter = express.Router();
tagsRouter.use(MockAuthMiddleware())
tagsRouter.get("/tags", GetTags);
tagsRouter.post("/tags", validateData(addTagsSchema), AddTags);
tagsRouter.delete("/tags/:id", DeleteTags);

const notesRouter = express.Router();
tagsRouter.use(MockAuthMiddleware())
notesRouter.get("/notes", GetNotes);
notesRouter.post("/notes", validateData(addNoteSchema), AddNotes);
notesRouter.delete("/notes/:id", DeleteNotes);

app.use("/v1", usersRouter, tagsRouter, notesRouter);
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
