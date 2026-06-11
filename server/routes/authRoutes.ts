import { Router } from "express";
import { User } from "../models/User.js";
import { loginUser, registerUser } from "../middlewares/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const authRouter = Router();

authRouter.post('/register', protect, registerUser)
authRouter.post('/login', protect, loginUser)

export default authRouter;