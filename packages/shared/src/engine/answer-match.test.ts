/**
 * Answer-matching unit tests (years, Arabic digits, names, spelling).
 */
import { describe, it, expect } from "vitest";
import { answersMatch, expandYearAnswers, normalizeAnswer } from "./utils";

describe("answer matching", () => {
  it("matches Arabic and Western digits", () => {
    expect(
      answersMatch("٢٠١٠", ["2010"], { ar: "2010", en: "2010" })
    ).toBe(true);
    expect(
      answersMatch("2010", ["٢٠١٠"], { ar: "٢٠١٠", en: "2010" })
    ).toBe(true);
  });

  it("accepts year within ±3", () => {
    expect(
      answersMatch("2007", ["2010"], { ar: "2010", en: "2010" })
    ).toBe(true);
    expect(
      answersMatch("2013", ["2010"], { ar: "2010", en: "2010" })
    ).toBe(true);
    expect(
      answersMatch("2006", ["2010"], { ar: "2010", en: "2010" })
    ).toBe(false);
  });

  it("matches first or last name", () => {
    expect(
      answersMatch("ميسي", ["ليونيل ميسي", "messi"], {
        ar: "ليونيل ميسي",
        en: "Lionel Messi",
      })
    ).toBe(true);
    expect(
      answersMatch("Messi", ["ليونيل ميسي"], {
        ar: "ليونيل ميسي",
        en: "Lionel Messi",
      })
    ).toBe(true);
  });

  it("tolerates mild spelling differences", () => {
    expect(
      answersMatch("باريس", ["باريس"], { ar: "باريس", en: "Paris" })
    ).toBe(true);
    expect(
      answersMatch("Paris", ["باريس"], { ar: "باريس", en: "Paris" })
    ).toBe(true);
  });

  it("normalizes alif variants", () => {
    expect(normalizeAnswer("أحمد")).toBe(normalizeAnswer("احمد"));
  });

  it("expandYearAnswers covers ±3", () => {
    const years = expandYearAnswers(2010, 3);
    expect(years).toContain("2007");
    expect(years).toContain("2013");
  });
});
