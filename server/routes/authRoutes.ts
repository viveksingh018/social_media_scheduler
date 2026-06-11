import { Router } from "express";
import { User } from "../models/User.js";
import { loginUser, registerUser } from "../middlewares/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const authRouter = Router();

authRouter.post('/register', registerUser)
authRouter.post('/login', loginUser)

export default authRouter;