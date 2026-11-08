import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";

function render(props: Parameters<typeof Button>[0]): string {
  return renderToStaticMarkup(createElement(Button, props, "Save"));
}

describe("Button", () => {
  it("is disabled while loading, even without the disabled prop", () => {
    expect(render({ isLoading: true })).toMatch(/<button[^>]* disabled=""/);
  });

  it("is disabled while loading even when disabled is explicitly false", () => {
    expect(render({ isLoading: true, disabled: false })).toMatch(
      /<button[^>]* disabled=""/
    );
  });

  it("stays disabled when disabled is set", () => {
    expect(render({ disabled: true })).toMatch(/<button[^>]* disabled=""/);
  });

  it("is enabled by default", () => {
    expect(render({})).not.toContain("disabled");
  });
});
