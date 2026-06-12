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

      console.log(`Scheduler tick at ${now.toISOString()} - due posts: ${postsToPublish.length}`);

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
            user: claimed.user,
            platform: { $in: claimed.platform },
            status: "connected",
            zernioAccountId: { $exists: true },
          });

          if (accounts.length === 0) {
            console.log(`No connected Zernio accounts found for post ${claimed._id}`);
            await Post.findByIdAndUpdate(claimed._id, { status: "failed" });
            continue;
          }

          const zernioPlatforms = accounts.map((acc) => ({
            platform: acc.platform as any,
            accountId: acc.zernioAccountId,
          }));

          const payload = {
            content: claimed.content,
            publishNow: true,
            ...(claimed.mediaUrl ? { mediaUrls: [claimed.mediaUrl] } : {}),
            platforms: zernioPlatforms,
          };

          console.log(`Publishing post ${claimed._id} to Zernio with media: ${claimed.mediaUrl || "none"}`);

          const response = await zernio.posts.createPost({
            body: payload,
          });

          const publishedPost = (response.data as any)?.post || response.data;

          if (!publishedPost) {
            throw new Error("Failed to get post object from Zernio response");
          }

          console.log(`Zernio post created: ${publishedPost._id || publishedPost.id}`);

          await Post.findByIdAndUpdate(claimed._id, { status: "published" });

          await ActivityLog.create({
            user: claimed.user,
            actionType: "POST_PUBLISHED",
            description: `Published post to ${accounts.map((a) => a.platform).join(", ")}`,
            relatedPost: claimed._id,
          });

        } catch (err: any) {
          console.error(`Failed to publish post ${claimed._id}:`, err?.response?.data || err?.message || err);
          console.error("Zernio publish payload:", JSON.stringify(payload, null, 2));
          await Post.findByIdAndUpdate(claimed._id, { status: "failed" });
        }
      }

      if (postsToPublish.length > 0) {
        console.log(`Evaluated ${postsToPublish.length} posts at ${now.toISOString()}`);
      }

    } catch (error: any) {
      console.error("Scheduler error:", error?.message || error);
    }
  }, { timezone: "UTC" });
  console.log("Scheduler service initialized.");
};