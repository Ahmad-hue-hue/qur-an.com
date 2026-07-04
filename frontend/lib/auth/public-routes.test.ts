import { describe, expect, it } from "bun:test";
import { buildLoginRedirectPath, isPublicPath } from "@/lib/auth/public-routes";

describe("isPublicPath", () => {
  it("allows auth pages", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/admin/login")).toBe(true);
  });

  it("blocks protected pages", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/admin")).toBe(false);
    expect(isPublicPath("/admin/students")).toBe(false);
    expect(isPublicPath("/teacher/exercises")).toBe(false);
  });
});

describe("buildLoginRedirectPath", () => {
  it("includes next for protected destinations", () => {
    expect(buildLoginRedirectPath("/admin/students", "")).toBe(
      "/login?next=%2Fadmin%2Fstudents"
    );
    expect(buildLoginRedirectPath("/dashboard", "?tab=1")).toBe(
      "/login?next=%2Fdashboard%3Ftab%3D1"
    );
  });

  it("omits next for home", () => {
    expect(buildLoginRedirectPath("/", "")).toBe("/login");
  });
});
