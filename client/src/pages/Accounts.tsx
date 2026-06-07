import { useEffect, useState } from "react";

import { dummyAccountsData, PLATFORMS } from "../assets/assets";
import { PlusIcon } from "lucide-react";

import AccountList from "../components/AccountList";
import PlatformPickerModal from "../components/PlatfromPickerModal";

const Accounts = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  const fetchAccounts = async (
    isSync = false,
    platform?: string | null,
    successMsg?: string
  ) => {
    setAccounts(dummyAccountsData);
    console.log(isSync, platform, successMsg);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);

    setTimeout(() => {
      setConnecting(null);

      setAccounts((prev) => [
        ...prev,
        {
          ...dummyAccountsData[0],
          _id: Date.now().toString(),
          platform: platformId,
        },
      ]);

      setShowPlatformPicker(false);
    }, 1000);
  };

  const handleDisconnect = async (accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a._id !== accountId));
  };

  const connectedIds = accounts.map((a) => a.platform);

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 text-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl text-slate-900">
            Connected Accounts
          </h2>

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