#!/usr/bin/env node
/**
 * Read-only check of the Instagram publishing setup. Run by
 * .github/workflows/instagram-check.yml; it posts nothing.
 *
 * Environment:
 *   IG_ACCESS_TOKEN      required. The System User token.
 *   IG_APP_ID            optional. With IG_APP_SECRET, used to build an app
 *   IG_APP_SECRET        access token for debug_token, and an appsecret_proof
 *                        for apps that require one.
 *   EXPECT_PAGE_NAME     optional. Which Page to use if more than one is found.
 *   EXPECT_IG_USERNAME   optional. Reported as a mismatch if it differs.
 *
 * THE TOKEN IS NEVER PRINTED. It is sent in an Authorization header, never in
 * a URL, except debug_token's input_token, which Meta requires as a query
 * parameter; no URL is ever printed. Every message that leaves this script is
 * passed through scrub(), which replaces the token, the app secret and the
 * app access token with ***. Only the fields asked for are reported.
 *
 * Graph API v26.0: the newest version in Meta's changelog ("July 29, 2026 |
 * TBD"), so it has the longest life ahead of it.
 */
import crypto from "node:crypto";
import fs from "node:fs";

const VERSION = "v26.0";
// GRAPH_BASE exists only so the script can be exercised against a local mock;
// the workflow never sets it.
const GRAPH = `${process.env.GRAPH_BASE || "https://graph.facebook.com"}/${VERSION}`;
const REQUIRED_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_read_engagement",
  "pages_show_list",
  "business_management",
];
// Listed by Meta's content_publishing_limit reference for users whose Page
// role comes through Business Manager, which a System User's does. Reported,
// not required.
const ADVISORY_SCOPES = [["ads_management", "ads_read"]];

const token = process.env.IG_ACCESS_TOKEN?.trim();
const appId = process.env.IG_APP_ID?.trim() || null;
const appSecret = process.env.IG_APP_SECRET?.trim() || null;
const appToken = appId && appSecret ? `${appId}|${appSecret}` : null;
const secrets = [token, appSecret, appToken].filter(Boolean);

const scrub = (s) => secrets.reduce((out, v) => out.split(v).join("***"), String(s));
const say = (s = "") => console.log(scrub(s));
const summary = [];
const report = (label, value) => {
  say(`  ${label}: ${value}`);
  summary.push(`| ${label} | ${scrub(value)} |`);
};
function fail(message) {
  console.error(scrub(`\nFAILED: ${message}`));
  writeSummary(`**Failed:** ${scrub(message)}`);
  process.exit(1);
}
function writeSummary(tail = "") {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const body = ["## Instagram setup check", "", `Graph API ${VERSION}. Nothing was posted.`, "", "| Check | Result |", "|---|---|", ...summary, "", tail].join("\n");
  fs.appendFileSync(file, scrub(body) + "\n");
}

if (!token) fail("IG_ACCESS_TOKEN is not set. Add it under Settings > Secrets and variables > Actions.");

const proof = appSecret ? crypto.createHmac("sha256", appSecret).update(token).digest("hex") : null;

/**
 * GET a Graph path. Auth goes in a header; query values go in the URL.
 * Returns the parsed body, or throws an Error whose message is Meta's error
 * text, never the URL.
 */
async function graph(pathname, params = {}, { bearer = token } = {}) {
  const url = new URL(`${GRAPH}${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (proof && bearer === token) url.searchParams.set("appsecret_proof", proof);
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
  } catch (e) {
    throw new Error(`network error calling ${pathname}: ${e.cause?.code || e.message}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = body.error || {};
    throw new Error(`${pathname} returned ${res.status}: ${e.message || "no message"} (code ${e.code ?? "?"}${e.error_subcode ? `, subcode ${e.error_subcode}` : ""})`);
  }
  return body;
}

const when = (unix) => (unix === 0 ? "0 (no expiry)" : unix ? `${unix} (${new Date(unix * 1000).toISOString()})` : "not reported");

