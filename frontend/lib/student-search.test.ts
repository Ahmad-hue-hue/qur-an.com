import { describe, expect, test } from "bun:test";
import { matchesStudentSearch } from "@/lib/student-search";
import type { User } from "@/lib/types";

const student: User = {
  id: "1",
  email: "student@example.com",
  first_name: "Ahmad",
  last_name: "Hassan",
  phone: "966501234567",
  role: "student",
  registration_number: "1.6.1A",
  is_suspended: false,
  current_marhalah: 1,
  date_joined: "2026-01-01",
};

describe("matchesStudentSearch", () => {
  test("empty query matches all", () => {
    expect(matchesStudentSearch(student, "")).toBe(true);
    expect(matchesStudentSearch(student, "   ")).toBe(true);
  });

  test("matches by name", () => {
    expect(matchesStudentSearch(student, "ahmad")).toBe(true);
    expect(matchesStudentSearch(student, "hassan")).toBe(true);
    expect(matchesStudentSearch(student, "Ali")).toBe(false);
  });

  test("does not match every student when query has no digits", () => {
    expect(matchesStudentSearch(student, "zzz")).toBe(false);
  });

  test("matches by phone digits", () => {
    expect(matchesStudentSearch(student, "501234")).toBe(true);
    expect(matchesStudentSearch(student, "999999")).toBe(false);
  });

  test("matches registration number and email", () => {
    expect(matchesStudentSearch(student, "1.6.1")).toBe(true);
    expect(matchesStudentSearch(student, "student@")).toBe(true);
  });
});
