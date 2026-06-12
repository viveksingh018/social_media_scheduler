import cron from "node-cron";
import { Post } from "../models/Post.js";
import { Account } from "../models/Account.js";
import zernio from "../config/zernio.js";
import { ActivityLog } from "../models/ActivityLog.js";

// Helper: Transform media URL per platform's aspect ratio requirements
const getMediaUrlForPlatform = (
  mediaUrl: string | null | undefined,
  mediaType: "image" | "video" | undefined,
  platform: string
): string | undefined => {
  if (!mediaUrl) return undefined;

  // Videos don't need aspect ratio transform
  if (mediaType === "video") return mediaUrl;

  // Only transform Cloudinary URLs
  if (!mediaUrl.includes("res.cloudinary.com")) return mediaUrl;

  // Instagram requires aspect ratio between 0.75 and 1.91
  // Square 1:1 (1080x1080) is the safest
  if (platform === "instagram") {
    return mediaUrl.replace(
      "/upload/",
      "/upload/ar_1:1,c_fill,g_auto,w_1080,h_1080/"
    );
  }

  // LinkedIn accepts 1.91:1 landscape
  if (platform === "linkedin") {
    return mediaUrl.replace(
      "/upload/",
      "/upload/ar_1.91:1,c_fill,g_auto,w_1200,h_627/"
    );
  }

  // Facebook: similar to Instagram
  if (platform === "facebook") {
    return mediaUrl.replace(
      "/upload/",
      "/upload/ar_1:1,c_fill,g_auto,w_1080,h_1080/"
    );
  }

  return mediaUrl;
};

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
        // Atomic claim
        const claimed = await Post.findOneAndUpdate(
          { _id: post._id, status: "scheduled" },
          { $set: { status: "publishing" } },
          { new: true }
        );

        if (!claimed) {
          console.log(`Post ${post._id} already claimed by another process, skipping.`);
          continue;
        }

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

        // Per-platform publish — har platform ke liye alag Zernio call + alag media URL
        let allSuccess = true;
        const publishedPlatforms: string[] = [];

        for (const account of accounts) {
          // Platform-specific media URL (Instagram ko 1:1, LinkedIn ko 1.91:1)
          const platformMediaUrl = getMediaUrlForPlatform(
            claimed.mediaUrl,
            claimed.mediaType as "image" | "video" | undefined,
            account.platform
          );

          const mediaItems = platformMediaUrl
            ? [{ type: (claimed.mediaType as "image" | "video") || "image", url: platformMediaUrl }]
            : undefined;

          const singlePayload: any = {
            content: claimed.content,
            publishNow: true,
            platforms: [
              {
                platform: account.platform,
                accountId: account.zernioAccountId,
              },
            ],
          };

          if (mediaItems) {
            singlePayload.mediaItems = mediaItems;
          }

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