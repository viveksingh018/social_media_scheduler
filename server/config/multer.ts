import multer from "multer";

// Memory storage — file buffer mein rahega, disk pe nahi
const storage = multer.memoryStorage();

export const upload = multer({ storage });