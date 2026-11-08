import { describe, expect, it } from "vitest";

import { APP_ROLE, Role } from "@/lib/types/roles";

import type { UserFormValues } from "./user-form-state";
import { clearPasswordFields, isFormDirty } from "./user-form-state";

const BASE: UserFormValues = {
  name: "Ana",
  username: "ana",
  email: "ana@example.com",
  password: "",
  confirmPassword: "",
  currentPassword: "",
  role: Role.USER,
  appRoles: [APP_ROLE.FINANCES],
};

describe("isFormDirty", () => {
  it("is clean when nothing changed", () => {
    expect(isFormDirty({ ...BASE }, BASE)).toBe(false);
  });

  it("is dirty when a text field changed", () => {
    expect(isFormDirty({ ...BASE, name: "Ana M" }, BASE)).toBe(true);
    expect(isFormDirty({ ...BASE, password: "x" }, BASE)).toBe(true);
  });

  it("compares app roles as a set", () => {
    const base: UserFormValues = {
      ...BASE,
      appRoles: [APP_ROLE.FINANCES, APP_ROLE.TRIP_PLANNER],
    };
    expect(
      isFormDirty(
        { ...base, appRoles: [APP_ROLE.TRIP_PLANNER, APP_ROLE.FINANCES] },
        base
      )
    ).toBe(false);
    expect(isFormDirty({ ...base, appRoles: [APP_ROLE.FINANCES] }, base)).toBe(
      true
    );
  });
});

describe("clearPasswordFields", () => {
  it("empties the three password fields and keeps the rest", () => {
    const filled = {
      ...BASE,
      password: "New-1",
      confirmPassword: "New-1",
      currentPassword: "Old-1",
    };
    expect(clearPasswordFields(filled)).toEqual(BASE);
  });
});
