// src/index.ts
import express, { Express } from "express";
import dotenv from "dotenv";
import GetNotes from "./handler/NotesHandler";

import 'dotenv/config'
import { error } from "console";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const app: Express = express();
const port = process.env.PORT || 8000;

const router = express.Router();
router.get("/notes", GetNotes);

app.use("/v1", router);
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
