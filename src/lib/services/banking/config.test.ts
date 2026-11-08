import { createSign, createVerify, generateKeyPairSync } from "crypto";
import { describe, expect, it } from "vitest";

import { getEnableBankingConfig, normalizePrivateKey } from "./config";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const fullPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const bareBody = fullPem
  .replace("-----BEGIN PRIVATE KEY-----\n", "")
  .replace("-----END PRIVATE KEY-----\n", "");
const escaped = fullPem.replace(/\n/g, "\\n");

function expectWorkingKey(pem: string) {
  expect(pem.startsWith("-----BEGIN PRIVATE KEY-----\n")).toBe(true);
  expect(pem.endsWith("-----END PRIVATE KEY-----\n")).toBe(true);
  const signature = createSign("RSA-SHA256").update("data").sign(pem);
  expect(
    createVerify("RSA-SHA256").update("data").verify(publicKey, signature)
  ).toBe(true);
}

describe("normalizePrivateKey", () => {
  it("accepts a bare base64 PKCS8 body (header and footer removed)", () => {
    expectWorkingKey(normalizePrivateKey(bareBody));
  });

  it("accepts a full PEM", () => {
    expectWorkingKey(normalizePrivateKey(fullPem));
  });

  it("accepts a PEM whose newlines are written as backslash-n", () => {
    expectWorkingKey(normalizePrivateKey(escaped));
  });

  it("throws an error naming the variable for garbage input", () => {
    expect(() => normalizePrivateKey("not a key")).toThrow(
      "ENABLE_BANKING_PRIVATE_KEY"
    );
  });
});

describe("getEnableBankingConfig", () => {
  const env = {
    ENABLE_BANKING_APP_ID: "app-1",
    ENABLE_BANKING_REDIRECT_URL: "https://localhost:3000/api/banking/callback",
    ENABLE_BANKING_PRIVATE_KEY: bareBody,
  };

  it("returns the config with a normalized key", () => {
    const config = getEnableBankingConfig(env);

    expect(config.appId).toBe("app-1");
    expect(config.redirectUrl).toBe(env.ENABLE_BANKING_REDIRECT_URL);
    expectWorkingKey(config.privateKeyPem);
  });

  it.each([
    "ENABLE_BANKING_APP_ID",
    "ENABLE_BANKING_REDIRECT_URL",
    "ENABLE_BANKING_PRIVATE_KEY",
  ])("throws naming %s when it is missing", (name) => {
    expect(() => getEnableBankingConfig({ ...env, [name]: undefined })).toThrow(
      name
    );
  });

  it("treats a blank value as missing", () => {
    expect(() =>
      getEnableBankingConfig({ ...env, ENABLE_BANKING_APP_ID: "   " })
    ).toThrow("ENABLE_BANKING_APP_ID");
  });
});
