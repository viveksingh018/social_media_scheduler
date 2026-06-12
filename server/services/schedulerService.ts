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
        // Atomic claim — status "publishing" set karo pehle
        const claimed = await Post.findOneAndUpdate(
          { _id: post._id, status: "scheduled" },
          { $set: { status: "publishing" } },
          { new: true }
        );

        if (!claimed) {
          console.log(`Post ${post._id} already claimed by another process, skipping.`);
          continue;
        }

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

        console.log(`Publishing post ${claimed._id} to ${accounts.length} platform(s) — media: ${claimed.mediaUrl || "none"}`);

        // Per-platform publish — har platform ke liye alag Zernio call
        let allSuccess = true;
        const publishedPlatforms: string[] = [];

        for (const account of accounts) {
          const singlePayload = {
            content: claimed.content,
            publishNow: true,
            ...(claimed.mediaUrl ? { mediaUrls: [claimed.mediaUrl] } : {}),
            platforms: [
              {
                platform: account.platform,
                accountId: account.zernioAccountId,
              },
            ],
          };

          try {
            const response = await zernio.posts.createPost({
              body: singlePayload,
            });

            const publishedPost = (response.data as any)?.post || response.data;

            if (!publishedPost) {
              throw new Error("No post object in Zernio response");
            }

            publishedPlatforms.push(account.platform);
            console.log(`  ✅ ${account.platform}: ${publishedPost._id || publishedPost.id}`);

          } catch (err: any) {
            allSuccess = false;
            console.error(`  ❌ ${account.platform} failed:`, err?.response?.data || err?.message || err);
          }
        }

        // Update post status + activity log
        if (allSuccess) {
          await Post.findByIdAndUpdate(claimed._id, { status: "published" });

          await ActivityLog.create({
            user: claimed.user,
            actionType: "POST_PUBLISHED",
            description: `Published post to ${publishedPlatforms.join(", ")}`,
            relatedPost: claimed._id,
          });
        } else {
          await Post.findByIdAndUpdate(claimed._id, { status: "failed" });
          console.error(`Post ${claimed._id} failed. Success: ${publishedPlatforms.join(", ") || "none"}`);
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