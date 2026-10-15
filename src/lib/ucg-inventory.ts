/**
 * STOPGAP DATA SOURCE — reads live inventory directly off usedcarguys.net's
 * public pages, since the WordPress site does not yet expose a REST API for
 * vehicle listings (checked: /wp-json/ has no /wp/v2/listing or /ucg/v1/listings
 * route as of 2026-08-23). See docs/wordpress-inventory-api-spec.md for the
 * real API this should be replaced with once it exists.
 *
 * This is intentionally regex-based rather than a full HTML parser — it's
 * built against the site's current markup and WILL break if that markup
 * changes. Every parse is defensive: a shape it doesn't recognize is
 * skipped rather than thrown, and callers should treat an empty/short
 * result as "something changed, fall back to mock data" rather than crash.
 *
 * When the real API lands, everything below this comment should disappear
 * and callers should only need their fetch call swapped.
 */

const BASE_URL = 'https://www.usedcarguys.net';
const FETCH_HEADERS = { 'User-Agent': 'UsedCarGuysApp/1.0 (+https://www.usedcarguys.net)' };

export interface InventoryListItem {
  /** URL slug, e.g. "2018-ford-escape-sel-de9917" — used as the route param. */
  slug: string;
  stockNumber: string;
  year: number;
  /** Everything after the year, e.g. "Ford Escape SEL". */
  title: string;
  price: number;
  perMonth?: number;
  thumbnail: string;
  detailUrl: string;
}

export interface InventoryDetail extends InventoryListItem {
  mileage?: number;
  engine?: string;
  transmission?: string;
  mpg?: string;
  exteriorColor?: string;
  vin?: string;
  images: string[];
}

function slugFromUrl(url: string): string {
  const match = url.match(/\/listing\/([^/]+)\/?/);
  return match ? match[1] : url;
}

// 2 letters for a normal stock number (DE9917), but 3 for an EU-spec car
// that's never been registered on the USAREUR system (DEN12345 — the
// extra "N" is real, not a typo; see docs/deal-flow-roadmap.md, "EU-spec
// DEN stock numbers"). isDenStock() tests the *start* of this string for
// "den" — falling back to the raw, un-extracted slug (which starts with
// a 4-digit year, e.g. "2018-ford-escape-sel-den9917") silently fails
// that test even for a real DEN car, wrongly treating it as DE stock
// everywhere: wrong "deposit" vs "reservation fee" wording, wrong
// payment routing, wrong VAT math (Terry, 2026-10-15). Always try to
// extract just the code from the slug before giving up and using the
// slug whole.
function stockNumberFromSlug(slug: string): string {
  const match = slug.match(/-([a-z]{2,3}\d+)$/i);
  return match ? match[1].toUpperCase() : slug;
}

// Returns null on a markup-drift miss instead of a fake `{ year: 0, ... }`
// (Terry, 2026-10-15, catching a real gap) — that fake value used to
// silently flow all the way to the screen, rendering as a literal "0
// Ford Escape SEL" with no guard anywhere downstream. Each caller decides
// what "couldn't parse this one" means for it: fetchInventoryList skips
// the card (same as its existing href/alt/price guard), fetchInventoryDetail
// throws (same as its existing `!res.ok` guard) rather than ever handing
// a screen a half-real car.
function parseYearAndTitle(fullTitle: string): { year: number; title: string } | null {
  const match = fullTitle.trim().match(/^(\d{4})\s+(.*)$/);
  return match ? { year: Number(match[1]), title: match[2].trim() } : null;
}

