import { Request, Response } from "express";
import { AuthCredentials, Note } from "../types/types";
import { db } from "..";
import { checkIfUserNotesExist } from "../helper/FirebaseUser";
import { StatusCodes } from "http-status-codes";
import { OrderByDirection, Timestamp } from "firebase-admin/firestore";
import { firebaseAddNote, updateNoteType } from "../schemas/NotesSchema";

const GetNotes = async (req: Request, res: Response) => {
  try {
    console.log("getting notes")
    const userData: AuthCredentials = res.locals.userData
    const isUserCollectionExist = await checkIfUserNotesExist(userData.id)
    if (!isUserCollectionExist) {
      res.status(StatusCodes.BAD_REQUEST)
      throw Error('users not created yet')
    }

    let orderBy: OrderByDirection = "desc"
    if (req.query.order) {
      orderBy = req.query.order as OrderByDirection
      console.log("with order", orderBy)
    }

    let rows = 2
    let rowsQueryParam = req.query.rows as string
    if (rowsQueryParam) {
      rows = Number.parseInt(rowsQueryParam)
    }

    let query = db
      .collection(`/notes/${userData.id}/notes`)
      .orderBy('updatedAt', orderBy)

    let searchQueryParam = req.query.search as string
    if (searchQueryParam) {
      console.log("searching: ", searchQueryParam)
      query = query.where('title', '>=', searchQueryParam)
        .where('title', '<=', searchQueryParam + '\uf8ff')
    }

    console.log('string tagsId:', req.query.tagsId as string)
    console.log('array tagsId:', req.query.tagsId as string[])
    let tagsQueryParam = req.query.tagsId as string[]
    if (tagsQueryParam) {
      if(!Array.isArray(tagsQueryParam)) {
        tagsQueryParam = [tagsQueryParam]
      }
      console.log("with tags: ", tagsQueryParam)
      query = query.where('tagsId', 'array-contains-any', tagsQueryParam)
    }

    let currDate: number
    let afterQueryParam = req.query.after as string
    if (afterQueryParam) {
      console.log(afterQueryParam)
      currDate = Date.parse(afterQueryParam)
      query = query.startAt(Timestamp.fromMillis(currDate))
    }

    let beforeQueryParam = req.query.before as string
    if (beforeQueryParam) {
      console.log(beforeQueryParam)
      currDate = Date.parse(beforeQueryParam)
      query = query.endAt(Timestamp.fromMillis(currDate))
    }

    const data = await query.limit(rows).get()

    let docsList: Note[] = []
    data.forEach(doc => {
      const rawData = doc.data()
      const noteData: Note = {
        id: rawData.id,
        title: rawData.title,
        content: rawData.content,
        tagsId: rawData.tagsId,
        createdAt: (rawData.createdAt as Timestamp).toDate(),
        updatedAt: (rawData.updatedAt as Timestamp).toDate()
      }
      docsList.push(noteData)
    })

    res.json({
      "message": "success",
      "data": docsList
    })
    console.log('done')
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      res.json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

const GetNoteById = async (req: Request, res: Response) => {
  try {
    console.log("getting note by id")
    const userData: AuthCredentials = res.locals.userData
    const isNoteCollectionExist = await checkIfUserNotesExist(userData.id)
    if (!isNoteCollectionExist) {
      res.status(StatusCodes.BAD_REQUEST)
      throw Error('users not created yet')
    }
    console.log(`with id: ${userData.id}`)

    const noteId = req.params.id
    let query = db.collection(`/notes/${userData.id}/notes`).doc(noteId)
    let queryRes = await query.get()
    if (!queryRes.exists) {
      // handler note data doesnt exist
      console.log("data not found")
      res.status(StatusCodes.BAD_REQUEST)
      throw Error(`note with the id ${noteId} not found`)
    }
    console.log('data:', queryRes.data())
    let noteData = queryRes.data() as Note

    res.json({
      "message": "success",
      "data": noteData
    })
  } catch (error) {
    if (error instanceof Error) {
      res.json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
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
        tagsId: reqNewNote.tagsId,
        createdAt: Timestamp.fromDate(reqNewNote.createdAt),
        updatedAt: Timestamp.fromDate(reqNewNote.updatedAt)
      })
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

const UpdateNotes = async (req: Request, res: Response) => {
  try {
    console.log("updating note by id")
    const userData: AuthCredentials = res.locals.userData
    const isNoteCollectionExist = await checkIfUserNotesExist(userData.id)
    if (!isNoteCollectionExist) {
      res.status(StatusCodes.BAD_REQUEST)
      throw Error('users not created yet')
    }
    console.log(`with id: ${userData.id}`)

    const noteId = req.params.id
    let query = db.collection(`/notes/${userData.id}/notes`).doc(noteId)
    let queryRes = await query.get()
    if (!queryRes.exists) {
      // handler note data doesnt exist
      console.log("data not found")
      res.status(StatusCodes.BAD_REQUEST)
      throw Error(`note with the id ${noteId} not found`)
    }
    let noteData = queryRes.data() as Note
    const fieldToUpdate = req.body as updateNoteType
    if (fieldToUpdate.title) {
      noteData.title = fieldToUpdate.title
    }
    if (fieldToUpdate.content) {
      noteData.content = fieldToUpdate.content
    }
    noteData.updatedAt = new Date(Date.now())
    await query.set(noteData)
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

export { GetNotes, GetNoteById, AddNotes, UpdateNotes, DeleteNotes }