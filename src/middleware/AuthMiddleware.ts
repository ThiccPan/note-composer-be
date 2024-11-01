import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { auth } from "..";
import { AuthCredentials, User } from "../types/types";

export function AuthMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization
      if (!token) {
        throw Error("")
      }
      console.log("token is exist:", token != null)
      const decodedToken = await auth.verifyIdToken(token!, true)
      const userData: AuthCredentials = {
        id: decodedToken.uid,
        email: decodedToken.email!
      }
      res.locals.userData = userData
      next();
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'unauthorized', message: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
      }
    }
  };
}

export function MockAuthMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const mockUserData: AuthCredentials = {
      id: "Sop1oTuWNFM6WhBL4F6f",
      email: "user1@gmail.com"
    }
    res.locals.userData = mockUserData
    next()
  }
}
