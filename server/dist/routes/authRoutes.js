import { Router } from "express";
import { loginUser, registerUser } from "../middlewares/authController.js";
const authRouter = Router();
authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
export default authRouter;
