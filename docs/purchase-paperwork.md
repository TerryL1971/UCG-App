# Purchase paperwork — the two paths (DEN vs DE stock numbers)

Captured from Terry (2026-09-04). This is the real UCG process; the app
doesn't do most of it yet. Pair with `docs/vro-checklists.md` (what the VRO
itself requires) and `docs/end-to-end-flow.md`.

## What the stock number means

- **`DEN*****`** — EU-spec, **never registered on the USAREUR-AF system.**
- **`DE*****`** — was EU-spec, a customer **registered it on the USAREUR
  system**, and UCG **bought it back.** Still an EU-spec car physically.
  (A genuinely US-spec car also carries a `DE` number.)

The operative distinction for the paperwork is **never-USAREUR-registered
(DEN) vs. previously-USAREUR-registered / US-spec (DE)** — not "US vs EU
spec" as such.

**Resale tax note:** to sell an EU-spec car to someone who is **not** a
SOFA-card holder, that buyer pays **19% VAT + a 10% import fee** to
register it at the German Zulassungsstelle. That's the tax that the VAT
Form process (below) removes for a SOFA-card customer.

---

## Path A — `DEN*****` (EU-spec, never USAREUR-registered)

### The deposit is not a deposit

VAT agreements **do not allow a deposit** on an item purchased with a VAT
Form. On `DEN*****` stock numbers the hold payment must be a
**reservation fee / holding fee** (some term other than "deposit"), and
**it is refunded.**

### Cost Estimate → VAT Form

1. UCG produces a **Cost Estimate** showing **purchase price + VAT**
   (not a Purchase Order).
2. The customer needs **3–5 copies** of the Cost Estimate.
3. The customer takes copies to:
   - the **VAT Office**, and
   - **Service Federal Credit Union** or **Community Bank**, to get an
     **Official Cashier's Check**.
4. The Cashier's Check goes to the **VAT Office**, which issues the
   **VAT Form**.
5. The customer brings the VAT Form **back to the dealership.**
6. **The customer has, in essence, already paid for the car at this point**
   (the Cashier's Check is the payment).
7. UCG **stamps the VAT Form** and completes all the paperwork for the VRO.

Net effect: the VAT Form lets UCG **take the VAT back off the price**,
bringing the purchase price back down to the regular price.

At the VRO, this car uses the **"Used Euro Spec Vehicle Purchased From
Dealer"** checklist (`docs/vro-checklists.md`), VAT-Form path.

---

## Path B — `DE*****` (previously USAREUR-registered, or US-spec)

More paperwork than Path A.

1. Price is **finalized** → the **deposit is made** (a real deposit here —
   VAT Form rules don't apply).
2. UCG prints **5 copies of the Bill of Sale, signed.**
3. The customer takes the 5 copies to the **base Customs Office** and gets
   **3–5 AE Form 550-175A**.
4. UCG takes the AE Form 550-175As to the **German Zollamt** to be
   **stamped** — **not until the funds have been wired.**
5. Distribution of the stamped 550-175As: **2 stay with the Zollamt, 3 are
   retained** — 1 with the dealership, 1 goes to the VRO, 1 kept by the
   customer.
6. At the **VRO** the customer gets their **Transfer Title documents,
   plates, and environmental sticker.**
7. There's a separate room at the VRO to get their **Esso gas card.**

At the VRO, this car uses the **"Used US Spec"** checklist, or the
**"Used Euro Spec … Original USAREUR-AF Transfer Title"** branch of the
Euro-spec checklist if it's an EU-spec car that was previously registered.

---

## What this changes in the app

- **Deposit screen:** for a `DEN*****` car, this is a **"Reservation Fee"**
  (or "Holding Fee"), not a deposit, and the copy has to say it's
  refunded. `guessVehicleSpec()` already detects the `DEN` prefix.
  **(shipped 2026-09-04 — the relabel)**
- **Phase 5 "Pay for the car":** for `DEN` cars, payment is entangled with
  the VAT process (the Cashier's Check *is* the payment) and happens
  around the VAT-Office step, not as a separate "wire the balance" action.
- **Cost Estimate (DEN) / Purchase Order + 5× Bill of Sale (DE)** as
  generated documents — `src/app/deal-paperwork.tsx` + `src/lib/deal-documents.ts`.
  **(shipped 2026-09-04 — real printable PDFs, filled from the deal's
  own price/buyer/vehicle/financing data, linked from the "Contract
  Signed" step on My Deal.)** Still explicitly labeled sample documents,
  not the binding contract.
- The Customs Office / Zollamt / VAT Office steps, the multi-copy counts,
  and the Esso gas card are process the app should *show the customer*
  (a checklist / "what happens next"), not perform — still `GAP`.
