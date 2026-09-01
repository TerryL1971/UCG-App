# Privacy Policy — DRAFT, not for publication

**Not legal advice, and not ready to publish.** This is a structured
starting point covering what GDPR Article 13 requires disclosed, written
against both the app's *current* state and the *planned* backend from
`docs/backend-and-ai-agent-plan.md`, so it needs revision as that backend
actually gets built — this isn't something to publish today and forget.
**A lawyer needs to review the final language before this goes live**,
especially given the open §312g BGB question in
`docs/legal-considerations-germany.md` about how the sales flow itself is
structured, which affects what this policy needs to say about the sale,
not just about data.

---

## Privacy Policy for [APP NAME] ("the App"), operated by [UCG LEGAL
ENTITY NAME]

**Last updated:** [DATE — keep current; GDPR requires this reflect
reality, not read as boilerplate]

### 1. Who is responsible for your data (the "controller")

[UCG LEGAL ENTITY NAME]
[FULL ADDRESS]
[CONTACT EMAIL]
[CONTACT PHONE]

*(Same entity details as the Impressum —* `docs/impressum-template.md`
*— these should always match.)*

**Data Protection Officer:** [NAME/CONTACT, or a statement that none is
formally required — confirm with counsel whether UCG's size/processing
activities require a designated DPO under GDPR Art. 37 or German law;
don't assume either way.]

### 2. What data we collect, and why

| Data | Collected when | Purpose | Legal basis |
|---|---|---|---|
| Name, email, phone | Creating an account | Identify you, contact you about your deal | Contract (Art. 6(1)(b)) |
| Which base you're headed to, cash/financing preference, notes | Deal-intake form | Let a salesperson prepare a real deal | Contract / legitimate interest |
| USAREUR license status, license photos (front/back) | Deal-intake form, if provided | Document license status for your deal | Consent (Art. 6(1)(a)) — explicitly opt-in, since this is a sensitive ID document |
| Saved cars, browsing activity | Using the app | Show your saved listings | Legitimate interest |
| Sell It Back condition photos, VIN/plate, mileage | Sell It Back form | Generate a buy-back offer | Contract |
| [Once backend exists] Deal status/history | Salesperson updates | Show you where your deal stands | Contract |

*(This table needs to be re-verified field-by-field against the actual
schema once `docs/backend-and-ai-agent-plan.md`'s database is built —
don't let it drift from what's actually collected.)*

### 3. Who your data is shared with

- **Your salesperson**, to work your deal — today, informally via a
  WhatsApp message you send yourself from your own device (not
  transmitted through our systems); once a real backend exists, this
  becomes a proper internal share, and this section needs updating to
  say so precisely.
- **WhatsApp (Meta)** — when you use the in-app WhatsApp buttons, you're
  initiating a message from your own device via Meta's service, subject
  to WhatsApp's own privacy policy, not ours. [Confirm with counsel
  whether this needs disclosure as a "recipient" or international
  transfer under GDPR even though the app doesn't itself send the data —
  the mechanism is real but the legal characterization needs a real
  answer, not an assumption.]
- **DealerTeam (Salesforce)** — *not currently connected* (see
  `docs/salesforce-dealerteam-integration-plan.md`). If/when real API
  integration exists, this section must be updated before that ships,
  since it would be a new recipient and likely a new legal basis
  discussion (DealerTeam/Salesforce's own sub-processors, hosting
  region, etc.).
- We do not sell your data.

### 4. Where your data is stored

[Once the backend from docs/backend-and-ai-agent-plan.md exists: name
the actual hosting provider and region here — e.g., "in the EU, via
[PROVIDER]." Today, most app data is either local to your device only
(never leaves it) or sent by you via WhatsApp, as described above.]

### 5. How long we keep it

[Needs a real, decided retention policy — see the open question in
`docs/backend-and-ai-agent-plan.md`. Particularly for license photos: a
specific rule (e.g., "deleted N days after your deal closes or after N
months of inactivity") needs to be decided before this can be written
truthfully, not left vague.]

### 6. Your rights

Under GDPR, you have the right to:

- Access the personal data we hold about you
- Correct inaccurate data
- Request deletion ("right to be forgotten")
- Request a copy of your data in a portable format
- Object to certain processing
- Lodge a complaint with a supervisory authority — in Germany, [THE
  RELEVANT STATE DATA PROTECTION AUTHORITY, depending on where UCG is
  legally established]

To exercise these, contact [EMAIL]. **[Once real backend accounts
exist, Apple additionally requires self-service account deletion from
inside the app itself — see `docs/backend-and-ai-agent-plan.md` — this
section and the actual in-app feature need to launch together, not this
policy promising a right the app doesn't yet let you exercise
yourself.]**

### 7. Children

[Standard clause needed — confirm with counsel what age restriction
applies given the app's actual audience (largely adult PCSing service
members and their adult dependents), and word this precisely rather than
using unreviewed boilerplate.]

### 8. Changes to this policy

We'll update this page when what we do with your data changes, and
update the "Last updated" date above.

---

## What's still needed before this can be published

- Every bracketed placeholder above filled with confirmed, accurate
  information.
- Legal review of the entire document, not just the placeholders —
  particularly section 3 (WhatsApp/DealerTeam characterization) and
  section 6 (which supervisory authority, DPO requirement).
- The retention policy (section 5) actually decided, not left as an
  open question, before the backend that would enforce it is built.
- A real, hosted URL to publish this at — both App Store Connect and
  Google Play Console require a live Privacy Policy URL at submission,
  not a document sitting in this repo.
