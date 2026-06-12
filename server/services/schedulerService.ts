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

  // SAFER transformations — no g_auto (paid only), no fancy stuff
  // Use f_auto,q_auto for format/quality optimization (free tier supported)
  // Use g_center for always-works center crop

  if (platform === "instagram") {
    // Instagram: 1:1 square, 1080x1080
    return mediaUrl.replace(
      "/upload/",
      "/upload/f_auto,q_auto,w_1080,h_1080,c_fill,g_center/"
    );
  }

  if (platform === "linkedin") {
    // LinkedIn: 1200x627 landscape (1.91:1)
    return mediaUrl.replace(
      "/upload/",
      "/upload/f_auto,q_auto,w_1200,h_627,c_fill,g_center/"
    );
  }

  if (platform === "facebook") {
    // Facebook: 1:1 square
    return mediaUrl.replace(
      "/upload/",
      "/upload/f_auto,q_auto,w_1080,h_1080,c_fill,g_center/"
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

        // Per-platform publish
        let allSuccess = true;
        const publishedPlatforms: string[] = [];
        const failedPlatforms: string[] = [];

        for (const account of accounts) {
          // Platform-specific media URL
          const platformMediaUrl = getMediaUrlForPlatform(
            claimed.mediaUrl,
            claimed.mediaType as "image" | "video" | undefined,
            account.platform
          );

          console.log(`  → ${account.platform} media URL: ${platformMediaUrl || "none"}`);

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
            failedPlatforms.push(account.platform);
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
          console.error(`Post ${claimed._id} failed. Success: ${publishedPlatforms.join(", ") || "none"} | Failed: ${failedPlatforms.join(", ")}`);
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