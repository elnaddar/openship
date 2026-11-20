import { describe, expect, it } from "vitest";

import { mergeServiceDeployEnv } from "./service-env-layers";

describe("mergeServiceDeployEnv env references", () => {
  it("expands a reference to another project value before the container sees it", () => {
    const { env } = mergeServiceDeployEnv(
      {
        project: { APP_NAME: "Shop", VITE_APP_NAME: '"${APP_NAME}"' },
        frozen: {},
        inline: {},
        service: {},
      },
      false,
    );
    expect(env.VITE_APP_NAME).toBe("Shop");
  });

  it("lets a service row reference a project value", () => {
    const { env } = mergeServiceDeployEnv(
      {
        project: { HOST: "example.com" },
        frozen: {},
        inline: {},
        service: { MAIL_FROM_ADDRESS: "hello@${HOST}" },
      },
      false,
    );
    expect(env.MAIL_FROM_ADDRESS).toBe("hello@example.com");
  });
});
