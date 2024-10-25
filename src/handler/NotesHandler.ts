import { Request, Response } from "express";
import { AuthCredentials, Note } from "../types/types";
import { db } from "..";
import { checkIfUserNotesExist } from "../helper/FirebaseUser";
import { StatusCodes } from "http-status-codes";
import { Timestamp } from "firebase-admin/firestore";

const GetNotes = async (req: Request, res: Response) => {
  const userData: AuthCredentials = res.locals.userData
  const isUserCollectionExist = await checkIfUserNotesExist(userData.id)
  if (!isUserCollectionExist) {
    res.status(StatusCodes.BAD_REQUEST)
    throw Error('users not created yet')
  }

  let rowsQueryParam = req.query.rows as string
  let rows = 10
  if (rowsQueryParam) {
    rows = Number.parseInt(rowsQueryParam)
  }

  let searchQueryParam = req.query.search as string

  let currDate: number
  let afterQueryParam = req.query.after as string

  let query =
    db.collection(`/notes/${userData.id}/notes`)
      .orderBy('createdAt', 'desc')

  if (searchQueryParam) {
    console.log("searching: ", searchQueryParam)
    query = query.where('title', '>=', searchQueryParam)
      .where('title', '<=', searchQueryParam + '\uf8ff')
  }
  if (afterQueryParam) {
    console.log(afterQueryParam)
    currDate = Date.parse(afterQueryParam)
    query = query.startAfter(Timestamp.fromMillis(currDate))
  }

  const data = await query.limit(rows).get()

  let docsList: Note[] = []
  data.forEach(doc => {
    const rawData = doc.data()
    const noteData: Note = {
      id: rawData.id,
      title: rawData.title,
      content: rawData.content,
      tagsId: rawData.tags,
      createdAt: (rawData.createdAt as Timestamp).toDate(),
      updatedAt: (rawData.updatedAt as Timestamp).toDate()
    }
    docsList.push(noteData)
  })

  res.json({
    "message": "success",
    "data": docsList
  })
}

const AddNotes = async (req: Request, res: Response) => {
  try {
    const userData: AuthCredentials = res.locals.userData
    const isUserCollectionExist = await checkIfUserNotesExist(userData.id)
    if (!isUserCollectionExist) {
      res.status(StatusCodes.BAD_REQUEST)
      throw Error('users not created yet')
    }

    await db.runTransaction(async (t) => {
      const docRef = db.collection(`/notes/${userData.id}/notes`).doc()
      let reqNewNote: Note = {
        id: docRef.id,
        title: req.body.title,
        content: req.body.content,
        tagsId: req.body.tags,
        createdAt: Timestamp.now().toDate(),
        updatedAt: Timestamp.now().toDate()
      }

      // in the tags collection add note id to the tagNotes subcollection
      if (reqNewNote.tagsId) {
        // read block for checking if tag exist
        await Promise.all(reqNewNote.tagsId.map(async (noteTagId) => {
          const tagRef = db.collection(`/notes/${userData.id}/tags`).doc(noteTagId)
          const tagFetchRes = await t.get(tagRef)
          if (!tagFetchRes.exists) {
            throw Error(`tag: ${noteTagId} not found`)
          }
        }))

        reqNewNote.tagsId.forEach(async (noteTagId) => {
          const tagRef = db.collection(`/notes/${userData.id}/tags`).doc(noteTagId)
          const tagNotesRef = tagRef.collection(`/tagNotes`)
          t.create(tagNotesRef.doc(docRef.id), {})
        })
      }

      // add new note document and data field
      t.create(docRef, {
        id: docRef.id,
        title: reqNewNote.title,
        content: reqNewNote.content,
        createdAt: Timestamp.fromDate(reqNewNote.createdAt),
        updatedAt: Timestamp.fromDate(reqNewNote.updatedAt)
      })

      // add each note tag to the noteTags subcollection
      if (reqNewNote.tagsId) {
        const docNoteTagsRef = docRef.collection('/noteTags')
        reqNewNote.tagsId.forEach((noteTag) => {
          t.create(docNoteTagsRef.doc(noteTag), {})
        })
      }
    })

    res.json({ message: "success adding new note" });
  } catch (error) {
    if (error instanceof Error) {
      res.json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

const DeleteNotes = async (req: Request, res: Response) => {
  try {
    // check if user collection exist
    const userData: AuthCredentials = res.locals.userData
    const isUserCollectionExist = await checkIfUserNotesExist(userData.id)
    if (!isUserCollectionExist) {
      res.status(StatusCodes.BAD_REQUEST)
      throw Error('users not created yet')
    }

    const deletedNoteId = req.params.id

    // delete note occurence in tagNotes collection
    await db.runTransaction(async (t) => {
      const noteRef = db.collection(`/notes/${userData.id}/notes`).doc(deletedNoteId)
      const noteTagsRef = await noteRef.collection(`noteTags`).listDocuments()

      noteTagsRef.forEach((tagDocIdRef) => {
        // /notes/Sop1oTuWNFM6WhBL4F6f/tags/tag 6/tagNotes/note1
        const tagNotesRef = db.collection(`/notes/${userData.id}/tags/${tagDocIdRef.id}/tagNotes`).doc(deletedNoteId)
        console.log("deleted tagNotes path", tagNotesRef.path)
        t.delete(tagNotesRef)
      })

      // delete note
      t.delete(noteRef)
    })
    res.json({ message: "success deleting note" });
  } catch (error) {
    if (error instanceof Error) {
      res.json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export { GetNotes, AddNotes, DeleteNotes }