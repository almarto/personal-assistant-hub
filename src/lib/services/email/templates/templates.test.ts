import { describe, expect, it } from "vitest";

import { escapeHtml } from "./escape-html";
import { generatePasswordResetEmailHtml } from "./password-reset";
import { generateTripInviteEmailHtml } from "./trip-invite";
import { generateWelcomeEmailHtml } from "./welcome";

describe("escapeHtml", () => {
  it("escapes the characters HTML would interpret", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;"
    );
  });
});

describe("generateWelcomeEmailHtml", () => {
  it("shows a password with HTML characters exactly as generated", () => {
    // A generated password like this one used to render as just "Z?S".
    const html = generateWelcomeEmailHtml({
      name: "Ana <b>",
      username: "ana",
      password: "Z?S<NI&jQ:2N",
      loginUrl: "https://almarto.es/es/profile",
    });

    expect(html).toContain("Z?S&lt;NI&amp;jQ:2N");
    expect(html).not.toContain("Z?S<NI");
    expect(html).toContain("Ana &lt;b&gt;");
  });
});

describe("other templates", () => {
  it("escapes the reset email's name", () => {
    const html = generatePasswordResetEmailHtml({
      name: "<x>",
      token: "123456",
    });
    expect(html).toContain("Hola, &lt;x&gt;");
  });

  it("escapes the trip name in the invitation", () => {
    const html = generateTripInviteEmailHtml({
      displayName: "Ana",
      tripName: "Ibiza <script>",
      inviteUrl: "https://almarto.es/invite?a=1&b=2",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Ibiza &lt;script&gt;");
    expect(html).toContain('href="https://almarto.es/invite?a=1&amp;b=2"');
  });
});
