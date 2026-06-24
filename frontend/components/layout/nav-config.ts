import {
  Home01Icon,
  BookOpen01Icon,
  Task01Icon,
  UserIcon,
  DashboardSquare01Icon,
  UserGroupIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";

export type NavVariant = "student" | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home01Icon;
}

export const studentNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home01Icon },
  { href: "/marhalah/1", label: "Lessons", icon: BookOpen01Icon },
  { href: "/assessments", label: "Assessments", icon: Task01Icon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/admin/students", label: "Students", icon: UserGroupIcon },
  { href: "/admin/topics", label: "Content", icon: File01Icon },
  { href: "/admin/exercises", label: "Assessments", icon: Task01Icon },
];

export function getNavItems(variant: NavVariant): NavItem[] {
  return variant === "admin" ? adminNav : studentNav;
}
