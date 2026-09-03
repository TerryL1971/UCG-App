# Buying a car with UCG — the whole flow, and where the app is

The one place the full purchase is written down, so it doesn't have to be
run from memory. A visual version is published as a Claude artifact
("Buying a Car with UCG") — this is the source of truth it's built from.

**Status labels:** `WORKS` (in the app, demo-ready) · `MOCK` (works, but
the data/documents are placeholder — fill from DealerTeam screenshots) ·
`GAP` (nothing in the app yet; a person does it, or still to build).

## Running the demo

Driven from Terry's phone in Expo Go — no hosting needed. The $300 deposit
is a real PayPal **Sandbox** charge (processes for real, no live money).
The "Jump to Step" row on My Deal moves the timeline (dev-only, `__DEV__`).
Deal paperwork + DealerTeam data are stand-ins — mock from real DealerTeam
sale/purchase screenshots. `GAP` steps get narrated or skipped.

## The 10 phases

1. **Find the car** — browse live inventory `WORKS` · car detail `WORKS` ·
   ask the UCG Assistant (AI) `MOCK` (needs a Claude key to reply).
2. **Start the deal** — intake: name/WhatsApp/base/cash-or-financing/lender
   `WORKS` · **APO/FPO address** `WORKS` · USAREUR license status + photo
   `WORKS` · survives restart & switching cars `WORKS`.
3. **Reserve it** — $300 PayPal deposit `WORKS` (Sandbox) · hold registered
   in DealerTeam `GAP` (UCG admin, manual) · salesperson assigned by
   management after deposit `MOCK` (`DealServerState.salesperson`, null
   until `deposit-paid`).
4. **Pay for the car** — cash: wire instructions + printable PDF `WORKS` →
   customer wires → **admin verifies funds (PIF)** `GAP`. Financing: UCG
   finance app link `WORKS` → bank approves → **bank wires UCG** `GAP` →
   **admin verifies funds** `GAP`. Payment status the customer sees `MOCK`.
5. **Add-ons** (accept/decline each) — 2-Year PPP $999 `WORKS` · American
   Auto Nation insurance `GAP` (planned, after a warranty decline) · Winter
   Tire Program `GAP` (flyer pending) · PPF `GAP` (flyer pending).
6. **Your documents (KYC)** — License / Proof of Insurance / Orders /
   Proof of Residence, multi-page capture `WORKS` · "team notified" `MOCK`.
7. **UCG's paperwork** — US-spec / registered → **Purchase Order** `GAP` ·
   EU-spec DEN → **Cost Estimate** for the "Super" VAT form, stamped at the
   UCG location `GAP` · Bill of Sale / Warranty Cert / Hand-Over Doc `GAP`
   (DealerTeam Forms tab) · customer download→print→sign→scan→upload `MOCK`
   (app has scan/upload; the documents are the gap) · Contract Signed `MOCK`.
8. **Done in Germany, by a person** — customs/import forms `GAP` · **TÜV,
   UCG pays** `GAP` · safety inspection (required to register a used/
   Germany-bought car) `GAP` · "Super" VAT form stamped `GAP`.
9. **The VRO packet** — UCG assembles a **cover letter + scenario checklist**
   (used EU-spec / used US-spec, dealer purchase) with every doc in order
   `GAP`. Needs: APO address · USAREUR license · eVB insurance confirmation
   · passed safety inspection. Customer carries it to the VRO → registration,
   USAREUR plates, environmental sticker `GAP`. Checklists are
   scenario-specific PDFs on the garrison site
   (home.army.mil/stuttgart/my-garrison/all-services/vehicle-registration —
   Stuttgart VRO: Bldg 2930, Panzer Kaserne). **Terry is providing the
   current VRO guidelines to fold in here.**
10. **Delivery** — Car Ready → Picked Up (photo, Google review) `MOCK` ·
    Service Center `WORKS` · Sell It Back `MOCK` (no valuation engine) ·
    Refer a Friend `GAP`.

## Always a human — even after launch

Verifying money arrived (cash wire + financing wire) · customs / TÜV /
safety inspection / VAT stamp · assembling the VRO packet · the DealerTeam
reservation after the deposit. The app's role for these is to *show the
customer where things stand* and collect what's needed — not to do them.

## Before the owners see it

1. **~$5 Claude API key** → the AI chat talks. Switch to Haiku 4.5 (~2¢
   per customer conversation). Biggest lift for the demo.
2. **Realistic mock data from DealerTeam screenshots** — timeline dates,
   financing terms, deal paperwork. ~half a day.
3. **Cosmetic cleanup** — "Reserve the your car"; AI still shows a human face.

## Before real launch (after the owners say yes)

Real API keys/secrets (DealerTeam, live PayPal, funded Anthropic) · UCG's
Trengo-connected WhatsApp number · real hosting (server routes only run on
the dev server today) · legal: §312g BGB withdrawal question to counsel,
then published Privacy Policy + Impressum · Supabase project + real
accounts + a retention policy for license photos and documents.
