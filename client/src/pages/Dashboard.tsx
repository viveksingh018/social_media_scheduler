import {
  ActivityIcon,
  CheckCircleIcon,
  ClockIcon,
  SendIcon,
  Share2Icon,
  TrendingUpIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  dummyAccountsData,
  dummyActivityData,
  dummyPostsData,
} from "../assets/assets";

const Dashboard = () => {
  // Dashboard statistics
  const [stats, setStats] = useState({
    scheduled: 0,
    published: 0,
    connectedAccounts: 0,
  });

  // Recent activities
  const [activities, setActivities] = useState<any>([]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [postRes, accountsRes, activityRes] = [
          { data: dummyPostsData },
          { data: dummyAccountsData },
          { data: dummyActivityData },
        ];

        const posts = postRes.data;

        // Calculate dashboard stats
        setStats({
          scheduled: posts.filter(
            (post: any) => post.status === "scheduled"
          ).length,

          published: posts.filter(
            (post: any) => post.status === "published"
          ).length,

          connectedAccounts: accountsRes.data.filter(
            (account: any) => account.status === "connected"
          ).length,
        });

        // Set activity feed data
        setActivities(activityRes.data);
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  // Statistics cards configuration
  const statCards = [
    {
      label: "Scheduled Posts",
      value: stats.scheduled,
      icon: ClockIcon,
      trend: "+2 today",
    },
    {
      label: "Published Posts",
      value: stats.published,
      icon: CheckCircleIcon,
      trend: "All time",
    },
    {
      label: "Connected Accounts",
      value: stats.connectedAccounts,
      icon: Share2Icon,
      trend: "Active",
    },
  ];

  return (
    <div className="space-y-8">
      {/* =========================
          Welcome Section
      ========================== */}
      <div>
        <h2 className="text-2xl text-slate-900">
          Good morning!
        </h2>

        <p className="text-slate-500">
          Here's what's happening with your social accounts today.
        </p>
      </div>

      {/* =========================
          Stats Cards
      ========================== */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-red-200 hover:bg-red-50"
          >
            <div className="mb-4 flex items-center justify-between">
              {/* Stat Value */}
              <div className="text-3xl font-medium text-slate-800 tabular-nums">
                {card.value}
              </div>

              {/* Trend */}
              <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-red-500">
                <TrendingUpIcon className="size-3" />
                {card.trend}
              </div>
            </div>

            {/* Stat Label */}
            <p className="mt-1 text-sm text-slate-500">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* =========================
          Activity Feed
      ========================== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-slate-900">
            Recent Activity
          </h2>

          <span className="text-sm text-slate-400">
            {activities.length} events
          </span>
        </div>

        {/* Empty State */}
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100">
              <ActivityIcon className="size-6 text-slate-400" />
            </div>

            <p className="text-slate-500">
              No activity yet
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Connect accounts and schedule posts to see events here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activities.map((activity: any) => (
              <div
                key={activity._id}
                className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50"
              >
                {/* Activity Icon */}
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  <SendIcon className="size-4" />
                </div>

                {/* Activity Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      Published
                    </span>

                    <span className="shrink-0 text-xs text-slate-400">
                      {new Date(
                        activity.createdAt
                      ).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;