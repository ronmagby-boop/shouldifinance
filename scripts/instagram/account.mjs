/**
 * What is already posted, read from the account itself: every media item,
 * matched to facts by match.mjs. Shared by the preview and the review
 * workflow; publish.mjs does the same read with its own logging.
 */
import { matchMedia } from "./match.mjs";

export const MEDIA_PAGE_SIZE = 100;
export const MAX_MEDIA_PAGES = 200;

export async function readAccount(graph, igUserId, evergreen) {
  const { items: media, requests } = await graph.all(
    `/${igUserId}/media`,
    { fields: "id,caption,alt_text,timestamp,permalink", limit: String(MEDIA_PAGE_SIZE) },
    { maxPages: MAX_MEDIA_PAGES },
  );
  const { posted, unmatched, ambiguous } = matchMedia(media, evergreen);
  return { media, requests, posted, unmatched, ambiguous };
}
