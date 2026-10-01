/**
 * Minimal Graph API client for the publisher. The token is never printed.
 *
 * It is sent in an Authorization header, never in a URL. Pagination links
 * that Meta returns are followed as given, and may carry a token of their
 * own, so they are never printed either. Every string that leaves through
 * scrub() has the token, the app secret and any access_token query value
 * replaced with ***.
 */
import crypto from "node:crypto";

export const VERSION = "v26.0";

export function createGraph({ token, appSecret = null, base = "https://graph.facebook.com" }) {
  if (!token) throw new Error("IG_ACCESS_TOKEN is not set");
  const root = `${base}/${VERSION}`;
  const secrets = [token, appSecret].filter(Boolean);
  const proof = appSecret ? crypto.createHmac("sha256", appSecret).update(token).digest("hex") : null;
  const scrub = (s) =>
    secrets.reduce((out, v) => out.split(v).join("***"), String(s)).replace(/access_token=[^&\s"']+/g, "access_token=***");

  async function call(method, urlOrPath, params = {}) {
    const url = new URL(urlOrPath.startsWith("http") ? urlOrPath : `${root}${urlOrPath}`);
    const label = url.pathname.replace(`/${VERSION}`, "");
    const init = { method, headers: { Authorization: `Bearer ${token}` } };
    if (method === "GET") {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      if (proof && !url.searchParams.has("appsecret_proof")) url.searchParams.set("appsecret_proof", proof);
    } else {
      const form = new URLSearchParams(params);
      if (proof) form.set("appsecret_proof", proof);
      init.body = form;
      init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      throw new Error(scrub(`network error on ${method} ${label}: ${e.cause?.code || e.message}`));
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) {
      const e = body.error || {};
      throw new Error(scrub(`${method} ${label} returned ${res.status}: ${e.message || "no message"} (code ${e.code ?? "?"}${e.error_subcode ? `, subcode ${e.error_subcode}` : ""})`));
    }
    return body;
  }

  return {
    scrub,
    get: (p, params) => call("GET", p, params),
    post: (p, params) => call("POST", p, params),
    /**
     * Every item of a paged edge, following paging.next until there is none.
     *
     * There is deliberately no item cap. An edge like /media returns newest
     * first, so a cap would drop the OLDEST items, and for the publisher those
     * are the earliest posted facts, which would then look unposted and be
     * posted again. maxPages is only a runaway guard: reaching it with a next
     * page still on offer is an error, never a silent partial read.
     */
    async all(p, params, { maxPages }) {
      const items = [];
      let requests = 1;
      let page = await call("GET", p, params);
      for (;;) {
        items.push(...(page.data || []));
        if (!page.paging?.next) break;
        if (requests >= maxPages) {
          throw new Error(`GET ${p} still had more pages after ${maxPages} requests (${items.length} items read); refusing a partial read`);
        }
        page = await call("GET", page.paging.next);
        requests += 1;
      }
      return { items, requests };
    },
  };
}
