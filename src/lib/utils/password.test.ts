import { describe, expect, it } from "vitest";

import { generatePassword, isStrongPassword } from "./password";

describe("isStrongPassword", () => {
  it("accepts 8 characters with upper case, lower case and a digit", () => {
    expect(isStrongPassword("Abcdefg1")).toBe(true);
  });

  it("rejects 7 characters", () => {
    expect(isStrongPassword("Abcdef1")).toBe(false);
  });

  it("accepts 128 characters and rejects 129", () => {
    const base = "Aa1";
    expect(isStrongPassword(base + "x".repeat(125))).toBe(true);
    expect(isStrongPassword(base + "x".repeat(126))).toBe(false);
  });

  it.each([
    ["an upper case letter", "abcdefg1"],
    ["a lower case letter", "ABCDEFG1"],
    ["a digit", "Abcdefgh"],
  ])("rejects a password without %s", (_missing, password) => {
    expect(isStrongPassword(password)).toBe(false);
  });

  it("accepts what generatePassword produces", () => {
    expect(isStrongPassword(generatePassword())).toBe(true);
  });
});
