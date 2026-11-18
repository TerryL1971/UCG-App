# The UCG app — how it works (Nov 2026)

**In one line:** the customer's own step-by-step plan for buying or selling
a car with UCG, for their base — like the Boris PCS Guide is for a move —
with every document in one place and WhatsApp straight to their
salesperson.

Decisions (Terry, David and Michelle, Nov 2026):
- No website inventory feed and no DealerTeam API (cost; DealerTeam said no).
- **Only the customer logs into the app. No UCG employee does.** Salespeople
  keep working in DealerTeam and WhatsApp exactly as today.
- **WhatsApp is how UCG and the customer talk.** Every "message my
  salesperson" opens WhatsApp with the Deal # already written.
- The app starts when the salesperson has sold the car and taken the $300
  deposit — the customer has their paperwork from then on.
- Car only: buying, selling, registration, service — plus American Auto
  Nation insurance (UCG's own).
- Every base has its own registration/deregistration rules.

## Before the deposit (added 2026-11-18)

Real customer conversations mostly happen before the deposit, so the app
has two doors: **Start My Car Plan** (already paid the $300, or selling) and
**Get Ready** (still shopping / moving to Germany): arrival date, base, a
wish list saved in the app and sent to the salesperson on WhatsApp.
**Good to Know** answers the questions every customer asks
(`src/constants/good-to-know.ts`). **Your UCG team** on My Deal shows the
salesperson, other team members by role (registration, logistics —
`src/constants/salespeople.ts`) and showroom hours.

## What the customer does

1. **Create Account** — name, email, password, **WhatsApp number (required)**,
   **base (required)**. Both can be changed later in Account.
2. **Start My Car Plan** — copy a few details off the Purchase Order (or Cost
   Estimate for DEN cars, or Bill of Sale when selling) and pick their
   salesperson. The app builds the plan.
3. **Follow the plan (My Deal)** — one step at a time, with deadlines.
   Steps move forward two ways:
   - **Scanning a document** ticks its step: 550-175A/B, stamped 550, VAT
     forms, TT Doc, signed Hand-Over Document, proof of deregistration.
   - **Ticking what the salesperson said on WhatsApp**, e.g. "My
     salesperson says my car is Retail Ready" (starts the 5-day pay-in-full
     countdown) or "UCG has confirmed they received my payment" (unlocks
     the customs step).
4. **Documents** — every paper for the deal with Add / Replace: add the
   PDF the salesperson sent on WhatsApp, or scan the paper copy. View /
   share / print / remove each one; older versions kept. **Send all my
   documents** merges them into one PDF for WhatsApp. "Paperwork that
   stays with the car" checklist.
5. **Tools** — How to Pay (Wise / lender / DEN cashier's check), Key Dates
   (plan deadlines plus registration expiry, 550-175B issue date, USAREUR
   license expiry — with reminders on the phone),
   Every Step Explained, VRO Checklist, Currency Converter, American Auto
   Nation, Service Center, Message my salesperson.
6. **Sell My Car** — pick a car bought from UCG; the offer request goes
   to the salesperson on WhatsApp, then "Send My Car's Documents" and
   "Send My Car Photos" send them too.

**Reminders:** the day before and on the day of each deadline (pay-by,
Cost Estimate, inspection guarantee, 550-175B), and 30/7 days before
registration and license expiry. Scheduled on the phone (works in Expo
Go), rebuilt whenever dates change.

## The three plans

| Buying (regular) | Buying (DEN) | Selling to UCG |
|---|---|---|
| Deal opened ($300 deposit) | Cost Estimate ready | Bill of Sale signed |
| Car being prepared — tick **Retail Ready** | Cashier's check (Total Price, not MWST total) or loan approval | 550-175B at base customs — scan it |
| Pay the balance — tick **payment confirmed** | VAT office ($100) — scan VAT forms | Zollamt — tick **customs cleared** |
| **Insure your car** — American Auto Nation suggested first; tick or add insurance card (can be done any time) | Payment received — tick | |
| 550-175A at base customs (locked until paid) — scan it | **Insure your car** — same | Hand over car, keys, title docs — tick |
| UCG clears customs — tick "UCG has cleared customs — my registration packet is ready" (Stuttgart: German Zollamt) | TÜV & release — tick | Deregister — scan proof or tick |
| Registration packet — tick; VRO; scan TT Doc | Registration — same | UCG pays within 30 days — tick |
| Pick up — scan signed Hand-Over Document, or tick (starts 5-business-day inspection guarantee) | Pick up — same | |

Insurance is a "parallel" step: arranging it early never marks payment
done, and it counts as done once registration is done. From the payment
step until it's done, My Deal and the Payment screen show a big American
Auto Nation card ("Get My Quote" → WhatsApp to the salesperson; first
month's premium on UCG).

DEN plans never mention a deposit, a reservation or $300 (VAT rules).
The rules live in `src/lib/deal-flow.ts`.

## Adding information as it arrives

- **Salespeople** → `src/constants/salespeople.ts`
  (`{ name, dealership, whatsapp }`). Until then customers type their
  salesperson's name and WhatsApp number from the paperwork.
- **Each base's registration rules** → `src/constants/bases.ts`,
  `BASE_RULES`: per-base instructions added to any step. Until a base has
  rules, its steps say "your salesperson confirms how it works at <base>".

## Demo mode

On by default: sample deals on the phone, no login needed. **Account →
Demo Mode** switches it per phone (off = the real plan). For launch:
`EXPO_PUBLIC_DEMO_MODE=false` in `.env` forces it off and hides the switch.

## Backend (Supabase, project "UCG App")

- Migrations `20261117120000_deals.sql`, `20261117150000_pay_in_full_5_days.sql`,
  `20261117170000_customer_owned_deals.sql`, `20261117190000_insurance_step.sql` — applied. Customers can only
  ever see and change their own plans and documents (row-level security).
- Edge Function `delete-account` — deployed. Deletes the account, its car
  plans and every document the customer added.
- `20261118100000_customer_only_access.sql`: only the customer can read
  or change their own data — staff access removed, staff list emptied,
  legacy public document lookup and anonymous upload paths removed.
  `20261118120000_key_dates.sql`: Key Dates columns.
- The old chat tables stay (unused; old test chats readable only by
  their own customer).

## Later options

- **WhatsApp Business** (Meta account, per-conversation fee): the
  salesperson texts the UCG number "17724 retail ready" and the customer's
  app ticks itself; the salesperson gets a WhatsApp when the customer scans
  a document.
- **Read the Purchase Order PDF automatically** to fill in the plan.
- **Document checks** (VIN, names, prices must match; mileage = alert).
- **True scanner** and push notifications — need an EAS build.
- **Team Up**: a spouse follows the same plan on their own phone.

## Open questions for Michelle

- Pay-in-full: the app uses **5** days; the Purchase Order's printed term 2
  still says seven.
- Payment reference format she wants on wires (app: `DE8261 Deal 17724`).
- The newest two-step wire sheet dropped the "RECIPIENT" line.
- The Cost Estimate's printed terms mention "reservation" (not allowed for DEN).
