import express from "express";
import { generatePost, getGenerations, getPosts, schedulePost } from "../controllers/postContoller.js";
import { protect } from "../middlewares/authMiddleware.js";
import { upload } from "../config/multer.js";
const router = express.Router();
router.post("/generate", protect, upload.single("image"), generatePost);
router.get("/generations", protect, getGenerations);
router.get("/", protect, getPosts);
router.post("/", protect, upload.single("media"), schedulePost); // video wale jaisa
export default router;
