import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/services/user-roles", () => ({ userHasAppRole: vi.fn() }));
vi.mock("@/lib/services/wellness/families", () => ({
  getFamilyIdForUser: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { userHasAppRole } from "@/lib/services/user-roles";

import { requireFinances } from "./auth-guards";

const getSessionMock = vi.mocked(auth.api.getSession);
const userHasAppRoleMock = vi.mocked(userHasAppRole);

const SESSION = { user: { id: "user-1", role: "user" } };

describe("requireFinances", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    userHasAppRoleMock.mockReset();
  });

  it("rejects when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(requireFinances()).rejects.toThrow(
      "Unauthorized: Authentication required"
    );
  });

  it("rejects a signed-in user without the finances role", async () => {
    getSessionMock.mockResolvedValue(SESSION as never);
    userHasAppRoleMock.mockResolvedValue(false);

    await expect(requireFinances()).rejects.toThrow(
      "Unauthorized: finances role required"
    );
    expect(userHasAppRoleMock).toHaveBeenCalledWith(
      "user-1",
      "user",
      "finances"
    );
  });

  it("resolves to the session when the user has access", async () => {
    getSessionMock.mockResolvedValue(SESSION as never);
    userHasAppRoleMock.mockResolvedValue(true);

    await expect(requireFinances()).resolves.toBe(SESSION);
  });
});
