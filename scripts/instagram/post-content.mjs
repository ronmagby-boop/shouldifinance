/**
 * What a post is, as both the preview and the publisher see it, so the hash a
 * preview issue shows is computed exactly as the post job checks it.
 */
import crypto from "node:crypto";

const sha256 = (x) => crypto.createHash("sha256").update(x).digest("hex");

/**
 * What a preview showed, as one hash: the fact, the caption and alt text as
 * posted, the image URL and the image bytes served there. The post job passes
 * it back as --expect-hash, so a redeployed card or an edited caption between
 * preview and post is refused rather than posted unseen.
 */
export const previewHash = ({ id, caption, alt, url, imageSha }) =>
  sha256(JSON.stringify([id, caption, alt, url, imageSha])).slice(0, 16);

/**
 * Fetch the card as Meta would. Returns { check, sha, problem }: a one-line
 * description, the SHA-256 of the bytes when it is a public JPEG, and why it
 * is not otherwise.
 */
export async function fetchImage(url) {
  let res;
  let bytes;
  try {
    res = await fetch(url);
    bytes = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return { check: "unreachable", sha: null, problem: `could not reach ${url}: ${e.cause?.code || e.message}` };
  }
  const type = res.headers.get("content-type") || "";
  const check = `${res.status} ${type}, ${bytes.length} bytes`;
  if (!res.ok || !type.startsWith("image/jpeg")) {
    return { check, sha: null, problem: `${url} returned ${res.status} ${type || "(no content type)"}; Meta needs a public JPEG. Is the card deployed under public/ig/?` };
  }
  return { check, sha: sha256(bytes), problem: null };
}
