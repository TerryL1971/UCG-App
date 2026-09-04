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
   ask the UCG Assistant (AI) `WORKS` (Sept 4: real Claude key connected,
   Haiku 4.5). Cost-limited Sept 6 (`src/constants/ai-chat.ts`) —
   `AI_CHAT_ENABLED` is the owner's kill switch (Terry: "I may need to
   scrap it, but I have to allow the owner to make that decision"; if
   they do, it's this one line), plus a 12-message-per-conversation cap
   and a trimmed history window so cost doesn't scale with the square of
   a conversation's length. Terry's also weighing replacing this whole
   chat with a static FAQ page instead — noted, not built, pending that
   decision.
2. **Start the deal** — intake: name/WhatsApp/base/cash-or-financing/lender
   `WORKS` · **APO/FPO address** `WORKS` · USAREUR license status + photo
   `WORKS` · survives restart & switching cars `WORKS`.
3. **Reserve it** — $300 PayPal hold `WORKS` (Sandbox). On a `DEN*****`
   car (EU-spec, never USAREUR-registered) this is a **refundable
   reservation fee, not a deposit** — VAT-Form purchases can't take a
   deposit; the screen relabels it `WORKS`. Hold registered in DealerTeam
   `GAP` (UCG admin, manual) · salesperson assigned by management after the
   hold `MOCK`. See **[docs/purchase-paperwork.md](./purchase-paperwork.md)**.
4. **Add-ons** — the `/add-ons` screen ("a Service button on a bottom row
   of options, before a final pricing summary," per
   docs/deal-flow-roadmap.md) `WORKS` **(shipped 2026-09-04)**: a hub for
   all four add-ons plus a running price total (car + PPP only — nothing
   invents a price for the other three). 2-Year PPP $999, real
   accept/decline `WORKS` · **American Auto Nation insurance** `WORKS`
   (`/insurance` — offer + WhatsApp quote handoff; pushed per the owners) ·
   **Winter Tire Program** `WORKS` (`/winter-tires` — Germany's real
   situational winter-tire law, StVO §2(3a), spelled out; pricing still
   "ask your salesperson," flyer pending) · **PPF** `WORKS`
   (`/paint-protection` — generic explainer; pricing still "ask your
   salesperson," flyer pending). Deposit screen now routes into this hub
   instead of straight to the warranty screen.
5. **Pay for the car** — the amount is the car plus any add-ons above,
   minus the deposit. Cash: wire instructions + printable PDF `WORKS` →
   customer wires → **admin verifies funds (PIF)** `GAP`. Financing: UCG
   finance app link `WORKS` → bank approves → **bank wires UCG** `GAP` →
   **admin verifies funds** `GAP`. Payment status the customer sees, for
   the cash path — Awaiting Wire → Verifying → Funds Received — now
   `WORKS` **(shipped 2026-09-04)**: `/wire-instructions` has an
   "I've Sent My Wire" button (`deal-sync`'s new `paymentStatus` +
   `payment-submitted` signal), auto-advances to Funds Received after a
   wait the same way the 7-step timeline's "waiting on UCG/bank" steps
   already do, and shows on My Deal's Application step too. Actually
   verifying funds landed is still done by a person — this only makes the
   *status* real, not the verification itself. A `__DEV__`-only row lets a
   tester jump straight to any state, same pattern as My Deal's
   "Jump to Step."
6. **Your documents (KYC)** — License / Proof of Insurance / Orders /
   Proof of Residence, multi-page capture `WORKS` · "team notified" `MOCK`.
7. **UCG's paperwork — two paths by stock number** (full detail in
   **[docs/purchase-paperwork.md](./purchase-paperwork.md)**). The
   `/deal-paperwork` screen (linked from the "Contract Signed" step)
   generates these as real, printable PDFs from the deal's own data —
   price, buyer, vehicle, financing — `WORKS` **(shipped 2026-09-04)**:
   - **`DEN*****`** (never USAREUR-registered) → **Cost Estimate** (price +
     VAT). Customer needs 3–5 copies → VAT Office + Service FCU / Community
     Bank for an **Official Cashier's Check** → VAT Office issues the
     **VAT Form** → back to UCG, who stamps it. The Cashier's Check *is*
     the payment — for DEN cars, paying and the VAT process are the same
     step.
   - **`DE*****`** (previously USAREUR-registered, or US-spec) →
     **Purchase Order** + **5 signed copies of the Bill of Sale**.
   - Bill of Sale is an official **Kaufvertrag / Rechnung** either way;
     plus Warranty Cert, Hand-Over Doc (DealerTeam Forms) — those two
     still `GAP`, not generated.
   - Generated PDFs are explicitly labeled sample documents, not the
     binding contract — UCG still signs the real paperwork with the
     customer. Customer download→print→sign→scan→upload `MOCK` · Contract
     Signed `MOCK`.
