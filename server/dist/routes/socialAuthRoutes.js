import express from "express";
import { generateAuthUrl, syncAccounts } from "../controllers/socialAuthController.js";
const socialAuthRouter = express.Router();
socialAuthRouter.get('/:platform/url', generateAuthUrl);
socialAuthRouter.get('/:sync', syncAccounts);
export default socialAuthRouter;