/** List-level scrape: one pass over /inventory/ for cards (photo, title, price). */
export async function fetchInventoryList(): Promise<InventoryListItem[]> {
  const res = await fetch(`${BASE_URL}/inventory/`, { headers: FETCH_HEADERS });
  if (!res.ok) {
    throw new Error(`Inventory page returned ${res.status}`);
  }
  const html = await res.text();

  const items: InventoryListItem[] = [];
  const cardRe = /<article class="listing">([\s\S]*?)<\/article>/g;
  let cardMatch: RegExpExecArray | null;

  while ((cardMatch = cardRe.exec(html))) {
    const card = cardMatch[1];

    const hrefMatch = card.match(/href="(https:\/\/www\.usedcarguys\.net\/listing\/[^"]+)"/);
    const imgMatch = card.match(/data-src="([^"]+)"/);
    const altMatch = card.match(/alt="([^"]+)"/);
    const priceMatch = card.match(/<p>\$\s*([\d,]+)<\/p>/);
    const perMonthMatch = card.match(/From \$([\d,]+) per month/);

    if (!hrefMatch || !altMatch || !priceMatch) continue;

    const parsed = parseYearAndTitle(altMatch[1]);
    if (!parsed) continue;
    const { year, title } = parsed;
    const detailUrl = hrefMatch[1];
    const slug = slugFromUrl(detailUrl);

    items.push({
      slug,
      stockNumber: stockNumberFromSlug(slug),
      year,
      title,
      price: Number(priceMatch[1].replace(/,/g, '')),
      perMonth: perMonthMatch ? Number(perMonthMatch[1].replace(/,/g, '')) : undefined,
      thumbnail: imgMatch ? imgMatch[1] : '',
      detailUrl,
    });
  }

  return items;
}

/** Detail-level scrape for one listing — fetched lazily when a car is opened. */
export async function fetchInventoryDetail(slug: string): Promise<InventoryDetail> {
  const detailUrl = `${BASE_URL}/listing/${slug}/`;
  const res = await fetch(detailUrl, { headers: FETCH_HEADERS });
  if (!res.ok) {
    throw new Error(`Listing page returned ${res.status}`);
  }
  const html = await res.text();

  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  const parsed = parseYearAndTitle(h1Match ? h1Match[1].trim() : slug);
  if (!parsed) {
    throw new Error(`Could not parse year/title for listing ${slug}`);
  }
  const { year, title } = parsed;

  const priceMatch = html.match(/\$([\d,]+)(?:\s|<)/);
  // Was `: 0` (Terry, 2026-10-15, catching a real gap) — a scrape miss
  // silently became a real-looking $0 car, which then rendered as a
  // malformed negative "Balance Due" everywhere downstream with nothing
  // flagging that the underlying price data was actually bad. Throwing
  // here routes it into car/[id].tsx's existing "Couldn't load this
  // listing" error screen instead — the same honest failure path a
  // non-200 response already takes, rather than a car that looks real
  // but has fabricated pricing.
  if (!priceMatch) {
    throw new Error(`Could not parse price for listing ${slug}`);
  }
  const stockMatch = html.match(/Stock #<\/th><td>([^<]+)<\/td>/);

  const specsMatch = html.match(/specs-table[\s\S]*?<\/table>/);
  const specs: Record<string, string> = {};
  if (specsMatch) {
    const rowRe = /<th>(.*?)<\/th><td>(.*?)<\/td>/g;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRe.exec(specsMatch[0]))) {
      specs[rowMatch[1].trim()] = rowMatch[2].trim();
    }
  }

  const vinMatch = html.match(/VIN:\s*([A-HJ-NPR-Z0-9]{6,17})/);

  const imageMatches = [
    ...html.matchAll(/wp-content\/uploads\/stock\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)/gi),
  ].map((m) => `${BASE_URL}/${m[0]}`);
  const images = Array.from(new Set(imageMatches));

  return {
    slug,
    stockNumber: stockMatch ? stockMatch[1].trim() : stockNumberFromSlug(slug),
    year,
    title,
    price: Number(priceMatch[1].replace(/,/g, '')),
    thumbnail: images[0] ?? '',
    detailUrl,
    mileage: specs['Mileage'] ? Number(specs['Mileage']) : undefined,
    engine: specs['Engine'],
    transmission: specs['Trans'],
    mpg: specs['MPG (City/Highway)'],
    exteriorColor: specs['Ext Color'],
    vin: vinMatch ? vinMatch[1] : undefined,
    images,
  };
}
