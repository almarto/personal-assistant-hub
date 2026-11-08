import type { EnableBankingConfig } from "./config";
import { createEnableBankingJwt } from "./jwt";
import type {
  AccountBalance,
  Aspsp,
  BankAccountRef,
  BankCountry,
  BankSession,
  BankTransaction,
  PsuType,
  Result,
} from "./types";

const BASE_URL = "https://api.enablebanking.com";

export interface StartAuthorizationParams {
  aspsp: { name: string; country: string };
  psuType: PsuType;
  state: string;
  validUntil: string;
}

export interface BankingClient {
  listAspsps(country: BankCountry): Promise<Result<Aspsp[]>>;
  startAuthorization(
    params: StartAuthorizationParams
  ): Promise<Result<{ url: string }>>;
  createSession(code: string): Promise<Result<BankSession>>;
  getBalances(accountUid: string): Promise<Result<AccountBalance[]>>;
  getTransactions(
    accountUid: string,
    dateFrom: string
  ): Promise<Result<BankTransaction[]>>;
}

interface AspspsResponse {
  aspsps?: Array<{
    name: string;
    country: string;
    maximum_consent_validity?: number | null;
  }>;
}

interface StartAuthorizationResponse {
  url: string;
}

interface SessionResponse {
  session_id: string;
  accounts?: Array<{ uid: string; name?: string | null }>;
  access: { valid_until: string };
}

interface BalancesResponse {
  balances?: Array<{
    balance_type: string;
    balance_amount: { currency: string; amount: string };
  }>;
}

interface TransactionsResponse {
  transactions?: Array<{
    transaction_amount: { currency: string; amount: string };
    credit_debit_indicator: "CRDT" | "DBIT";
    booking_date?: string | null;
    remittance_information?: string[] | null;
  }>;
}

export function createBankingClient(
  config: EnableBankingConfig,
  fetchImpl: typeof fetch = fetch,
  nowSeconds: () => number = () => Math.floor(Date.now() / 1000)
): BankingClient {
  async function request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<Result<T>> {
    try {
      const response = await fetchImpl(`${BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${createEnableBankingJwt(config, nowSeconds())}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          error: {
            kind: "http",
            status: response.status,
            message: `Enable Banking ${method} ${path} failed (${response.status}): ${text}`,
          },
        };
      }

      return { ok: true, value: (await response.json()) as T };
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: "network",
          message: error instanceof Error ? error.message : "Network error",
        },
      };
    }
  }

  function mapResult<T, U>(result: Result<T>, map: (value: T) => U): Result<U> {
    return result.ok ? { ok: true, value: map(result.value) } : result;
  }

  return {
    async listAspsps(country) {
      const result = await request<AspspsResponse>(
        "GET",
        `/aspsps?country=${encodeURIComponent(country)}`
      );
      return mapResult(result, (data) =>
        (data.aspsps ?? []).map((aspsp) => ({
          name: aspsp.name,
          country: aspsp.country,
          maximumConsentValiditySeconds: aspsp.maximum_consent_validity ?? null,
        }))
      );
    },

    async startAuthorization(params) {
      const result = await request<StartAuthorizationResponse>(
        "POST",
        "/auth",
        {
          access: { valid_until: params.validUntil },
          aspsp: params.aspsp,
          state: params.state,
          redirect_url: config.redirectUrl,
          psu_type: params.psuType,
        }
      );
      return mapResult(result, (data) => ({ url: data.url }));
    },

    async createSession(code) {
      const result = await request<SessionResponse>("POST", "/sessions", {
        code,
      });
      return mapResult(result, (data) => ({
        sessionId: data.session_id,
        accounts: (data.accounts ?? []).map((account): BankAccountRef => ({
          uid: account.uid,
          name: account.name ?? null,
        })),
        validUntil: data.access.valid_until,
      }));
    },

    async getBalances(accountUid) {
      const result = await request<BalancesResponse>(
        "GET",
        `/accounts/${encodeURIComponent(accountUid)}/balances`
      );
      return mapResult(result, (data) =>
        (data.balances ?? []).map((balance) => ({
          type: balance.balance_type,
          currency: balance.balance_amount.currency,
          amount: balance.balance_amount.amount,
        }))
      );
    },

    async getTransactions(accountUid, dateFrom) {
      const result = await request<TransactionsResponse>(
        "GET",
        `/accounts/${encodeURIComponent(accountUid)}/transactions?date_from=${encodeURIComponent(dateFrom)}`
      );
      return mapResult(result, (data) =>
        (data.transactions ?? []).map((transaction) => ({
          amount:
            transaction.credit_debit_indicator === "DBIT"
              ? `-${transaction.transaction_amount.amount}`
              : transaction.transaction_amount.amount,
          currency: transaction.transaction_amount.currency,
          bookingDate: transaction.booking_date ?? null,
          description: transaction.remittance_information?.[0] ?? null,
        }))
      );
    },
  };
}
