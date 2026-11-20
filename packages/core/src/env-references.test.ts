import { describe, expect, it } from "vitest";

import { expandEnvReferences } from "./env-references";

describe("expandEnvReferences", () => {
  it("expands braced and bare references to another saved value", () => {
    expect(
      expandEnvReferences({ APP_NAME: "Shop", VITE_APP_NAME: "${APP_NAME}", LEGACY: "$APP_NAME" }),
    ).toEqual({ APP_NAME: "Shop", VITE_APP_NAME: "Shop", LEGACY: "Shop" });
  });

  it("unwraps quoted values before expanding them", () => {
    expect(expandEnvReferences({ NAME: "Shop", A: '"${NAME}"', B: "'${NAME}'" })).toEqual({
      NAME: "Shop",
      A: "Shop",
      B: "Shop",
    });
  });

  it("resolves chains regardless of declaration order", () => {
    expect(expandEnvReferences({ A: "${B}!", B: "${C}", C: "hi" })).toEqual({
      A: "hi!",
      B: "hi",
      C: "hi",
    });
  });

  it("leaves unknown names, bare dollars and $$ escapes untouched", () => {
    expect(
      expandEnvReferences({ A: "${MISSING}", B: "$5.00", C: "pa$$word", D: "${NOT_A_KEY:-x}" }),
    ).toEqual({ A: "${MISSING}", B: "$5.00", C: "pa$$word", D: "${NOT_A_KEY:-x}" });
  });

  it("does not grow a self-reference or loop on a cycle", () => {
    expect(expandEnvReferences({ A: "${A}x", B: "${C}", C: "${B}" })).toEqual({
      A: "${A}x",
      B: "${B}",
      C: "${C}",
    });
  });
});
