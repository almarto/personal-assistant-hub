import { generateKeyPairSync } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBankingClient } from "./client";
import type { EnableBankingConfig } from "./config";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const config: EnableBankingConfig = {
  appId: "app-1",
  redirectUrl: "https://localhost:3000/api/banking/callback",
  privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

const BASE_URL = "https://api.enablebanking.com";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createBankingClient", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const client = createBankingClient(config, fetchMock);

  beforeEach(() => fetchMock.mockReset());

  function lastRequest() {
    const [url, init] = fetchMock.mock.calls[0];
    return { url: String(url), init: init ?? {} };
  }

  it("signs every request with a bearer JWT", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ aspsps: [] }));

    await client.listAspsps("ES");

    const headers = new Headers(lastRequest().init.headers);
    expect(headers.get("Authorization")).toMatch(
      /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/
    );
  });

  it("lists the banks of a country", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        aspsps: [
          {
            name: "Trade Republic",
            country: "DE",
            maximum_consent_validity: 7776000,
          },
          { name: "Other Bank", country: "DE" },
        ],
      })
    );

    const result = await client.listAspsps("DE");

    expect(lastRequest().url).toBe(`${BASE_URL}/aspsps?country=DE`);
    expect(lastRequest().init.method ?? "GET").toBe("GET");
    expect(result).toEqual({
      ok: true,
      value: [
        {
          name: "Trade Republic",
          country: "DE",
          maximumConsentValiditySeconds: 7776000,
        },
        {
          name: "Other Bank",
          country: "DE",
          maximumConsentValiditySeconds: null,
        },
      ],
    });
  });

  it("starts an authorization and returns the bank url", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        url: "https://bank.example/auth",
        authorization_id: "a-1",
      })
    );

    const result = await client.startAuthorization({
      aspsp: { name: "Trade Republic", country: "DE" },
      psuType: "personal",
      state: "state-1",
      validUntil: "2027-02-06T00:00:00.000Z",
    });

    expect(lastRequest().url).toBe(`${BASE_URL}/auth`);
    expect(lastRequest().init.method).toBe("POST");
    expect(JSON.parse(String(lastRequest().init.body))).toEqual({
      access: { valid_until: "2027-02-06T00:00:00.000Z" },
      aspsp: { name: "Trade Republic", country: "DE" },
      state: "state-1",
      redirect_url: config.redirectUrl,
      psu_type: "personal",
    });
    expect(result).toEqual({
      ok: true,
      value: { url: "https://bank.example/auth" },
    });
  });

  it("creates a session from the callback code", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        session_id: "s-1",
        accounts: [{ uid: "u1", name: "Main" }, { uid: "u2" }],
        access: { valid_until: "2027-02-06T00:00:00Z" },
      })
    );

    const result = await client.createSession("abc");

    expect(lastRequest().url).toBe(`${BASE_URL}/sessions`);
    expect(lastRequest().init.method).toBe("POST");
    expect(JSON.parse(String(lastRequest().init.body))).toEqual({
      code: "abc",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        sessionId: "s-1",
        accounts: [
          { uid: "u1", name: "Main" },
          { uid: "u2", name: null },
        ],
        validUntil: "2027-02-06T00:00:00Z",
      },
    });
  });

  it("reads account balances", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        balances: [
          {
            name: "Booked",
            balance_type: "CLAV",
            balance_amount: { currency: "EUR", amount: "12.34" },
          },
        ],
      })
    );

    const result = await client.getBalances("u1");

    expect(lastRequest().url).toBe(`${BASE_URL}/accounts/u1/balances`);
    expect(result).toEqual({
      ok: true,
      value: [{ type: "CLAV", currency: "EUR", amount: "12.34" }],
    });
  });

  it("reads transactions from a date, with debits as negative amounts", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        transactions: [
          {
            transaction_amount: { currency: "EUR", amount: "5.00" },
            credit_debit_indicator: "DBIT",
            booking_date: "2026-11-01",
            remittance_information: ["Coffee", "Card payment"],
          },
          {
            transaction_amount: { currency: "EUR", amount: "100.00" },
            credit_debit_indicator: "CRDT",
            booking_date: null,
          },
        ],
      })
    );

    const result = await client.getTransactions("u1", "2026-10-09");

    expect(lastRequest().url).toBe(
      `${BASE_URL}/accounts/u1/transactions?date_from=2026-10-09`
    );
    expect(result).toEqual({
      ok: true,
      value: [
        {
          amount: "-5.00",
          currency: "EUR",
          bookingDate: "2026-11-01",
          description: "Coffee",
        },
        {
          amount: "100.00",
          currency: "EUR",
          bookingDate: null,
          description: null,
        },
      ],
    });
  });

  it("maps a non-2xx response to an http error without leaking the token", async () => {
    fetchMock.mockResolvedValue(
      new Response("unauthorized body", { status: 401 })
    );

    const result = await client.getBalances("u1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatchObject({ kind: "http", status: 401 });
    expect(result.error.message).toContain("unauthorized body");
    expect(result.error.message).not.toContain("Bearer");
  });

  it("maps a network failure to a network error", async () => {
    const failingFetch: typeof fetch = async () => {
      throw new Error("socket hang up");
    };
    const failingClient = createBankingClient(config, failingFetch);

    const result = await failingClient.getBalances("u1");

    expect(result).toEqual({
      ok: false,
      error: { kind: "network", message: "socket hang up" },
    });
  });
});
