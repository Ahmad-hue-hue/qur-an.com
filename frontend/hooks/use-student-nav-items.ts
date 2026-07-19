"use client";

import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api";
import { getNavItems, type NavItem } from "@/components/layout/nav-config";

export function useStudentNavItems(): NavItem[] {
  const { data: navigation } = useQuery({
    queryKey: ["student-navigation"],
    queryFn: studentApi.getNavigationContext,
  });

  return getNavItems("student").map((item) => {
    if (item.label === "Lessons" && navigation) {
      return {
        ...item,
        href: `/marhalah/${navigation.current_marhalah_id}`,
      };
    }
    return item;
  });
}
