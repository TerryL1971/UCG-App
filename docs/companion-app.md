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
4. **Documents** — every PDF and scan for the car, view / share / print,
   older versions kept; "paperwork that stays with the car" checklist.
5. **Tools** — How to Pay (Wise / lender / DEN cashier's check), Key Dates,
   Every Step Explained, VRO Checklist, Currency Converter, American Auto
   Nation, Service Center, Message my salesperson.
6. **Sell** — pick a car bought from UCG; the offer request goes to the
   salesperson on WhatsApp with the car and its documents listed.

## The three plans

| Buying (regular) | Buying (DEN) | Selling to UCG |
|---|---|---|
| Deal opened ($300 deposit) | Cost Estimate ready | Bill of Sale signed |
| Car being prepared — tick **Retail Ready** | Cashier's check (Total Price, not MWST total) or loan approval | 550-175B at base customs — scan it |
| Pay the balance — tick **payment confirmed** | VAT office ($100) — scan VAT forms | Zollamt — tick **customs cleared** |
| 550-175A at base customs (locked until paid) — scan it | Payment received — tick | Hand over car, keys, title docs — tick |
| Zollamt — tick, or add stamped 550 | TÜV & release — tick | Deregister — scan proof or tick |
| Registration packet — tick; VRO; scan TT Doc | Registration — same | UCG pays within 30 days — tick |
| Pick up — scan signed Hand-Over Document, or tick (starts 5-business-day inspection guarantee) | Pick up — same | |

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
  `20261117170000_customer_owned_deals.sql` — applied. Customers can only
  ever see and change their own plans and documents (row-level security).
- Edge Function `delete-account` — deployed. Deletes the account, its car
  plans and every document the customer added.
- The older staff tables/policies and the private-chat tables are unused
  by the app now (no staff users); left in place, harmless.

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
