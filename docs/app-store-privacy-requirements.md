# App Store / Google Play privacy & GDPR requirements — a briefing, not legal advice

**This is research, not legal advice** — same framing as
`docs/legal-considerations-germany.md`. It covers a different layer than
that doc: not "what GDPR itself requires," but "what Apple and Google
additionally require you to *disclose and build* before they'll let this
app onto their stores," plus where that overlaps with GDPR. Confirm the
specifics with counsel before submission, especially the open questions
marked below.

## Two separate things that both apply here

1. **GDPR** — EU law. Applies because customers are physically in the EU
   when their data is collected, full stop. Already covered in
   `docs/legal-considerations-germany.md` §1 and `docs/privacy-policy-draft.md`.
2. **App store platform policies** — Apple's and Google's own rules for
   what they'll list. These aren't GDPR, but they both specifically
   require privacy disclosures and some GDPR-adjacent features (account
   deletion) as a condition of being on their store, regardless of
   whether a regulator ever gets involved.

Both have to be satisfied independently. Passing GDPR doesn't
automatically satisfy Apple/Google's submission requirements, and vice
versa.

## 1. Apple App Store

### a) App Privacy "nutrition label" — required at every submission
Every app answers a privacy questionnaire in App Store Connect; Apple
renders the answers as the public "App Privacy" label on the listing.
Covers ~14 data categories (contact info, financial info, location,
sensitive info, user content/photos, identifiers, usage data, diagnostics,
etc.), each marked as *not collected*, *collected but not linked to the
user*, or *collected and linked to the user* — and separately, whether any
of it is used to *track* the user across other companies' apps/sites.
Answers must cover data collected by third-party SDKs embedded in the
app, not just your own code. Apple does **not** verify the answers at
submission — misrepresenting them is a Terms-of-Service/legal risk
discovered later, not a review-time block.
[developer.apple.com/forums - 5.1.1(v)](https://developer.apple.com/forums/thread/693997),
[Apple App Review Help](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)

### b) A live, public Privacy Policy URL — required at submission
App Store Connect won't accept a submission without one. A finished
document sitting in this repo (`docs/privacy-policy-draft.md`) doesn't
satisfy this — it has to be hosted somewhere reachable by URL.

### c) In-app account deletion — Guideline 5.1.1(v), required since June 30, 2022
**Any app that lets someone create an account must let them start
deleting that account from inside the app** — not just deactivate/log
out, and not by requiring an email, phone call, or support ticket (apps
outside heavily regulated industries can't use those as the *only* path).
Deletion has to actually remove the account and the data you're not
legally required to keep; a confirmation step before deleting is fine.
[Apple App Review Help — 5.1.1(v)](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)

**The gap worth flagging — not because real customers are using it today,
but because of what it's architecturally wired to:** per
`docs/backend-and-ai-agent-plan.md`, Supabase auth was deliberately built
to be the **real** customer-account system, not a mock — "a real account
is the concrete meaning of 'not a demo' for a customer." Everything
happening against it right now (Terry's `.env`, Terry's own test
signups) is development/test usage, not live customers — but it's
exercising the actual production account system, not a stand-in that
gets swapped out later. **DealerTeam is a separate thing**: per
`docs/salesforce-dealerteam-integration-plan.md`, it's the still-unbuilt
deal/sales-pipeline sync (financing status, documents, salesperson
assignment) — nothing in that plan or this one makes it an identity
provider. Same for the UCG website integration, which today means
`src/lib/ucg-inventory.ts` scraping live listings — also not account
related. So however the DealerTeam/website API work shakes out, it
doesn't change who holds the actual customer login; that's Supabase,
per the existing plan.

Right now the Account screen offers **Log Out** (session only) and
**"Erase Everything & Start Over"** (clears local app state + calls
`supabase.auth.signOut()`), but neither deletes the underlying Supabase
`auth.users` row or the account's data server-side. This isn't an
App-Review blocker *today* while this is Terry's own test account — but
it needs to exist **before** the app goes live with real account
creation turned on, since that's the moment Apple's 5.1.1(v) actually
applies. Worth building this alongside whichever Supabase
tables/RLS-policy work happens next (per that doc's schema sketch), not
scrambling for it right before submission.

### d) App Tracking Transparency (ATT) — only if cross-app/cross-site tracking exists
ATT's prompt is required only when you track a user across *other*
companies' apps or websites for things like ad targeting. Nothing in
this app currently does that (no ad SDKs, no analytics, no cross-app
identifiers) — so ATT itself likely doesn't apply, but re-check this if
an analytics or ads SDK is ever added.

### e) Impressum / EU Trader status
Apple added an EU "trader" disclosure requirement for apps distributed in
the EU (name, address, contact details of the business) — functionally
overlapping with the German Impressum requirement already tracked in
`docs/legal-considerations-germany.md` §2. Worth confirming this is filled
in on the App Store Connect side too, not just as a doc in this repo.

## 2. Google Play

### a) Data Safety section — required for every app, even ones that collect nothing
A self-declared form in Play Console, Google's equivalent of Apple's
label. **Every** app must complete it, including ones that collect zero
data, and it must stay consistent with the app's actual privacy policy.
Must cover data collected or shared by any third-party SDK bundled into
the app, not just first-party code.
[Play Console Help — Data safety](https://g.co/play/datasafety)

### b) A Privacy Policy link — required in Play Console, for every app
Same requirement as Apple's, filled in as a link in Play Console's App
Content section.

### c) No Google-specific equivalent of Apple's mandatory in-app account deletion
Google doesn't currently impose the same blanket requirement — but GDPR's
own right-to-erasure (Art. 17, already in `docs/legal-considerations-germany.md`)
means a real deletion flow is still needed regardless of which store
asks for it first.

## 3. What this maps to for THIS app, concretely

Walking the actual data flows in this codebase:

| Data | Where it lives today | Store disclosure category |
|---|---|---|
| Name, email, phone | Supabase auth + `deal-intake-context.tsx` | Contact Info |
| Driver's license photos (front/back) | Supabase Storage (`documents` bucket) | Sensitive Info / User Content |
| VIN, sell-back condition photos | Supabase Storage, device-local until shared | User Content |
| $300 deposit payment | PayPal (sandbox today) — card/bank details never touch this app's own servers | Financial Info (handled by PayPal as a separate controller) |
| Chat messages to the AI assistant | Sent to `src/app/api/chat+api.ts` → Anthropic API | User Content |
| WhatsApp messages (salesperson, sell-back offer, support) | Composed in-app, sent via the device's own WhatsApp app (`wa.me` links) — not transmitted through this app's servers | Arguably not "collected by the app" at all, but worth a line in the privacy policy regardless, per the existing open question in `docs/privacy-policy-draft.md` §3 |
| Saved cars, deal timeline, drafts | AsyncStorage, device-local only | Not transmitted — typically doesn't need to appear in either label |

Third-party processors that need a Data Processing Agreement (GDPR Art.
28) and a line in the App Privacy label / Data Safety form: **Supabase**,
**PayPal**, **Anthropic**. (Already flagged for backend-side handling in
`docs/backend-and-ai-agent-plan.md` — this is the same requirement,
viewed from the app-store-submission side.)

## 4. Action items, roughly in order

1. **Publish a real, hosted Privacy Policy URL.** `docs/privacy-policy-draft.md` has the content skeleton — it needs the bracketed placeholders filled with UCG's real legal-entity details and a lawyer's sign-off, then hosting somewhere with a stable URL (both stores require this at submission, not after).
2. **Build a real "Delete My Account" flow** before enabling real customer account creation at launch — the gap identified above. This is about the Supabase account specifically (the real identity system per the backend plan), independent of whether DealerTeam/website API integration is ready by then. Confirm with counsel whether this needs to be full GDPR erasure (delete from Supabase entirely) or can retain anything UCG has a legal basis to keep (e.g., completed-sale records), and word the in-app confirmation accordingly.
3. **Revisit the App Privacy label / Data Safety form again once DealerTeam integration actually ships** — at that point DealerTeam becomes a new third-party recipient of customer data (same open item already tracked in `docs/privacy-policy-draft.md` §3), which both stores' disclosures need to reflect. Not urgent now since that integration doesn't exist yet.
4. **Fill out Apple's App Privacy questionnaire and Google's Data Safety form** using the table above as the starting map — these are self-declared in each store's console, not something built into the app's code.
5. **Get a Data Processing Agreement in place with Supabase, PayPal, and Anthropic** (or confirm one already exists via their standard terms) before real customer data flows through them at scale.
6. **Confirm EU/German data residency for the Supabase project** — already done, per `docs/backend-and-ai-agent-plan.md` (region eu-west-2/London) — worth re-confirming this stays true if the project ever moves orgs/accounts.

Sources:
- [Apple App Review Help — 5.1.1 Account Deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
- [Apple Developer Forums — Guideline 5.1.1(v) account deletion](https://developer.apple.com/forums/thread/693997)
- [Google Play Console Help — Provide information for Google Play's Data safety section](https://g.co/play/datasafety)
- [Termly — GDPR Requirements Checklist](https://www.termly.io/resources/articles/gdpr-requirements/)
- [Usercentrics — GDPR Checklist for Apps](https://usercentrics.com/resources/gdpr-checklist-for-apps/)
