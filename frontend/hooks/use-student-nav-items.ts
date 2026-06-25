"use client";

import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { getNavItems, type NavItem } from "@/components/layout/nav-config";

export function useStudentNavItems(): NavItem[] {
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: studentApi.getDashboard,
  });

  return getNavItems("student").map((item) => {
    if (item.label === "Lessons" && dashboard?.current_marhalah) {
      return {
        ...item,
        href: `/marhalah/${dashboard.current_marhalah.id}`,
      };
    }
    return item;
  });
}
