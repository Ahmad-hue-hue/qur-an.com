"use client";

import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: studentApi.getProfile,
  });

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: studentApi.getDashboard,
  });

  const academicItems = profile
    ? [
        {
          label: "Current Marḥalah",
          value: `Marḥalah ${profile.current_marhalah}`,
        },
        { label: "Progress", value: `${profile.progress_percent}%` },
        {
          label: "Topics Completed",
          value: `${profile.topics_completed}/${profile.total_topics}`,
        },
        {
          label: "Exercises",
          value: dashboard?.recent_results.exercises.length
            ? `${dashboard.recent_results.exercises[0].score}/${dashboard.recent_results.exercises[0].max_score}`
            : "—",
        },
        { label: "Exams", value: "—" },
        {
          label: "Halaqah",
          value: dashboard?.halaqah
            ? `${dashboard.halaqah.score}/${dashboard.halaqah.max_score}`
            : "—",
        },
        {
          label: "Tadreeb",
          value: dashboard?.tadreeb
            ? `${dashboard.tadreeb.score}/${dashboard.tadreeb.max_score}`
            : "—",
        },
        {
          label: "Overall Average",
          value: `${profile.overall_average}%`,
          highlight: true,
        },
      ]
    : [];

  return (
    <AppShell>
      {isLoading && (
        <>
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        </>
      )}

      {!isLoading && profile && (
        <>
          <PageHeader title="My Profile">
            <div className="flex items-center gap-4 mt-4">
              <Avatar className="h-16 w-16 border-2 border-gold">
                <AvatarFallback className="bg-emerald-light text-emerald-deep text-lg font-semibold">
                  {profile.first_name[0]}
                  {profile.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-cream">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-gold text-sm">
                  {profile.registration_number || "Pending Assignment"}
                </p>
                <p className="text-cream/60 text-xs mt-0.5">
                  Joined {format(new Date(profile.date_joined), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </PageHeader>

          <div className="px-4 py-6 space-y-6">
            <Card className="card-shadow -mt-4">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-emerald-deep mb-3">
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">
                      {profile.first_name} {profile.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{profile.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registration Number</span>
                    <span className="font-medium text-gold">
                      {profile.registration_number || "Pending Assignment"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-emerald-deep mb-3">
                  Overall Progress
                </h3>
                <Progress
                  value={profile.progress_percent}
                  className="h-3 bg-emerald-light [&>div]:bg-gold mb-2"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {profile.progress_percent}% of Marḥalah {profile.current_marhalah}
                </p>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-emerald-deep mb-3">
                  Academic Information
                </h3>
                <div className="space-y-3">
                  {academicItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between text-sm py-1"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span
                        className={
                          item.highlight
                            ? "font-bold text-gold text-base"
                            : "font-medium"
                        }
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              Sign Out
            </Button>
          </div>
        </>
      )}

      <BottomNav />
    </AppShell>
  );
}
