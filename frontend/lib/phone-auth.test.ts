import { phoneAuthEmail, formatPhoneDisplay, isSyntheticPhoneEmail } from "./phone-auth";

describe("phoneAuthEmail", () => {
  it("builds student and teacher synthetic emails", () => {
    expect(phoneAuthEmail("+255 712 345 678", "student")).toBe(
      "255712345678@students.tajweed.local"
    );
    expect(phoneAuthEmail("966501234567", "teacher")).toBe(
      "966501234567@teachers.tajweed.local"
    );
  });
});

describe("formatPhoneDisplay", () => {
  it("strips non-digits", () => {
    expect(formatPhoneDisplay("+255 712")).toBe("255712");
    expect(formatPhoneDisplay("")).toBe("—");
  });
});

describe("isSyntheticPhoneEmail", () => {
  it("detects synthetic domains", () => {
    expect(isSyntheticPhoneEmail("1@students.tajweed.local")).toBe(true);
    expect(isSyntheticPhoneEmail("x@teachers.tajweed.local")).toBe(true);
    expect(isSyntheticPhoneEmail("admin@gmail.com")).toBe(false);
  });
});
