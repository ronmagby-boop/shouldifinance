// Tests for scripts/vercel-ignore-build.sh, Vercel's ignored build step:
// exit 0 cancels the build, exit 1 builds. Run against a scratch git repo.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "vercel-ignore-build.sh");
const REPO = fs.mkdtempSync(path.join(os.tmpdir(), "vercel-ignore-"));
after(() => fs.rmSync(REPO, { recursive: true, force: true }));

const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
function commit(files, message) {
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(REPO, f)), { recursive: true });
    fs.writeFileSync(path.join(REPO, f), text);
    git("add", f);
  }
  git("-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "-m", message);
  return git("rev-parse", "HEAD");
}
function ignore(prev) {
  const r = spawnSync("bash", [SCRIPT], { cwd: REPO, env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: prev ?? "" }, encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}

git("init", "-q");
const deployed = commit({ "app/page.tsx": "1", "content/instagram-facts.json": "{}" }, "site");

test("a commit that only signs facts off is not built", () => {
  const head = commit({ "content/instagram-facts.json": '{"a":1}' }, "sign off");
  const r = ignore(deployed);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /skipping the build/);
  git("reset", "-q", "--hard", deployed);
  assert.ok(head);
});

test("a push with site changes is built, even if its last commit is only a sign-off", () => {
  commit({ "app/page.tsx": "2" }, "site change");
  commit({ "content/instagram-facts.json": '{"b":1}' }, "sign off");
  const r = ignore(deployed);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /Site files changed/);
  git("reset", "-q", "--hard", deployed);
});

test("a card change (public/ig) is built", () => {
  commit({ "public/ig/x.jpg": "img", "content/instagram-facts.json": '{"c":1}' }, "card");
  assert.equal(ignore(deployed).code, 1);
  git("reset", "-q", "--hard", deployed);
});

test("a redeploy of the same commit (the daily rates deploy hook) is built", () => {
  const r = ignore(deployed);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /a redeploy/);
});

test("the rates deploy hook rebuilding an older sign-off commit is built, not canceled", () => {
  const old = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  fs.writeFileSync(path.join(REPO, "content/instagram-facts.json"), '{"d":1}');
  git("add", "content/instagram-facts.json");
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "-m", "sign off, hours ago"], { cwd: REPO, env: { ...process.env, GIT_COMMITTER_DATE: old, GIT_AUTHOR_DATE: old } });
  const r = ignore(deployed);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /not a fresh push/);
  git("reset", "-q", "--hard", deployed);
});

test("with no previous deployment, or one not in the clone, it builds", () => {
  assert.equal(ignore("").code, 1);
  assert.equal(ignore("0123456789abcdef0123456789abcdef01234567").code, 1);
});
