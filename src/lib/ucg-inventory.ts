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

function parseYearAndTitle(fullTitle: string): { year: number; title: string } {
  const match = fullTitle.trim().match(/^(\d{4})\s+(.*)$/);
  if (match) {
    return { year: Number(match[1]), title: match[2].trim() };
  }
  return { year: 0, title: fullTitle.trim() };
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

    const detailUrl = hrefMatch[1];
    const { year, title } = parseYearAndTitle(altMatch[1]);
    const slug = slugFromUrl(detailUrl);
    const stockMatch = slug.match(/-([a-z]{2}\d+)$/i);

    items.push({
      slug,
      stockNumber: stockMatch ? stockMatch[1].toUpperCase() : slug,
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
  const { year, title } = parseYearAndTitle(h1Match ? h1Match[1].trim() : slug);

  const priceMatch = html.match(/\$([\d,]+)(?:\s|<)/);
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
    stockNumber: stockMatch ? stockMatch[1].trim() : slug,
    year,
    title,
    price: priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0,
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
