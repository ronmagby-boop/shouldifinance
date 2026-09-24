import Script from "next/script";
import { ADSENSE_CLIENT, ADS_LIVE } from "../lib/ads";

/**
 * The AdSense loader, added to every page only when advertising is switched on.
 *
 * Returns null otherwise, so with the flag off — the default, and the state the
 * site ships in — no Google script is requested, no ad-related cookie is set,
 * and the privacy position described in sections 6 and 7 of the privacy policy
 * stays true. That is the whole point of gating the script rather than only the
 * units: an empty slot still costs the visitor the 72 KB loader and the cookies
 * that come with it.
 *
 * `afterInteractive` rather than `beforeInteractive`: the loader is 206 KB
 * uncompressed and nothing on the page depends on it, so it has no business
 * competing with first-party code. The installed Next docs describe
 * beforeInteractive as "only for critical scripts".
 */
export default function AdsenseScript() {
  if (!ADS_LIVE) return null;

  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}
