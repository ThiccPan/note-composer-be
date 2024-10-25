import { Request, Response } from "express";
import { AuthCredentials, Note, Tag } from "../types/types";
import { db } from "..";
import { StatusCodes } from "http-status-codes";
import { checkIfUserNotesExist } from "../helper/FirebaseUser";

const GetTags = async (req: Request, res: Response) => {
  const userData: AuthCredentials = res.locals.userData
  const isNoteCollectionExist = await checkIfUserNotesExist(userData.id)
  if (!isNoteCollectionExist) {
    res.status(StatusCodes.BAD_REQUEST)
    throw Error('users not created yet')
  }

  const data = await db.collection(`/notes/${userData.id}/tags`).get()
  if (data.empty) {
    res.status(StatusCodes.NOT_FOUND).json({ error: "no tags found" })
    return
  }
  let tagsList: Tag[] = []
  data.forEach(doc => {
    const tagData: Tag = {
      id: doc.id,
      description: doc.data().description
    }
    tagsList.push(tagData)
  })

  res.json({
    "message": "success",
    "data": tagsList
  })
}

const AddTags = async (req: Request, res: Response) => {
  try {
    const userData: AuthCredentials = res.locals.userData
    const isNoteCollectionExist = await checkIfUserNotesExist(userData.id)
    if (!isNoteCollectionExist) {
      res.status(StatusCodes.BAD_REQUEST)
      throw Error('users not created yet')
    }

    let reqNewTag = req.body as Tag
    console.log("body:", reqNewTag)
    const docRef = db.collection(`/notes/${userData.id}/tags`).doc(reqNewTag.id)
    const isTagExist = (await docRef.get()).exists
    if (isTagExist) {
      res.status(400).json({ message: "tag already exist" })
      return
    }
    await docRef.set({
      description: reqNewTag.description ? reqNewTag.description : "",
      notes: []
    });
    res.json({ message: "success adding new tag" });
  } catch (error) {
    if (error instanceof Error) {
      res.json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

const UpdateTags = async (req: Request, res: Response) => {

}

const DeleteTags = async (req: Request, res: Response) => {
  try {
    const userData = res.locals.userData as AuthCredentials
    const isNoteCollectionExist = await checkIfUserNotesExist(userData.id)
    if (!isNoteCollectionExist) {
      res.status(StatusCodes.BAD_REQUEST)
      throw Error('users not created yet')
    }

    const tagId = req.params.id
    const tagDocRef = db.collection(`/notes/${userData.id}/tags`).doc(tagId)
    await db.runTransaction(async (t) => {
      const tagFetchRes = await t.get(tagDocRef)
      if (!tagFetchRes.exists) {
        res.status(404)
        throw Error("tag is not found")
      }
      console.log("deleting tag notes")

      // delete tag that occur in each notes where the tag is used
      const tagNotesDocRef = tagDocRef.collection("tagNotes")
      const tagNotesDocList = await tagNotesDocRef.listDocuments()
      tagNotesDocList.forEach((tagNoteDoc) => {
        const noteIdToUpdate = tagNoteDoc.id
        const noteDocRefToUpdate = db.collection(`notes/${userData.id}/notes`).doc(noteIdToUpdate)

        const noteTagDocRefToDelete = noteDocRefToUpdate.collection("noteTags").doc(tagId)
        t.delete(noteTagDocRefToDelete)
      })

      // delete tag data
      t.delete(tagDocRef)
    })
    res.json({ message: "tag successfully deleted" });
  } catch (error) {
    if (error instanceof Error) {
      res.json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export { GetTags, AddTags, UpdateTags, DeleteTags }