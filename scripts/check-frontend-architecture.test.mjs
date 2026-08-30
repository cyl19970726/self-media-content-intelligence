import { describe, expect, it } from "vitest";
import { validateFrontendArchitecture } from "./check-frontend-architecture.mjs";

describe("frontend architecture policy", () => {
  it("accepts downward layer dependencies", () => {
    const files = new Map([
      ["apps/web/src/app/App.tsx", 'import { AppRoutes } from "../routes/AppRoutes";'],
      ["apps/web/src/routes/AppRoutes.tsx", 'import Page from "../features/knowledge/Page";'],
      ["apps/web/src/features/knowledge/Page.tsx", 'import { Concept } from "../../entities/knowledge/Concept";'],
      ["apps/web/src/entities/knowledge/Concept.tsx", 'import type { ConceptDto } from "../../shared/contracts/core";'],
      ["apps/web/src/shared/contracts/core.ts", "export type ConceptDto = unknown;"]
    ]);
    expect(validateFrontendArchitecture(files).failures).toEqual([]);
  });

  it("rejects legacy, upward, and cross-feature dependencies", () => {
    const files = new Map([
      ["src/client/Legacy.tsx", "export default null;"],
      ["apps/web/src/shared/api/client.ts", 'import App from "../../app/App";'],
      ["apps/web/src/features/knowledge/Page.tsx", 'import Creation from "../creation/Page";']
    ]);
    const failures = validateFrontendArchitecture(files).failures.join("\n");
    expect(failures).toContain("transitional src/client ownership is forbidden");
    expect(failures).toContain("shared cannot depend upward on app");
    expect(failures).toContain("feature internals cannot cross-import creation");
  });
});
