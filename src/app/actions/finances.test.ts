import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/auth-guards", () => ({ requireFinances: vi.fn() }));
vi.mock("@/lib/services/finances/config", () => ({
  getEnableBankingConfig: vi.fn(() => ({ appId: "app-1" })),
}));
vi.mock("@/lib/services/finances/client", () => ({
  createBankingClient: vi.fn(),
}));
vi.mock("@/lib/services/finances/connections", () => ({
  createPendingConnection: vi.fn(),
}));

import { requireFinances } from "@/lib/auth-guards";
import { createBankingClient } from "@/lib/services/finances/client";
import { createPendingConnection } from "@/lib/services/finances/connections";

import { startConnectionAction } from "./finances";

const requireFinancesMock = vi.mocked(requireFinances);
const createClientMock = vi.mocked(createBankingClient);
const createPendingMock = vi.mocked(createPendingConnection);
const listAspspsMock = vi.fn();
const startAuthorizationMock = vi.fn();

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const VALID_FORM = {
  bankCountry: "DE",
  aspspName: "Trade Republic",
  psuType: "personal",
};

describe("startConnectionAction", () => {
  beforeEach(() => {
    requireFinancesMock.mockReset();
    createPendingMock.mockReset();
    listAspspsMock.mockReset();
    startAuthorizationMock.mockReset();
    requireFinancesMock.mockResolvedValue({ user: { id: "u-1" } } as never);
    createClientMock.mockReturnValue({
      listAspsps: listAspspsMock,
      startAuthorization: startAuthorizationMock,
    } as never);
    createPendingMock.mockResolvedValue({ id: "c-1", state: "state-1" });
    listAspspsMock.mockResolvedValue({
      ok: true,
      value: [
        {
          name: "Trade Republic",
          country: "DE",
          maximumConsentValiditySeconds: 86_400,
        },
      ],
    });
  });

  it.each([
    { ...VALID_FORM, bankCountry: "Spain" },
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

  it("returns the API error when the authorization cannot start", async () => {
    startAuthorizationMock.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 400, message: "nope" },
    });

    const result = await startConnectionAction(form(VALID_FORM));

    expect(result).toEqual({ success: false, error: "nope" });
  });

  it("creates a pending connection and redirects to the bank", async () => {
    startAuthorizationMock.mockResolvedValue({
      ok: true,
      value: { url: "https://bank.example/auth" },
    });

    await expect(startConnectionAction(form(VALID_FORM))).rejects.toThrow(
      "REDIRECT:https://bank.example/auth"
    );

    expect(createPendingMock).toHaveBeenCalledWith({
      userId: "u-1",
      aspspName: "Trade Republic",
      aspspCountry: "DE",
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
