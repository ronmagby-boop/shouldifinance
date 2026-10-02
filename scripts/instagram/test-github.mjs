// A local stand-in for the GitHub issues API, shared by the preview-issue and
// review-approve tests. Not a test file itself.
import http from "node:http";

export const REPO = "owner/site";
export const TOKEN = "ghs_testtoken";
export const BOT = "github-actions[bot]";

export async function startGitHub() {
  const state = { issues: [], labels: [], comments: [], assigned: [] };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      const body = raw ? JSON.parse(raw) : null;
      const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { message: "Bad credentials" });
      const p = url.pathname.replace(`/repos/${REPO}`, "");
      let m;
      if (req.method === "GET" && (m = p.match(/^\/labels\/(.+)$/))) {
        const l = state.labels.find((x) => x.name === decodeURIComponent(m[1]));
        return l ? send(200, l) : send(404, { message: "Not Found" });
      }
      if (req.method === "POST" && p === "/labels") { state.labels.push(body); return send(201, body); }
      if (req.method === "GET" && p === "/issues") {
        const want = url.searchParams.get("labels");
        const page = Number(url.searchParams.get("page") || 1);
        return send(200, state.issues.filter((i) => i.labels.some((l) => l.name === want)).slice((page - 1) * 100, page * 100));
      }
      if (req.method === "POST" && p === "/issues") return send(201, add({ title: body.title, body: body.body, labels: body.labels }));
      if ((m = p.match(/^\/issues\/(\d+)$/))) {
        const issue = state.issues.find((i) => i.number === Number(m[1]));
        if (!issue) return send(404, { message: "Not Found" });
        if (req.method === "GET") return send(200, issue);
        if (req.method === "PATCH") { Object.assign(issue, body); return send(200, issue); }
      }
      if ((m = p.match(/^\/issues\/(\d+)\/comments$/)) && req.method === "POST") { state.comments.push({ issue: Number(m[1]), body: body.body }); return send(201, {}); }
      if ((m = p.match(/^\/issues\/(\d+)\/assignees$/)) && req.method === "POST") { state.assigned.push({ issue: Number(m[1]), ...body }); return send(201, {}); }
      return send(404, { message: `unknown ${req.method} ${p}` });
    });
  });
  /** Add an issue as the workflow (or anyone) would have opened it. */
  function add({ title = "t", body = "", labels = [], state: st = "open", state_reason = null, user = BOT }) {
    const number = state.issues.length + 1;
    const issue = { number, title, body, state: st, state_reason, labels: labels.map((name) => (typeof name === "string" ? { name } : name)), user: { login: user }, html_url: `https://github.example/${REPO}/issues/${number}` };
    state.issues.push(issue);
    return issue;
  }
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    state,
    add,
    reset() { state.issues = []; state.labels = []; state.comments = []; state.assigned = []; },
    close: () => server.close(),
    env: { GITHUB_TOKEN: TOKEN, GITHUB_REPOSITORY: REPO, GITHUB_API_URL: base },
  };
}
