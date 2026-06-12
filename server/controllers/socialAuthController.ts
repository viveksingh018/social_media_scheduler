import { Response } from "express";
import zernio from "../config/zernio.js";
import { User } from "../models/User.js";
import { Account } from "../models/Account.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";

// Helper to ensure user has a Zernio Profile
const getOrCreateZernioProfile = async (user: any): Promise<string> => {
  if (!user?._id) {
    throw new Error("Unauthorized: user not found in request");
  }

  try {
    // Check if user already has a zernioProfileId saved
    if (user.zernioProfileId) {
      return user.zernioProfileId;
    }

    const result = await zernio.profiles.listProfiles();
    const data = result.data as any;
    const profiles: any[] = Array.isArray(data)
      ? data
      : data?.profiles || data?.data || [];

    if (profiles.length > 0) {
      const pid = profiles[0]._id || profiles[0].id;
      await User.findByIdAndUpdate(user._id, { zernioProfileId: pid });
      return pid;
    }

    // Create new profile if none exists
    const createResult = await zernio.profiles.createProfile({
      body: { name: `${user.name || user.email}'s workspace` } as any,
    });

    const created = (createResult.data as any)?.profile || createResult.data;
    const pid = created?._id || created?.id;

    if (!pid) {
      throw new Error("Failed to create Zernio profile - no ID returned");
    }

    await User.findByIdAndUpdate(user._id, { zernioProfileId: pid });
    return pid;

  } catch (error: any) {
    console.error("getOrCreateZernioProfile Error:", error?.message || error);
    throw error;
  }
};

// Generate OAuth authorization URL
// GET /api/oauth/:platform/url
export const generateAuthUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { platform } = req.params;
    const profileId = await getOrCreateZernioProfile(req.user);

    const origin = req.headers.origin;
    const redirectUrl = `${origin}/accounts`;

    const result = await zernio.connect.getConnectUrl({
      path: { platform: platform as any },
      query: {
        profileId,
        redirect_url: redirectUrl,
      },
    });

    const data = result.data as any;
    const authUrl = data.authUrl;

    if (!authUrl) {
      throw new Error(`Zernio returned no authUrl. Full response: ${JSON.stringify(data)}`);
    }

    res.json({ url: authUrl });

  } catch (error: any) {
    console.error("generateAuthUrl error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Sync connected accounts from Zernio into MongoDB
// GET /api/oauth/sync
export const syncAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const profileId = await getOrCreateZernioProfile(req.user);

    const result = await zernio.accounts.listAccounts({
      query: { profileId } as any,
    });

    const data = result.data as any;
    const zernioAccounts: any[] = data?.accounts || (Array.isArray(data) ? data : []);

    const supportedPlatforms = ["twitter", "linkedin", "facebook", "instagram"];
    const syncedAccounts = [];

    for (const zAccount of zernioAccounts) {
      const zid = zAccount._id || zAccount.id;

      if (!zid) {
        console.warn("Skipping account with no ID:", zAccount);
        continue;
      }

      const rawPlatform = (
        zAccount.platform ||
        zAccount.platforms ||
        zAccount.type ||
        ""
      ).toLowerCase();

      const normalizedPlatform = supportedPlatforms.find((p) =>
        rawPlatform.includes(p)
      );

      if (!normalizedPlatform) {
        console.warn(`Skipping unsupported platform: "${rawPlatform}"`);
        continue;
      }

      const account = await Account.findOneAndUpdate(
        { zernioAccountId: zid },
        {
          user: req.user._id,
          platform: normalizedPlatform,
       
          handle:
            zAccount.displayName ||
            zAccount.username ||
            zAccount.name ||
            zAccount.handle ||
            "Unknown",
          zernioAccountId: zid,
          status: "connected",
          avatarUrl:
            zAccount.profilePicture ||
            zAccount.avatarUrl ||
            zAccount.picture ||
            zAccount.profile_image_url,
        },
        { upsert: true, new: true }
      );

      syncedAccounts.push(account);
    }

    res.json(syncedAccounts);

  } catch (error: any) {
    console.error("syncAccounts error:", error?.message || error);
    res.status(500).json({ message: "Internal server error" });
  }
};