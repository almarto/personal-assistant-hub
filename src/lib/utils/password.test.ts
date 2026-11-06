import { describe, expect, it, vi } from "vitest";

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

describe("generatePassword", () => {
  it("has the expected length", () => {
    expect(generatePassword()).toHaveLength(12);
  });

  it("does not rely on Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    generatePassword();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("produces different passwords on successive calls", () => {
    const passwords = new Set(Array.from({ length: 20 }, generatePassword));
    expect(passwords.size).toBe(20);
  });
});
