import { useEffect, useState } from "react";
import { PLATFORMS } from "../assets/assets";
import { PlusIcon } from "lucide-react";
import AccountList from "../components/AccountList";
import PlatformPickerModal from "../components/PlatfromPickerModal";
import toast from "react-hot-toast";
import api from "../api/axios";

const Accounts = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  const fetchAccounts = async (
    isSync = false,
    platform?: string | null,
    successMsg?: string
  ) => {
    try {
      if (isSync) {
        const label = platform
          ? platform.charAt(0).toUpperCase() + platform.slice(1)
          : "Social Media";
        toast.loading(`Syncing ${label} account...`, { id: "sync" });
        await api.get("/api/oauth/sync");
        toast.success(successMsg || "Accounts synced", { id: "sync" });
      }

      const { data } = await api.get("/api/accounts");
      console.log("Accounts data:", data);

      setAccounts(data.filter((a: any) => a && a._id));

    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load accounts"
      );
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedPlatform = params.get("connected");
    const connectedUserName = params.get("username");
    const syncNeeded = params.get("sync") === "true";
    const errorMsg = params.get("error");

    window.history.replaceState({}, document.title, window.location.pathname);

    if (connectedPlatform) {
      const label =
        connectedPlatform.charAt(0).toUpperCase() + connectedPlatform.slice(1);
      const handle = connectedUserName ? ` (@${connectedUserName})` : "";
      fetchAccounts(true, connectedPlatform, `${label}${handle} connected`);
    } else if (errorMsg) {
      toast.error(`Connection failed: ${decodeURIComponent(errorMsg)}`);
      fetchAccounts();
    } else if (syncNeeded) {
      fetchAccounts(true, null, "Accounts synced!");
    } else {
      fetchAccounts();
    }

  }, []);

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    try {
      const { data } = await api.get(`/api/oauth/${platformId}/url`);
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        `Failed to connect ${platformId}`
      );
      setConnecting(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await api.delete(`/api/accounts/${accountId}`);
      toast.success("Account disconnected");
      await fetchAccounts();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to disconnect account"
      );
    }
  };

  const connectedIds = accounts.map((a) => a.platform);

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 text-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl text-slate-900">Connected Accounts</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {accounts.length} of {PLATFORMS.length} platforms connected
          </p>
        </div>

        <button
          onClick={() => setShowPlatformPicker(true)}
          className="flex items-center justify-center w-full gap-2 px-5 py-2.5 font-medium text-white transition-all bg-red-500 rounded-full hover:bg-red-600 sm:w-auto"
        >
          <PlusIcon className="size-4" />
          Connect Account
        </button>
      </div>

      {/* Platform Picker Modal */}
      {showPlatformPicker && (
        <PlatformPickerModal
          connectedIds={connectedIds}
          connecting={connecting}
          onClose={() => setShowPlatformPicker(false)}
          onConnect={handleConnect}
        />
      )}

      {/* Connected Accounts List */}
      <AccountList
        accounts={accounts}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
};

export default Accounts;