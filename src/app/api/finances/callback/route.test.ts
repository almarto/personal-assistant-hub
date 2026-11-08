import { beforeEach, describe, expect, it, vi } from "vitest";

// i18n/routing creates next-intl navigation helpers that cannot load under vitest.
vi.mock("@/i18n/routing", () => ({ routing: { defaultLocale: "es" } }));
vi.mock("@/lib/auth-guards", () => ({ requireFinances: vi.fn() }));
vi.mock("@/lib/services/finances/config", () => ({
  getEnableBankingConfig: vi.fn(() => ({ appId: "app-1" })),
}));
vi.mock("@/lib/services/finances/client", () => ({
  createBankingClient: vi.fn(),
}));
vi.mock("@/lib/services/finances/connections", () => ({
  activateConnectionByState: vi.fn(),
}));

import { requireFinances } from "@/lib/auth-guards";
import { createBankingClient } from "@/lib/services/finances/client";
import { activateConnectionByState } from "@/lib/services/finances/connections";

import { GET } from "./route";

const requireFinancesMock = vi.mocked(requireFinances);
const createBankingClientMock = vi.mocked(createBankingClient);
const activateMock = vi.mocked(activateConnectionByState);
const createSessionMock = vi.fn();

const SESSION = {
  sessionId: "s-1",
  accounts: [{ uid: "a-1", name: "Main" }],
  validUntil: "2027-02-06T00:00:00Z",
};

function callback(query: string) {
  return GET(
    new Request(`https://localhost:3000/api/finances/callback?${query}`)
  );
}

function location(response: Response): string {
  const url = new URL(response.headers.get("location") ?? "");
  return `${url.pathname}${url.search}`;
}

describe("GET /api/finances/callback", () => {
  beforeEach(() => {
    requireFinancesMock.mockReset();
    activateMock.mockReset();
    createSessionMock.mockReset();
    requireFinancesMock.mockResolvedValue({ user: { id: "u-1" } } as never);
    createBankingClientMock.mockReturnValue({
      createSession: createSessionMock,
    } as never);
  });

  it("stores the session and redirects to the finances page", async () => {
    createSessionMock.mockResolvedValue({ ok: true, value: SESSION });
    activateMock.mockResolvedValue(true);

    const response = await callback("code=abc&state=state-1");

    expect(location(response)).toBe("/es/finances");
    expect(createSessionMock).toHaveBeenCalledWith("abc");
    expect(activateMock).toHaveBeenCalledWith({
      userId: "u-1",
      state: "state-1",
      ...SESSION,
    });
  });

  it("reports a cancelled authorization without creating a session", async () => {
    const response = await callback("error=access_denied&state=state-1");

    expect(location(response)).toBe("/es/finances?error=access_denied");
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it.each(["state=state-1", "code=abc"])(
    "rejects a callback missing a parameter (%s)",
    async (query) => {
      const response = await callback(query);

      expect(location(response)).toBe("/es/finances?error=invalid_request");
      expect(createSessionMock).not.toHaveBeenCalled();
    }
  );

  it("reports a failed session creation and stores nothing", async () => {
    createSessionMock.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 400, message: "bad code" },
    });

    const response = await callback("code=abc&state=state-1");

    expect(location(response)).toBe("/es/finances?error=session_failed");
    expect(activateMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown, reused or foreign state", async () => {
    createSessionMock.mockResolvedValue({ ok: true, value: SESSION });
    activateMock.mockResolvedValue(false);

    const response = await callback("code=abc&state=forged");

    expect(location(response)).toBe("/es/finances?error=invalid_state");
  });

  it("sends users without access to the home page", async () => {
    requireFinancesMock.mockRejectedValue(new Error("Unauthorized"));

    const response = await callback("code=abc&state=state-1");

    expect(location(response)).toBe("/es");
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(activateMock).not.toHaveBeenCalled();
  });
});
