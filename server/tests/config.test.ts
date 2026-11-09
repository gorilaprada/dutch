import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { hasClientBuild, REPO_ROOT, resolveClientDir } from "../src/config.ts";

describe("config", () => {
  test("the repo root is the folder holding server/ and client/", () => {
    expect(REPO_ROOT.endsWith("server")).toBe(false);
    expect(resolveClientDir("client/dist")).toBe(join(REPO_ROOT, "client", "dist"));
  });

  test("an absolute CLIENT_DIR is kept, an unset one means API only", () => {
    expect(resolveClientDir("/srv/dutch")).toBe("/srv/dutch");
    expect(resolveClientDir(undefined)).toBeUndefined();
    expect(resolveClientDir("")).toBeUndefined();
  });

  test("a client build is a folder with index.html", () => {
    const dir = mkdtempSync(join(tmpdir(), "dutch-client-"));
    expect(hasClientBuild(dir)).toBe(false);
    writeFileSync(join(dir, "index.html"), "<!doctype html>");
    expect(hasClientBuild(dir)).toBe(true);
  });
});
