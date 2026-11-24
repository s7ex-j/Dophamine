import { describe, expect, it } from "vitest";

import app from "../../app.json";
import pkg from "../../package.json";

describe("versión", () => {
  it("app.json y package.json dicen la misma", () => {
    expect(app.expo.version).toBe(pkg.version);
  });
  it("el código de Android sale de la versión", () => {
    const [major, minor, patch] = pkg.version.split(".").map(Number);
    expect(app.expo.android.versionCode).toBe(major * 10000 + minor * 100 + patch);
  });
});
