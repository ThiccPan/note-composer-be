import { Request, Response } from "express";
import { AuthCredentials, User } from "../types/types";
import { db } from "..";
import { StatusCodes } from "http-status-codes";

const RegisterUsers = async (req: Request, res: Response) => {
  try {
    const userData: AuthCredentials = res.locals.userData

    let reqNewUser = req.body as User
    console.log("body:", reqNewUser)
    const docRef = db.collection(`/notes`).doc(userData.id)
    const isUserExist = (await docRef.get()).exists
    if (isUserExist) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "user already exist" })
      return
    }
    await docRef.set({
      id: userData.id,
      email: reqNewUser.email,
      username: reqNewUser.username
    });
    res.json({ message: "success adding new user" });
  } catch (error) {
    if (error instanceof Error) {
      res.json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
  }
}

const GetCurrentUserData = async (req: Request, res: Response) => {
  try {
    const userData: AuthCredentials = res.locals.userData
    console.log(userData.id)
    const docRef = db.collection(`/notes`).doc(userData.id)
    const userFetchRes = await docRef.get()
    const isUserExist = userFetchRes.exists
    if (!isUserExist) {
      res.status(StatusCodes.BAD_REQUEST)
      throw Error('user not exist')
    }

    const userFetchData = userFetchRes.data() as User
    res.status(StatusCodes.OK).json({
      message: "getting user data successfull",
      data: {
        ...userFetchData
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      res.json({ message: error.message });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
  }
}

export { RegisterUsers, GetCurrentUserData }