import cron from "node-cron";
import { Post } from "../models/Post.js";
import { Account } from "../models/Account.js";
import zernio from "../config/zernio.js";
import { ActivityLog } from "../models/ActivityLog.js";

export const initScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const postsToPublish = await Post.find({
        status: "scheduled",
        scheduledFor: { $lte: now },
      });

      for (const post of postsToPublish) {
        // Fix 1: Atomic claim — status "publishing" set karo pehle
        // Taaki overlapping cron ticks ya multiple server instances same post na uthayein
        const claimed = await Post.findOneAndUpdate(
          { _id: post._id, status: "scheduled" }, // sirf "scheduled" wale uthao
          { $set: { status: "publishing" } },      // turant "publishing" mark karo
          { new: true }
        );

        // Agar kisi aur cron tick ne already claim kar liya — skip karo
        if (!claimed) {
          console.log(`Post ${post._id} already claimed by another process, skipping.`);
          continue;
        }

        try {
          // Find all connected Zernio accounts for this post's platforms
          const accounts = await Account.find({
            user: post.user,
            platform: { $in: post.platform },
            status: "connected",
            zernioAccountId: { $exists: true },
          });

          if (accounts.length === 0) {
            console.log(`No connected Zernio accounts found for post ${post._id}`);
            // No accounts — mark as failed
            post.status = "failed";
            await post.save();
            continue;
          }

          const zernioPlatforms = accounts.map((acc) => ({
            platform: acc.platform as any,
            accountId: acc.zernioAccountId,
          }));

          const payload = {
            content: post.content,
            publishNow: true,
            ...(post.mediaUrl
              ? {
                  mediaItems: [
                    {
                      type: post.mediaType || "image",
                      url: post.mediaUrl,
                    },
                  ],
                }
              : {}),
            platforms: zernioPlatforms,
          };

          console.log(`Publishing post ${post._id} to Zernio with media: ${post.mediaUrl || "none"}`);

          const response = await zernio.posts.createPost({
            body: payload,
          });

          const publishedPost = (response.data as any)?.post || response.data;

          if (!publishedPost) {
            throw new Error("Failed to get post object from Zernio response");
          }

          console.log(`Zernio post created: ${publishedPost._id || publishedPost.id}`);

          // Mark post as published
          post.status = "published";
          await post.save();

          // Log activity
          await ActivityLog.create({
            user: post.user,
            actionType: "POST_PUBLISHED",
            description: `Published post to ${accounts.map((a) => a.platform).join(", ")}`,
            relatedPost: post._id,
          });

        } catch (err: any) {
          console.error(
            `Failed to publish post ${post._id}:`,
            err?.response?.data || err?.message
          );

          // Mark post as failed so it won't be retried automatically
          post.status = "failed";
          await post.save();
        }
      }

      if (postsToPublish.length > 0) {
        console.log(`Evaluated ${postsToPublish.length} posts at ${now.toISOString()}`);
      }

    } catch (error: any) {
      // Fix 2: error: any — proper logging
      console.error("Scheduler error:", error?.message || error);
    }
  });

  console.log("Scheduler service initialized.");
};