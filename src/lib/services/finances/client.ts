import type { EnableBankingConfig } from "./config";
import { createEnableBankingJwt } from "./jwt";
import type {
  AccountBalance,
  Aspsp,
  BankAccountInfo,
  BankSession,
  BankTransactionRecord,
  PsuType,
  Result,
  TransactionsPage,
} from "./types";
import { TRANSACTION_STATUS } from "./types";

const BASE_URL = "https://api.enablebanking.com";

export interface StartAuthorizationParams {
  aspsp: { name: string; country: string };
  psuType: PsuType;
  state: string;
  validUntil: string;
}

export interface GetTransactionsParams {
  dateFrom: string;
  status: "BOOK" | "PDNG";
  continuationKey?: string;
}

export interface BankingClient {
  /** Without a country, lists every bank. */
  listAspsps(country?: string): Promise<Result<Aspsp[]>>;
  startAuthorization(
    params: StartAuthorizationParams
  ): Promise<Result<{ url: string }>>;
  createSession(code: string): Promise<Result<BankSession>>;
  getBalances(accountUid: string): Promise<Result<AccountBalance[]>>;
  getTransactions(
    accountUid: string,
    params: GetTransactionsParams
  ): Promise<Result<TransactionsPage>>;
}

interface AspspsResponse {
  aspsps?: Array<{
    name: string;
    country: string;
    logo?: string | null;
    maximum_consent_validity?: number | null;
  }>;
}

interface StartAuthorizationResponse {
  url: string;
}

interface AccountResponse {
  uid: string;
  identification_hash?: string | null;
  name?: string | null;
  product?: string | null;
  currency?: string | null;
  account_id?: { iban?: string | null } | null;
  all_account_ids?: Array<{
    identification: string;
    scheme_name: string;
  }> | null;
}

interface SessionResponse {
  session_id: string;
  accounts?: AccountResponse[];
  access: { valid_until: string };
}

interface BalancesResponse {
  balances?: Array<{
    balance_type: string;
    balance_amount: { currency: string; amount: string };
    reference_date?: string | null;
  }>;
}

interface TransactionResponse {
  transaction_id?: string | null;
  entry_reference?: string | null;
  transaction_amount: { currency: string; amount: string };
  credit_debit_indicator: "CRDT" | "DBIT";
  status?: string | null;
  booking_date?: string | null;
  value_date?: string | null;
  transaction_date?: string | null;
  creditor?: { name?: string | null } | null;
  debtor?: { name?: string | null } | null;
  remittance_information?: string[] | null;
}

interface TransactionsResponse {
  transactions?: TransactionResponse[];
  continuation_key?: string | null;
}

function toAccountInfo(account: AccountResponse): BankAccountInfo {
  const iban =
    account.account_id?.iban ??
    account.all_account_ids?.find((id) => id.scheme_name === "IBAN")
      ?.identification ??
    null;
  return {
    uid: account.uid,
    identificationHash: account.identification_hash ?? null,
    name: account.name ?? null,
    product: account.product ?? null,
    iban,
    currency: account.currency ?? null,
    raw: account,
  };
}

function toTransactionRecord(tx: TransactionResponse): BankTransactionRecord {
  const isDebit = tx.credit_debit_indicator === "DBIT";
  const bookingDate = tx.booking_date ?? null;
  const status =
    tx.status === "BOOK"
      ? TRANSACTION_STATUS.BOOKED
      : tx.status === "PDNG"
        ? TRANSACTION_STATUS.PENDING
        : bookingDate
          ? TRANSACTION_STATUS.BOOKED
          : TRANSACTION_STATUS.PENDING;
  const remittance = (tx.remittance_information ?? []).filter(Boolean);
  return {
    status,
    amount: isDebit
      ? `-${tx.transaction_amount.amount}`
      : tx.transaction_amount.amount,
    currency: tx.transaction_amount.currency,
    bookingDate,
    valueDate: tx.value_date ?? null,
    transactionDate: tx.transaction_date ?? null,
    counterparty: (isDebit ? tx.creditor?.name : tx.debtor?.name) ?? null,
    description: remittance.length > 0 ? remittance.join(" · ") : null,
    transactionId: tx.transaction_id ?? null,
    entryReference: tx.entry_reference ?? null,
    raw: tx,
  };
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
      const path =
        country === undefined
          ? "/aspsps"
          : `/aspsps?country=${encodeURIComponent(country)}`;
      const result = await request<AspspsResponse>("GET", path);
      return mapResult(result, (data) =>
        (data.aspsps ?? []).map((aspsp) => ({
          name: aspsp.name,
          country: aspsp.country,
          logo: aspsp.logo ?? null,
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
        accounts: (data.accounts ?? []).map(toAccountInfo),
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
          referenceDate: balance.reference_date ?? null,
        }))
      );
    },

    async getTransactions(accountUid, params) {
      const search = new URLSearchParams({
        date_from: params.dateFrom,
        transaction_status: params.status,
      });
      if (params.continuationKey) {
        search.set("continuation_key", params.continuationKey);
      }
      const result = await request<TransactionsResponse>(
        "GET",
        `/accounts/${encodeURIComponent(accountUid)}/transactions?${search.toString()}`
      );
      return mapResult(result, (data) => ({
        transactions: (data.transactions ?? []).map(toTransactionRecord),
        continuationKey: data.continuation_key ?? null,
      }));
    },
  };
}
