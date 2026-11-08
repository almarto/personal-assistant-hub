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
  recordSyncResult: vi.fn(),
}));
vi.mock("@/lib/services/finances/accounts", () => ({
  upsertAccounts: vi.fn(),
}));
vi.mock("@/lib/services/finances/sync", () => ({
  syncConnection: vi.fn(),
}));

import { requireFinances } from "@/lib/auth-guards";
import { createBankingClient } from "@/lib/services/finances/client";
import { upsertAccounts } from "@/lib/services/finances/accounts";
import {
  activateConnectionByState,
  recordSyncResult,
} from "@/lib/services/finances/connections";
import { syncConnection } from "@/lib/services/finances/sync";

import { GET } from "./route";

const requireFinancesMock = vi.mocked(requireFinances);
const createBankingClientMock = vi.mocked(createBankingClient);
const activateMock = vi.mocked(activateConnectionByState);
const upsertMock = vi.mocked(upsertAccounts);
const syncMock = vi.mocked(syncConnection);
const createSessionMock = vi.fn();

const ACCOUNT = {
  uid: "a-1",
  identificationHash: null,
  name: "Main",
  product: null,
  iban: null,
  currency: "EUR",
  raw: {},
};

const SESSION = {
  sessionId: "s-1",
  accounts: [ACCOUNT],
  validUntil: "2027-02-06T00:00:00Z",
};

const STORED_ACCOUNTS = [
  {
    id: "acc-1",
    connectionId: "c-1",
    uid: "a-1",
    identificationHash: null,
    name: "Main",
    product: null,
    ibanLast4: null,
    currency: "EUR",
  },
];

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
    vi.resetAllMocks();
    requireFinancesMock.mockResolvedValue({ user: { id: "u-1" } } as never);
    createBankingClientMock.mockReturnValue({
      createSession: createSessionMock,
    } as never);
  });

  it("stores the session and accounts, imports movements and opens the bank", async () => {
    createSessionMock.mockResolvedValue({ ok: true, value: SESSION });
    activateMock.mockResolvedValue({ id: "c-1" });
    upsertMock.mockResolvedValue(STORED_ACCOUNTS);
    syncMock.mockResolvedValue({ ok: true, insertedBooked: 3 });

    const response = await callback("code=abc&state=state-1");

    expect(location(response)).toBe("/es/finances/c-1");
    expect(createSessionMock).toHaveBeenCalledWith("abc");
    expect(activateMock).toHaveBeenCalledWith({
      userId: "u-1",
      state: "state-1",
      sessionId: "s-1",
      validUntil: "2027-02-06T00:00:00Z",
    });
    expect(upsertMock).toHaveBeenCalledWith("c-1", [ACCOUNT]);
    expect(syncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: "c-1",
        accounts: STORED_ACCOUNTS,
      })
    );
  });

  it("still opens the bank when the initial import fails", async () => {
    createSessionMock.mockResolvedValue({ ok: true, value: SESSION });
    activateMock.mockResolvedValue({ id: "c-1" });
    upsertMock.mockResolvedValue(STORED_ACCOUNTS);
    syncMock.mockResolvedValue({
      ok: false,
      insertedBooked: 0,
      error: "rate limited",
    });

    const response = await callback("code=abc&state=state-1");

    expect(location(response)).toBe("/es/finances/c-1");
  });

  it("still opens the bank when storing the import throws", async () => {
    createSessionMock.mockResolvedValue({ ok: true, value: SESSION });
    activateMock.mockResolvedValue({ id: "c-1" });
    upsertMock.mockRejectedValue(new Error("db down"));

    const response = await callback("code=abc&state=state-1");

    expect(location(response)).toBe("/es/finances/c-1");
    expect(vi.mocked(recordSyncResult)).toHaveBeenCalledWith("c-1", {
      at: expect.any(Date),
      error: "db down",
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
    activateMock.mockResolvedValue(null);

    const response = await callback("code=abc&state=forged");

    expect(location(response)).toBe("/es/finances?error=invalid_state");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("sends users without access to the home page", async () => {
    requireFinancesMock.mockRejectedValue(new Error("Unauthorized"));

    const response = await callback("code=abc&state=state-1");

    expect(location(response)).toBe("/es");
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(activateMock).not.toHaveBeenCalled();
  });
});
