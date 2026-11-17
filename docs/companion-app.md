# The companion app (Nov 2026)

After Terry's meeting with David and Michelle, the website inventory feed
and any DealerTeam API were dropped (cost, and DealerTeam said no). The
app is now a **companion that starts after the deposit**: DealerTeam stays
the official record, and the app tracks the deal, holds every document,
and connects the customer with their salesperson. Nothing syncs with
DealerTeam.

## What's in the app

**Customer**
- **My Deal**: connect a deal with the **Deal # + last name** printed on
  the paperwork, then follow it step by step. The step that's waiting on
  the customer has its action right there (how to pay, scan the 550,
  scan the TT Doc…). Deadlines show as a banner.
- **Documents**: every scan for the deal, view / share / print, older
  versions kept. The customer scans their own: AE 550-175A/B, TT Doc,
  license, proof of deregistration. "Paperwork that stays with the car"
  checklist for when they sell it.
- **Payment**: the right instructions for the deal — Wise for cash
  buyers, "your lender pays" (with the two-step sheet for a loan
  officer) for financed, cashier's check for the Total Price for DEN.
  Copy buttons, and a wire-fraud warning.
- **Chat**: private chat with their salesperson. Connecting a deal hands
  the chat straight to that deal's salesperson.
- **Sell Back**: the offer request now goes into the in-app chat.

**Staff** (Account → Staff)
- **Deals → New Deal**: type the fields off the Purchase Order / Cost
  Estimate / Bill of Sale. (Stand-in until the app can read the PDFs.)
- **A deal**: tap the status marks and add scans (camera or attach PDF).

## The three flows

| Purchase (regular) | Purchase (DEN) | Sale (UCG buys) |
|---|---|---|
| Deal opened ($300 deposit) | Cost Estimate ready | Bill of Sale signed |
| Car being prepared → **Retail Ready** starts the pay-in-full countdown | Cashier's check (Total Price, not MWST total) or loan approval | AE 550-175B at base customs (customer scans) |
| Pay the balance (Wise / lender) → **Paid in Full** | VAT office ($100) → VAT forms scanned | German Zollamt |
| AE 550-175A at base customs — **locked until Paid in Full**; customer scans at the counter | Payment received → **Paid in Full** | Hand over car, keys, title docs → **Received** |
| German Zollamt → **Customs Cleared** (or stamped 550 scan) | **TÜV & Release** | Deregister → **Deregistered** (date) |
| Registration packet → VRO → customer scans TT Doc | Registration packet → VRO → TT Doc | UCG pays within 30 days of deregistration → **Paid Out** |
| Pick up → **Delivered** starts the 5-business-day inspection guarantee | Pick up → **Delivered** | |

DEN deals never mention a deposit, a reservation or $300 anywhere — the
database refuses a deposit on a DEN deal, and a check in the logic
tests makes sure the wording never slips in.

The rules live in `src/lib/deal-flow.ts` (pure functions). Data and
privacy rules live in `supabase/migrations/20261117120000_deals.sql`.

## Demo mode (on until launch)

The app runs on **sample deals stored on the phone** by default
(`src/lib/demo-mode.ts`, `src/lib/deals-demo.ts`): no migration, no login,
no network. Three made-up deals: 90001 regular purchase (Retail Ready,
pay-by countdown), 90002 DEN purchase, 90003 selling to UCG. "Act as the
salesperson" on My Deal opens the staff screen for that deal, so one
phone can demo both sides. Account → Reset Demo Data puts them back.

**At launch:** add `EXPO_PUBLIC_DEMO_MODE=false` to `.env`, apply the
migration below, and restart Expo — the app then uses Supabase.

## Setup — once (real data)

1. **Apply the migration.** Supabase dashboard → SQL Editor → paste all of
   `supabase/migrations/20261117120000_deals.sql` → Run. It creates the
   deals tables, the private `deal-files` storage bucket and its access
   rules. (Needs the private_chat migration applied first — it is.)
2. **Staff accounts** are the same as for the chat (`staff_members`).
   Every active staff member can see and work on every deal.

## Test it end to end

1. Simulator, logged in as staff → Account → Staff → Deals → **New Deal**.
   Use made-up data, e.g. Deal # `90001`, Stock # `DE9001`, customer
   `Test Buyer`, a 17-character VIN, Total Price `25499`, Deal Date today.
2. iPhone, logged in as a customer → My Deal → connect with `90001` +
   `Buyer`.
3. Staff: mark **Retail Ready** → the customer sees "pay by …" and the
   balance ($25,199.00). Mark **Paid in Full** → the customer's 550 step
   unlocks. Add a scan on either side → it appears on the other phone.

## Not built yet (and why)

- **Salespeople sending scans by WhatsApp** — needs a WhatsApp Business
  account (Meta) for UCG. Until then, staff add scans in the app.
- **The app reading documents and checking them** (VIN, names, prices,
  Deal #, Stock # must match; mileage is a "check" alert) — needs AI
  document reading on the server. The deal fields staff type in today
  are exactly what those checks will compare against.
- **A true document scanner** (edge detection) — needs an EAS
  development build, on hold. Scans are color photos turned into a PDF
  until then; only `src/lib/scan.ts` changes later.
- **Notifications** (e.g. "your car is Retail Ready") — push needs the
  EAS build too.
- **Account deletion** for the App Store — server-side job, still to do.

## Open questions for Michelle

- Pay-in-full term: still **7** calendar days, or now **5**? (Staff can set
  it per deal; the Purchase Order's term 2 still says seven.)
- Payment reference format she wants on wires (app uses
  `DE8261 Deal 17724`).
- The newest two-step wire sheet dropped the "RECIPIENT: THE USED CAR
  GUYS GMBH" line — banks usually need it.
- The Cost Estimate's printed terms mention "reservation", which the VAT
  agreements don't allow for DEN cars.
