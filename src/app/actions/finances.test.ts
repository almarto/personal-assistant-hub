import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-guards", () => ({ requireFinances: vi.fn() }));
vi.mock("@/lib/services/finances/config", () => ({
  getEnableBankingConfig: vi.fn(() => ({ appId: "app-1" })),
}));
vi.mock("@/lib/services/finances/client", () => ({
  createBankingClient: vi.fn(),
}));
vi.mock("@/lib/services/finances/connections", () => ({
  createPendingConnection: vi.fn(),
  discardConnection: vi.fn(),
  findConnectionForUser: vi.fn(),
}));
vi.mock("@/lib/services/finances/accounts", () => ({
  listAccountsForConnection: vi.fn(),
}));
vi.mock("@/lib/services/finances/sync", () => ({ syncConnection: vi.fn() }));

import { revalidatePath } from "next/cache";

import { requireFinances } from "@/lib/auth-guards";
import { listAccountsForConnection } from "@/lib/services/finances/accounts";
import { createBankingClient } from "@/lib/services/finances/client";
import type { BankConnection } from "@/lib/services/finances/connections";
import {
  createPendingConnection,
  discardConnection,
  findConnectionForUser,
} from "@/lib/services/finances/connections";
import { syncConnection } from "@/lib/services/finances/sync";

import {
  discardConnectionAction,
  retryConnectionAction,
  startConnectionAction,
  syncNowAction,
} from "./finances";

const requireFinancesMock = vi.mocked(requireFinances);
const createClientMock = vi.mocked(createBankingClient);
const createPendingMock = vi.mocked(createPendingConnection);
const discardMock = vi.mocked(discardConnection);
const findMock = vi.mocked(findConnectionForUser);
const listAccountsMock = vi.mocked(listAccountsForConnection);
const syncMock = vi.mocked(syncConnection);
const revalidateMock = vi.mocked(revalidatePath);
const listAspspsMock = vi.fn();
const startAuthorizationMock = vi.fn();

const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const VALID_FORM = {
  aspspCountry: "DE",
  aspspName: "Trade Republic",
  psuType: "personal",
};

const BASE_CONNECTION = {
  id: CONNECTION_ID,
  aspspName: "Trade Republic",
  aspspCountry: "DE",
  aspspLogo: null,
  psuType: "business" as const,
  createdAt: "2026-11-08T10:00:00.000Z",
  lastSyncedAt: null,
  lastSyncError: null,
};

const PENDING: BankConnection = {
  ...BASE_CONNECTION,
  status: "pending",
  state: "old",
};

const ACTIVE: BankConnection = {
  ...BASE_CONNECTION,
  status: "active",
  sessionId: "s-1",
  validUntil: "2027-02-06T00:00:00.000Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  requireFinancesMock.mockResolvedValue({ user: { id: "u-1" } } as never);
  createClientMock.mockReturnValue({
    listAspsps: listAspspsMock,
    startAuthorization: startAuthorizationMock,
  } as never);
  createPendingMock.mockResolvedValue({ id: "c-new", state: "state-1" });
  listAspspsMock.mockResolvedValue({
    ok: true,
    value: [
      {
        name: "Trade Republic",
        country: "DE",
        logo: "https://enablebanking.com/brands/DE/Trade_Republic/",
        maximumConsentValiditySeconds: 86_400,
      },
    ],
  });
  startAuthorizationMock.mockResolvedValue({
    ok: true,
    value: { url: "https://bank.example/auth" },
  });
});

describe("startConnectionAction", () => {
  it.each([
    { ...VALID_FORM, aspspCountry: "Spain" },
    { ...VALID_FORM, aspspCountry: "de" },
    { ...VALID_FORM, psuType: "other" },
    { ...VALID_FORM, aspspName: "  " },
  ])("rejects invalid input (%j) without touching the API", async (fields) => {
    const result = await startConnectionAction(form(fields));

    expect(result.success).toBe(false);
    expect(listAspspsMock).not.toHaveBeenCalled();
    expect(createPendingMock).not.toHaveBeenCalled();
  });

  it("rejects a user without access", async () => {
    requireFinancesMock.mockRejectedValue(new Error("Unauthorized"));

    const result = await startConnectionAction(form(VALID_FORM));

    expect(result.success).toBe(false);
    expect(createPendingMock).not.toHaveBeenCalled();
  });

  it("rejects a bank that is not in the country's list", async () => {
    listAspspsMock.mockResolvedValue({ ok: true, value: [] });

    const result = await startConnectionAction(form(VALID_FORM));

    expect(result.success).toBe(false);
    expect(createPendingMock).not.toHaveBeenCalled();
  });

  it("returns the API error and hides the attempt when the authorization cannot start", async () => {
    startAuthorizationMock.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 400, message: "nope" },
    });

    const result = await startConnectionAction(form(VALID_FORM));

    expect(result).toEqual({ success: false, error: "nope" });
    expect(discardMock).toHaveBeenCalledWith("u-1", "c-new");
  });

  it("creates a pending connection with the logo and redirects to the bank", async () => {
    await expect(startConnectionAction(form(VALID_FORM))).rejects.toThrow(
      "REDIRECT:https://bank.example/auth"
    );

    expect(listAspspsMock).toHaveBeenCalledWith("DE");
    expect(createPendingMock).toHaveBeenCalledWith({
      userId: "u-1",
      aspspName: "Trade Republic",
      aspspCountry: "DE",
      aspspLogo: "https://enablebanking.com/brands/DE/Trade_Republic/",
      psuType: "personal",
    });
    const params = startAuthorizationMock.mock.calls[0][0];
    expect(params).toMatchObject({
      aspsp: { name: "Trade Republic", country: "DE" },
      psuType: "personal",
      state: "state-1",
    });
    // The bank's 1-day consent cap must win over the 90-day default.
    const validUntil = new Date(params.validUntil).getTime();
    expect(validUntil - Date.now()).toBeLessThanOrEqual(86_400_000);
  });
});

