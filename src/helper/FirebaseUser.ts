import { db } from ".."

const checkIfUserCollectionExist = async (userId: string): Promise<boolean> => {
  const tagDocRef = db.collection(`/notes/`).doc(userId)
  const tagDocData = await tagDocRef.get()
  return tagDocData.exists
}

export { checkIfUserCollectionExist as checkIfUserNotesExist }