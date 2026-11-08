import { createPrivateKey } from "crypto";

export interface EnableBankingConfig {
  appId: string;
  privateKeyPem: string;
  redirectUrl: string;
}

const PEM_ARMOR_LINE = /-----(BEGIN|END)[A-Z ]*-----/g;
const PEM_LINE_LENGTH = 64;

/**
 * Accepts the key as a bare base64 PKCS8 body, a full PEM, or a PEM whose
 * newlines are written as the two characters backslash-n, and returns a
 * PKCS8 PEM.
 */
export function normalizePrivateKey(raw: string): string {
  const body = raw
    .replace(PEM_ARMOR_LINE, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const lines = body.match(new RegExp(`.{1,${PEM_LINE_LENGTH}}`, "g")) ?? [];
  const pem = `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;

  try {
    createPrivateKey(pem);
  } catch {
    throw new Error(
      "ENABLE_BANKING_PRIVATE_KEY is not a valid RSA private key (PKCS8)"
    );
  }
  return pem;
}

function requireEnv(
  env: Record<string, string | undefined>,
  name: string
): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnableBankingConfig(
  env: Record<string, string | undefined> = process.env
): EnableBankingConfig {
  return {
    appId: requireEnv(env, "ENABLE_BANKING_APP_ID"),
    redirectUrl: requireEnv(env, "ENABLE_BANKING_REDIRECT_URL"),
    privateKeyPem: normalizePrivateKey(
      requireEnv(env, "ENABLE_BANKING_PRIVATE_KEY")
    ),
  };
}
