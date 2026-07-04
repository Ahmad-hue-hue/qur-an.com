import { describe, expect, it } from "bun:test";
import { marhalahHasOralAssessments } from "@/lib/marhalah-scores";

describe("marhalahHasOralAssessments", () => {
  it("is false for marhalah 1", () => {
    expect(marhalahHasOralAssessments(1)).toBe(false);
  });

  it("is true from marhalah 2 onward", () => {
    expect(marhalahHasOralAssessments(2)).toBe(true);
    expect(marhalahHasOralAssessments(4)).toBe(true);
  });
});
