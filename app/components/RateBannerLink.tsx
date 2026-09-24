"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { trackRateBannerClicked } from "../lib/analytics";

/**
 * The clickable part of the homepage rate banner.
 *
 * Split out so RateBanner itself stays a server component. It reads PMMS, which
 * imports pmms.json and is evaluated at build time; marking that file "use
 * client" purely to attach one onClick would push the survey data and the
 * staleness check into the browser bundle for no benefit.
 *
 * The event records that the banner was clicked. It carries no properties —
 * there is only one banner and it has one destination.
 */
export default function RateBannerLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/calculators/mortgage-payment"
      onClick={trackRateBannerClicked}
      className={className}
    >
      {children}
    </Link>
  );
}