8. **Done in Germany, by a person** — all `GAP`:
   - **`DE` path:** customer takes the 5 Bill-of-Sale copies to the **base
     Customs Office** → gets **3–5 AE Form 550-175A** → UCG takes them to
     the **German Zollamt** to be stamped (**not until funds are wired**).
     Stamped copies: 2 stay with Zollamt, 3 retained (dealership / VRO /
     customer).
   - **`DEN` path:** UCG **stamps the VAT Form** and completes the packet.
   - Both: **TÜV / safety inspection, UCG pays** (required for any used or
     Germany-bought car). For EU-spec: German title book (Fahrzeugbrief) +
     registration (Fahrzeugschein) + official **deregistration MFR** on
     letterhead, or the USAREUR-AF Transfer Title.
9. **The VRO packet** — the **`/vro-checklist` screen** now shows the
   customer exactly what they need `WORKS` (US/EU-spec toggle, UCG-provides
   vs you-bring, the warnings). UCG still assembles the actual **cover
   letter** as a document `GAP`. Requirements transcribed in
   **[docs/vro-checklists.md](./vro-checklists.md)** (Stuttgart: Used
   US-Spec / Used Euro-Spec from a dealer; Selling to a dealership). Split:
   - **UCG provides** — Bill of Sale (Kaufvertrag/Rechnung), VAT form +
     stamp, customs form, TÜV/safety inspection, German title +
     deregistration MFR or USAREUR-AF Transfer Title, lien release, the
     cover letter.
   - **Customer brings** — Orders (PCS / 1172), DoD ID, USAREUR license,
     SOFA card (contractor), **Proof of Insurance for Germany** (eVB / ICC
     / Deckungskarte — arranged with their insurer; **policyholder is a
     listed owner and must be present at the VRO**), $45 × up to 2 years,
     POV limit waiver (AE 190-1AG) if applicable, German-bank lienholder
     authorization if financed via a German bank.
   - **Sponsor must be present**; Title 10 → Orders for every transaction;
     can't register anything if existing registrations aren't compliant.
   Customer carries the packet to the VRO → **Transfer Title documents,
   USAREUR plates, environmental sticker**, and (separate room) their
   **Esso gas card**. Stuttgart VRO: Bldg 2930, Panzer Kaserne. Ramstein/
   KMC and other garrisons have their own checklists and quirks — confirm
   per location.
   - **"What happens after I pay?"** — Phases 7-9 as one narrative,
     personalized DEN vs DE: the **`/road-to-plates`** screen
     (`src/constants/road-to-plates.ts`), linked from `/deal-paperwork` and
     from `/vro-checklist` `WORKS` **(shipped 2026-09-04)**. Not a live
     tracker — every step on it is still done by a person (`GAP`), so it's
     a walk-through of what to expect and roughly the order, not a status
     the app updates on its own.
10. **Delivery** — Car Ready → Picked Up (photo, Google review) `MOCK` ·
    Service Center `WORKS` · Sell It Back `MOCK` (no valuation engine; but
    the "Offer Accepted" state now links to a **"Clearing Your Car" VRO
    checklist** `WORKS` — form 550-175B, from `docs/vro-checklists.md`) ·
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