// --------------------------------------------------------------- 1. token
say(`Graph API ${VERSION}`);
say("\n1. Token (debug_token)");
let data;
const attempts = appToken ? [["app access token", appToken], ["the token itself", token]] : [["the token itself", token]];
const errors = [];
for (const [how, bearer] of attempts) {
  try {
    data = (await graph("/debug_token", { input_token: token }, { bearer })).data;
    say(`  inspected using ${how}`);
    break;
  } catch (e) {
    errors.push(`using ${how}: ${e.message}`);
  }
}
if (!data) {
  fail(`debug_token failed.\n  ${errors.join("\n  ")}\nMeta requires "an app access token or an app developer's user access token" for this call. Add IG_APP_ID and IG_APP_SECRET as repository secrets and run again.`);
}
report("App id", data.app_id ?? "not reported");
report("App name", data.application ?? "not reported");
report("Token type", data.type ?? "not reported");
report("Valid", String(data.is_valid));
report("Expires at", when(data.expires_at));
report("Data access expires at", when(data.data_access_expires_at));
const scopes = data.scopes ?? [];
report("Scopes granted", scopes.length ? scopes.join(", ") : "none");

if (!data.is_valid) fail("debug_token reports the token is not valid.");
const missing = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
if (missing.length) {
  fail(`the token is missing required scope${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Regenerate the System User token with ${missing.length === 1 ? "it" : "them"} selected.`);
}
report("Required scopes", `all present (${REQUIRED_SCOPES.join(", ")})`);
for (const group of ADVISORY_SCOPES) {
  if (!group.some((s) => scopes.includes(s))) {
    report("Advisory", `none of ${group.join(" / ")} granted. Meta's content_publishing_limit and media_publish references list one of them for Business Manager users; if publishing fails with a permissions error, add one.`);
  }
}

// ---------------------------------------------------------------- 2. Page
say("\n2. Page and Instagram account");
const fields = "id,name,instagram_business_account";
let pages = [];
let pageSource = null;
for (const edge of ["/me/accounts", "/me/assigned_pages"]) {
  try {
    const body = await graph(edge, { fields, limit: "100" });
    if (body.data?.length) { pages = body.data; pageSource = edge; break; }
  } catch (e) {
    say(`  ${edge}: ${e.message}`);
  }
}
if (!pages.length) fail("no Pages found via /me/accounts or /me/assigned_pages. Assign the Page to the System User in Business Settings.");
report("Pages found", `${pages.length} via ${pageSource}: ${pages.map((p) => p.name).join(", ")}`);

const wanted = process.env.EXPECT_PAGE_NAME?.trim();
let page = pages.length === 1 ? pages[0] : pages.find((p) => p.name === wanted);
if (!page) fail(`${pages.length} Pages found and none is named "${wanted}". Set the page_name input to one of: ${pages.map((p) => p.name).join(", ")}.`);
if (wanted && page.name !== wanted) report("Page name check", `expected "${wanted}", found "${page.name}"`);
if (!page.instagram_business_account) {
  // Some edges omit the nested field; ask the Page directly.
  page = { ...page, ...(await graph(`/${page.id}`, { fields })) };
}
report("Page", `${page.name} (id ${page.id})`);
const igId = page.instagram_business_account?.id;
if (!igId) fail(`Page "${page.name}" has no linked Instagram business account. Link @shouldifinance to the Page in Meta Business Suite.`);
report("instagram_business_account id", igId);

const ig = await graph(`/${igId}`, { fields: "username" }).catch((e) => ({ error: e.message }));
if (ig.username) {
  report("Instagram username", `@${ig.username}`);
  const wantUser = process.env.EXPECT_IG_USERNAME?.trim().replace(/^@/, "");
  if (wantUser && ig.username.toLowerCase() !== wantUser.toLowerCase()) {
    fail(`the Page is linked to @${ig.username}, not @${wantUser}.`);
  }
} else {
  report("Instagram username", `could not be read: ${ig.error}`);
}

// ------------------------------------------------------- 3. publishing limit
say("\n3. Content publishing limit");
let limit;
try {
  limit = await graph(`/${igId}/content_publishing_limit`, { fields: "config,quota_usage" });
} catch (e) {
  fail(`content_publishing_limit failed: ${e.message}`);
}
const row = limit.data?.[0] ?? {};
report("Quota", row.config ? `${row.config.quota_total} posts per ${row.config.quota_duration} seconds` : "not reported");
report("Used in the current window", row.quota_usage ?? "not reported");

say("\nAll checks passed. Nothing was posted.");
writeSummary("**All checks passed.** Nothing was posted.");
