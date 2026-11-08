import { createSign } from "crypto";

import type { EnableBankingConfig } from "./config";

const JWT_LIFETIME_SECONDS = 3600;

function encodeSegment(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function createEnableBankingJwt(
  config: Pick<EnableBankingConfig, "appId" | "privateKeyPem">,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const header = encodeSegment({ typ: "JWT", alg: "RS256", kid: config.appId });
  const payload = encodeSegment({
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat: nowSeconds,
    exp: nowSeconds + JWT_LIFETIME_SECONDS,
  });
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(config.privateKeyPem)
    .toString("base64url");

  return `${header}.${payload}.${signature}`;
}
