import { test, expect, describe } from "bun:test";
import { parseSupplyCategories } from "../src/lib/registration";

describe("parseSupplyCategories", () => {
  test("splits a comma-separated string into trimmed items (an array, not a string)", () => {
    expect(parseSupplyCategories("Basmati rice, pulses, spices")).toEqual([
      "Basmati rice",
      "pulses",
      "spices",
    ]);
  });

  test("splits on newlines too and drops blanks", () => {
    expect(parseSupplyCategories("rice\n\npulses, ,spices\n")).toEqual([
      "rice",
      "pulses",
      "spices",
    ]);
  });

  test("de-duplicates case-insensitively, preserving first spelling/order", () => {
    expect(parseSupplyCategories("Rice, rice, RICE, Pulses")).toEqual(["Rice", "Pulses"]);
  });

  test("returns an empty array for empty input", () => {
    expect(parseSupplyCategories("")).toEqual([]);
    expect(parseSupplyCategories("  , ,  ")).toEqual([]);
  });
});
