import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { ActivityLog } from "../models/ActivityLog.js";

// Get all activity
// GET /api/activity
export const getActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Fix 1: Guard req.user before dereferencing _id
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Fetch last 10 activity logs for logged-in user, newest first
    const activity = await ActivityLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("relatedPost", "content");

    res.status(200).json(activity);

  } catch (error: any) {
    // Fix 2: Log internally, return generic message to client
    console.error("getActivity error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};