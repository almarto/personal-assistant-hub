import { createVerify, generateKeyPairSync } from "crypto";
import { describe, expect, it } from "vitest";

import { createEnableBankingJwt } from "./jwt";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const privateKeyPem = privateKey
  .export({ type: "pkcs8", format: "pem" })
  .toString();

function decode(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

describe("createEnableBankingJwt", () => {
  const token = createEnableBankingJwt(
    { appId: "app-1", privateKeyPem },
    1_700_000_000
  );
  const [header, payload, signature] = token.split(".");

  it("has three base64url segments", () => {
    expect(token.split(".")).toHaveLength(3);
    expect(token).not.toMatch(/[=+/]/);
  });

  it("carries the Enable Banking header", () => {
    expect(decode(header)).toEqual({
      typ: "JWT",
      alg: "RS256",
      kid: "app-1",
    });
  });

  it("carries the Enable Banking claims valid for one hour", () => {
    expect(decode(payload)).toEqual({
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
  });

  it("is signed with the private key (RS256)", () => {
    const valid = createVerify("RSA-SHA256")
      .update(`${header}.${payload}`)
      .verify(publicKey, Buffer.from(signature, "base64url"));

    expect(valid).toBe(true);
  });
});
