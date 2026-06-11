import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { GoogleGenAI } from "@google/genai";
import { HfInference } from "@huggingface/inference";
import { Generation } from "../models/Generations.js";
import cloudinary from "../config/cloudinary.js";

// Helper function: Upload buffer to Cloudinary
const uploadToCloudinary = (buffer: Buffer): Promise<{ secure_url: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "generated-posts" },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// Helper function: Delay for retry logic
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Helper function: Generate image with retry + timeout (AbortController)
const generateImageWithRetry = async (imagePrompt: string): Promise<string> => {
  // Validate HUGGINGFACE_API_KEY before use
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) {
    throw new Error("HUGGINGFACE_API_KEY is missing. Please add it to your .env file.");
  }

  const hf = new HfInference(hfKey);
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Fix 1: AbortController — 30 second timeout per attempt (prevents infinite hang)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      // Fix 2: Pass signal for timeout + remove unnecessary cast (HF v4.13+ returns Blob directly)
      const imageBlob = await hf.textToImage(
        {
          model: "stabilityai/stable-diffusion-xl-base-1.0",
          inputs: imagePrompt,
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      // Convert Blob to Buffer for Cloudinary upload
      const arrayBuffer = await imageBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Cloudinary and return URL
      const uploadResult = await uploadToCloudinary(buffer);
      return uploadResult.secure_url;

    } catch (err: any) {
      clearTimeout(timeout);

      // Last attempt — throw immediately, don't delay
      if (attempt === maxRetries) {
        throw new Error(`Image generation failed after ${maxRetries} attempts: ${err?.message}`);
      }

      // Wait before retry
      console.log(`Attempt ${attempt} failed, retrying in 5s... (${err?.message})`);
      await delay(5000);
    }
  }

  throw new Error("Image generation failed unexpectedly.");
};

// Generate post
// POST /api/posts/generate
export const generatePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Fix 3: Guard req.user before dereferencing _id
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { prompt, tone, generateImage } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ message: "Gemini API Key is missing. Please add it to your server/.env file." });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // Generate text content using Gemini
    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a social media post based on this prompt: "${prompt}".
      Tone: ${tone}.
      Include relevant hashtags.
      Format the response as JSON with "content" and "imagePrompt" fields.
      The "imagePrompt" should be a highly descriptive prompt for an image generator that complements the post.`,
    });

    let content = "";
    let imagePrompt = prompt;

    try {
      const rawText = textResponse.text || "";

      // Extract JSON from Gemini response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        content: rawText,
        imagePrompt: prompt,
      };

      content = data.content;
      imagePrompt = data.imagePrompt;
    } catch (e: any) {
      // Fallback if JSON parsing fails
      content = textResponse.text || "";
    }

    let mediaUrl = "";
    let mediaType: "image" | "video" | undefined = undefined;

    // Option 1: AI generate image using Hugging Face
    if (generateImage) {
      try {
        // Generate image and upload to Cloudinary — returns URL directly
        mediaUrl = await generateImageWithRetry(imagePrompt);
        mediaType = "image";
      } catch (error: any) {
        // Image generation failed — post will be saved without image
        console.error("Image generation/upload error:", error?.message || error);
      }
    }

    // Option 2: User manually uploaded an image
    if (req.file && !generateImage) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        mediaUrl = uploadResult.secure_url;
        mediaType = "image";
      } catch (error: any) {
        console.error("User image upload error:", error?.message || error);
      }
    }

    // Save generated post to database
    const generation = await Generation.create({
      user: req.user._id,
      prompt,
      content,
      mediaUrl,
      mediaType,
      tone,
    });

    // Return saved generation as response
    res.status(200).json(generation);

  } catch (error: any) {
    console.error("generatePost error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all generations for logged-in user
// GET /api/posts/generations
export const getGenerations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Guard req.user before dereferencing _id
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const generations = await Generation.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(generations);
  } catch (error: any) {
    console.error("getGenerations error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all scheduled posts for logged-in user
// GET /api/posts
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Guard req.user before dereferencing _id
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.status(200).json({ message: "Posts coming soon" });
  } catch (error: any) {
    console.error("getPosts error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Schedule a post
// POST /api/posts
export const schedulePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Guard req.user before dereferencing _id
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.status(200).json({ message: "Schedule post coming soon" });
  } catch (error: any) {
    console.error("schedulePost error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};