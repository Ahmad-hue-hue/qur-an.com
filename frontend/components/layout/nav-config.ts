import {
  Home01Icon,
  BookOpen01Icon,
  UserIcon,
  DashboardSquare01Icon,
  UserGroupIcon,
  File01Icon,
  Task01Icon,
  Analytics01Icon,
} from "@hugeicons/core-free-icons";

export type NavVariant = "student" | "admin" | "teacher";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home01Icon;
}

export const studentNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home01Icon },
  { href: "/marhalah/1", label: "Lessons", icon: BookOpen01Icon },
  { href: "/results", label: "Results", icon: Task01Icon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/admin/students", label: "Students", icon: UserGroupIcon },
  { href: "/admin/teachers", label: "Teachers", icon: UserGroupIcon },
  { href: "/admin/topics", label: "Content", icon: File01Icon },
  { href: "/admin/results", label: "Results", icon: Analytics01Icon },
];

export const teacherNav: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/teacher/students", label: "Students", icon: UserGroupIcon },
  { href: "/teacher/exercises", label: "Exercises", icon: Task01Icon },
  { href: "/teacher/exams", label: "Exams", icon: File01Icon },
  { href: "/teacher/results", label: "Results", icon: Analytics01Icon },
];

export function getNavItems(variant: NavVariant): NavItem[] {
  if (variant === "admin") return adminNav;
  if (variant === "teacher") return teacherNav;
  return studentNav;
}
