import { generateKeyPairSync } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBankingClient } from "./client";
import type { EnableBankingConfig } from "./config";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const config: EnableBankingConfig = {
  appId: "app-1",
  redirectUrl: "https://localhost:3000/api/finances/callback",
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

  it("lists all banks when no country is given, mapping the logo", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        aspsps: [
          {
            name: "Trade Republic",
            country: "DE",
            logo: "https://enablebanking.com/brands/DE/Trade_Republic/",
            maximum_consent_validity: 7776000,
          },
          { name: "Other Bank", country: "ES" },
        ],
      })
    );

    const result = await client.listAspsps();

    expect(lastRequest().url).toBe(`${BASE_URL}/aspsps`);
    expect(lastRequest().init.method ?? "GET").toBe("GET");
    expect(result).toEqual({
      ok: true,
      value: [
        {
          name: "Trade Republic",
          country: "DE",
          logo: "https://enablebanking.com/brands/DE/Trade_Republic/",
          maximumConsentValiditySeconds: 7776000,
        },
        {
          name: "Other Bank",
          country: "ES",
          logo: null,
          maximumConsentValiditySeconds: null,
        },
      ],
    });
  });

  it("lists the banks of a country", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ aspsps: [] }));

    await client.listAspsps("DE");

    expect(lastRequest().url).toBe(`${BASE_URL}/aspsps?country=DE`);
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

  it("creates a session from the callback code with full account data", async () => {
    const mainAccount = {
      uid: "u1",
      identification_hash: "h1",
      name: "Main",
      product: "Cuenta Online",
      currency: "EUR",
      account_id: { iban: "ES9121000418450200051332" },
    };
    const otherAccount = {
      uid: "u2",
      all_account_ids: [
        { identification: "123", scheme_name: "BBAN" },
        { identification: "DE89370400440532013000", scheme_name: "IBAN" },
      ],
    };
    fetchMock.mockResolvedValue(
      jsonResponse({
        session_id: "s-1",
        accounts: [mainAccount, otherAccount],
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
          {
            uid: "u1",
            identificationHash: "h1",
            name: "Main",
            product: "Cuenta Online",
            iban: "ES9121000418450200051332",
            currency: "EUR",
            raw: mainAccount,
          },
          {
            uid: "u2",
            identificationHash: null,
            name: null,
            product: null,
            iban: "DE89370400440532013000",
            currency: null,
            raw: otherAccount,
          },
        ],
        validUntil: "2027-02-06T00:00:00Z",
      },
    });
  });

  it("reads account balances with their reference date", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        balances: [
          {
            name: "Booked",
            balance_type: "CLAV",
            balance_amount: { currency: "EUR", amount: "12.34" },
            reference_date: "2026-11-07",
          },
          {
            balance_type: "XPCD",
            balance_amount: { currency: "EUR", amount: "20.00" },
          },
        ],
      })
    );

    const result = await client.getBalances("u1");

    expect(lastRequest().url).toBe(`${BASE_URL}/accounts/u1/balances`);
    expect(result).toEqual({
      ok: true,
      value: [
        {
          type: "CLAV",
          currency: "EUR",
          amount: "12.34",
          referenceDate: "2026-11-07",
        },
        { type: "XPCD", currency: "EUR", amount: "20.00", referenceDate: null },
      ],
    });
  });

  it("reads a page of transactions with status, sign, counterparty and continuation key", async () => {
    const coffee = {
      transaction_id: "t-1",
      entry_reference: "e-1",
      transaction_amount: { currency: "EUR", amount: "5.00" },
      credit_debit_indicator: "DBIT",
      status: "BOOK",
      booking_date: "2026-11-01",
      value_date: "2026-11-02",
      transaction_date: "2026-10-31",
      creditor: { name: "Cafe" },
      debtor: { name: "Me" },
      remittance_information: ["Coffee", "Card payment"],
    };
    const salary = {
      transaction_amount: { currency: "EUR", amount: "100.00" },
      credit_debit_indicator: "CRDT",
      status: "PDNG",
      creditor: { name: "Me" },
      debtor: { name: "Employer" },
    };
    fetchMock.mockResolvedValue(
      jsonResponse({
        transactions: [coffee, salary],
        continuation_key: "k2",
      })
    );

    const result = await client.getTransactions("u1", {
      dateFrom: "2026-11-01",
      status: "BOOK",
      continuationKey: "k1",
    });

    expect(lastRequest().url).toBe(
      `${BASE_URL}/accounts/u1/transactions?date_from=2026-11-01&transaction_status=BOOK&continuation_key=k1`
    );
    expect(result).toEqual({
      ok: true,
      value: {
        transactions: [
          {
            status: "booked",
            amount: "-5.00",
            currency: "EUR",
            bookingDate: "2026-11-01",
            valueDate: "2026-11-02",
            transactionDate: "2026-10-31",
            counterparty: "Cafe",
            description: "Coffee · Card payment",
            transactionId: "t-1",
            entryReference: "e-1",
            raw: coffee,
          },
          {
            status: "pending",
            amount: "100.00",
            currency: "EUR",
            bookingDate: null,
            valueDate: null,
            transactionDate: null,
            counterparty: "Employer",
            description: null,
            transactionId: null,
            entryReference: null,
            raw: salary,
          },
        ],
        continuationKey: "k2",
      },
    });
  });

  it("infers the status from the booking date when the bank sends another status", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        transactions: [
          {
            transaction_amount: { currency: "EUR", amount: "1.00" },
            credit_debit_indicator: "DBIT",
            status: "OTHR",
            booking_date: "2026-11-03",
          },
          {
            transaction_amount: { currency: "EUR", amount: "2.00" },
            credit_debit_indicator: "DBIT",
          },
        ],
      })
    );

    const result = await client.getTransactions("u1", {
      dateFrom: "2026-11-01",
      status: "PDNG",
    });

    expect(lastRequest().url).toBe(
      `${BASE_URL}/accounts/u1/transactions?date_from=2026-11-01&transaction_status=PDNG`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.transactions.map((tx) => tx.status)).toEqual([
      "booked",
      "pending",
    ]);
    expect(result.value.continuationKey).toBeNull();
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
