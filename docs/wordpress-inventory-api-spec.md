# Inventory API — what the app needs from usedcarguys.net

Forward this to whoever maintains the WordPress site.

## Why

The mobile app needs to read the current vehicle inventory (photos, price,
specs) to show cars for sale. Right now that data only exists as rendered
HTML on the site — there's no JSON endpoint for it, so the app currently
reads it by parsing the public inventory and listing pages directly. That
works, but it's fragile: any redesign of those pages' HTML breaks it.

A small REST endpoint would replace that with something stable.

## What's needed

Two read-only, **public** GET endpoints (no login/API key needed — this is
all data that's already public on the website, just not in JSON form yet).
The site already has a custom REST namespace registered (`ucg/v1`, visible
at `/wp-json/`), so these would likely live alongside whatever that's used
for:

### `GET /wp-json/ucg/v1/listings`

Returns every active listing. Suggested shape, based on what the app
currently scrapes off the inventory page:

```json
[
  {
    "slug": "2018-ford-escape-sel-de9917",
    "stockNumber": "DE9917",
    "year": 2018,
    "title": "Ford Escape SEL",
    "price": 14999,
    "perMonth": 237,
    "thumbnail": "https://www.usedcarguys.net/wp-content/uploads/stock/....jpg"
  }
]
```

### `GET /wp-json/ucg/v1/listings/{slug}`

Full detail for one listing:

```json
{
  "slug": "2018-ford-escape-sel-de9917",
  "stockNumber": "DE9917",
  "year": 2018,
  "title": "Ford Escape SEL",
  "price": 14999,
  "mileage": 87000,
  "engine": "EcoBoost 1.5L Turbo I4 179hp 177ft. lbs.",
  "transmission": "Automatic",
  "mpg": "22/28",
  "exteriorColor": "White - Oxford White",
  "vin": "1FMCU9HD7JUB57852",
  "images": [
    "https://www.usedcarguys.net/wp-content/uploads/stock/....jpg"
  ]
}
```

These field names match what the app already expects (see
`src/lib/ucg-inventory.ts`), so swapping the scraper for this endpoint
should be close to a one-file change on the app side once it exists —
no need to touch it in lockstep with app development.

## Not required, but nice to have later

- A `status` field (`"active" | "sold" | "pending"`) so sold cars can be
  filtered out without the app having to guess from missing data.
- A `location` field (Ramstein / Stuttgart / Kaiserslautern / Spangdahlem)
  if listings are tied to a specific lot — not currently exposed anywhere
  we could find on the public pages.
- Pagination (`?page=`) once inventory grows past what's comfortable in
  one response — not urgent at ~170 current listings.