describe("retryConnectionAction", () => {
  it("returns not found for another user's connection and changes nothing", async () => {
    findMock.mockResolvedValue(null);

    const result = await retryConnectionAction(
      form({ connectionId: CONNECTION_ID })
    );

    expect(result).toEqual({ success: false, error: "Connection not found" });
    expect(findMock).toHaveBeenCalledWith("u-1", CONNECTION_ID);
    expect(createPendingMock).not.toHaveBeenCalled();
    expect(discardMock).not.toHaveBeenCalled();
  });

  it("refuses to retry an active connection", async () => {
    findMock.mockResolvedValue(ACTIVE);

    const result = await retryConnectionAction(
      form({ connectionId: CONNECTION_ID })
    );

    expect(result.success).toBe(false);
    expect(createPendingMock).not.toHaveBeenCalled();
  });

  it("starts a fresh attempt with the same bank and type, discards the old one and redirects", async () => {
    findMock.mockResolvedValue(PENDING);

    await expect(
      retryConnectionAction(form({ connectionId: CONNECTION_ID }))
    ).rejects.toThrow("REDIRECT:https://bank.example/auth");

    expect(createPendingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aspspName: "Trade Republic",
        aspspCountry: "DE",
        psuType: "business",
      })
    );
    expect(discardMock).toHaveBeenCalledWith("u-1", CONNECTION_ID);
  });
});

describe("discardConnectionAction", () => {
  it("discards a pending connection and refreshes the overview", async () => {
    discardMock.mockResolvedValue(true);

    const result = await discardConnectionAction(
      form({ connectionId: CONNECTION_ID })
    );

    expect(result).toEqual({ success: true });
    expect(discardMock).toHaveBeenCalledWith("u-1", CONNECTION_ID);
    expect(revalidateMock).toHaveBeenCalled();
  });

  it("fails for a non-pending or foreign connection", async () => {
    discardMock.mockResolvedValue(false);

    const result = await discardConnectionAction(
      form({ connectionId: CONNECTION_ID })
    );

    expect(result.success).toBe(false);
  });

  it("rejects a user without access", async () => {
    requireFinancesMock.mockRejectedValue(new Error("Unauthorized"));

    const result = await discardConnectionAction(
      form({ connectionId: CONNECTION_ID })
    );

    expect(result.success).toBe(false);
    expect(discardMock).not.toHaveBeenCalled();
  });
});

describe("syncNowAction", () => {
  it("returns not found for another user's connection without syncing", async () => {
    findMock.mockResolvedValue(null);

    const result = await syncNowAction(form({ connectionId: CONNECTION_ID }));

    expect(result).toEqual({ success: false, error: "Connection not found" });
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("refuses to sync a pending connection", async () => {
    findMock.mockResolvedValue(PENDING);

    const result = await syncNowAction(form({ connectionId: CONNECTION_ID }));

    expect(result.success).toBe(false);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("syncs the user's accounts and refreshes the page", async () => {
    findMock.mockResolvedValue(ACTIVE);
    listAccountsMock.mockResolvedValue([]);
    syncMock.mockResolvedValue({ ok: true, insertedBooked: 2 });

    const result = await syncNowAction(form({ connectionId: CONNECTION_ID }));

    expect(result).toEqual({ success: true });
    expect(listAccountsMock).toHaveBeenCalledWith("u-1", CONNECTION_ID);
    expect(syncMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: CONNECTION_ID, accounts: [] })
    );
    expect(revalidateMock).toHaveBeenCalled();
  });

  it("returns the sync error message", async () => {
    findMock.mockResolvedValue(ACTIVE);
    listAccountsMock.mockResolvedValue([]);
    syncMock.mockResolvedValue({
      ok: false,
      insertedBooked: 0,
      error: "Main: ASPSP_RATE_LIMIT_EXCEEDED",
    });

    const result = await syncNowAction(form({ connectionId: CONNECTION_ID }));

    expect(result).toEqual({
      success: false,
      error: "Main: ASPSP_RATE_LIMIT_EXCEEDED",
    });
    expect(revalidateMock).toHaveBeenCalled();
  });
});
