// src/index.ts
import express, { Express } from "express";
import dotenv from "dotenv";
import GetNotes from "./handler/NotesHandler";
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

const tagsRouter = express.Router();
tagsRouter.use(MockAuthMiddleware())
tagsRouter.get("/tags", GetTags);
tagsRouter.post("/tags", validateData(addTagsSchema), AddTags);
tagsRouter.delete("/tags/:id", DeleteTags);

const notesRouter = express.Router();
notesRouter.get("/notes", GetNotes);

app.use("/v1", tagsRouter, notesRouter);
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
