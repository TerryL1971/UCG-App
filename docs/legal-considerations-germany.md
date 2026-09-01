# Germany/EU legal considerations — a briefing, not legal advice

**This document is research, organized for a conversation with a real
lawyer — it is not legal advice, and nothing below should be relied on
as a substitute for review by counsel licensed in Germany/the EU before
this app collects real customer data or facilitates real vehicle sales.**
Every section below is a starting point for that conversation, not a
conclusion. Where research found a real, named, current legal
requirement, it's cited; where something is genuinely uncertain, that
uncertainty is stated plainly rather than resolved by guessing.

## 1. GDPR (EU-wide) — already flagged, restated here for completeness

Applies because customers are physically in the EU when their data is
collected/processed, regardless of their nationality or military
affiliation. Real backend work (accounts, deal records, uploaded
documents) needs a lawful basis, a retention policy, and the data
subject rights (access, rectification, erasure, portability, objection)
actually implemented, not just declared. See
`docs/backend-and-ai-agent-plan.md` for the technical side of this
(row-level security, EU data residency, etc.).

## 2. Impressum — a German-specific requirement, distinct from a privacy policy

**Confirmed current law:** Since May 2024, this requirement moved from
§ 5 TMG (Telemediengesetz) to **§ 5 DDG** (Digitale-Dienste-Gesetz,
Germany's Digital Services Act implementation) — the content required
didn't change, only which law it's found in. Any commercially operated
website, app, or online service reaching German users must publish an
**Impressum** (legal notice) containing:

- The operator's full legal name and a real, serviceable postal address
  (not a PO box)
- Contact details — email **and** phone
- Depending on legal form: commercial register court + registration
  number, VAT ID, and the name of a managing director/authorized
  representative

This is **not the same document as a privacy policy** — it's a
transparency-about-who-you-are requirement, not a data-handling one, and
German courts/competitors are known to send formal warnings
("Abmahnung") over a missing or incomplete Impressum specifically. A
template is drafted in `docs/impressum-template.md`, but the actual
content (UCG's registered legal entity name, address, register number,
etc.) has to come from UCG's own business records — not something to
guess at or leave as a placeholder in a published app.

**Open question:** does this apply the same way to a native mobile app
as to a website? The requirement is written around "telemedia" services
broadly, which is understood to reach apps, not just websites — worth
explicit confirmation from counsel rather than assuming, since the case
law is more developed for websites.

## 3. BDSG — Germany's national data protection act

The Bundesdatenschutzgesetz supplements GDPR with Germany-specific
detail (e.g., stricter rules in some areas like employee data, and
national procedural specifics). Relevant mainly to confirm the backend's
data handling meets German specifics on top of baseline GDPR — a
question for counsel alongside the GDPR review above, not a separate
project.

## 4. TTDSG/TDDDG — consent for tracking, if analytics get added

Germany's implementation of the EU ePrivacy Directive governs consent
requirements for cookies, local storage access, and tracking — relevant
if this app or a companion website ever adds analytics, ad tracking, or
similar. Not yet a concern (no analytics exist in the app today), but
worth keeping in mind before adding any.

## 5. Right of withdrawal for a used-car "distance contract" — the most important open question here

**This is the one worth raising with counsel first, given the stakes.**
Research found real, specific, current guidance:

- Under **§ 312g BGB**, a private buyer purchasing from a commercial
  dealer via a **distance contract** (concluded through remote means —
  email, phone, internet platforms) has a statutory **14-day right of
  withdrawal**, no reason required.
- A dealer is considered organized for distance selling if it regularly
  uses remote channels to conclude contracts — the cited research
  specifically named things like listing on platforms (mobile.de,
  autoscout24.de) and handling deals by phone as **sufficient** to
  trigger this, which is uncomfortably close to what an app-based
  deal-intake + WhatsApp-driven sales process looks like.
- **If the dealer properly informs the buyer of this right, the 14-day
  clock starts and runs out normally. If the dealer does NOT properly
  inform them, the right of withdrawal does not expire** — it stays
  open indefinitely until proper notice is given.
- There is at least one specific case/commentary found
  ("Kein fernabsatzrechtlicher Widerruf eines Kfz-Kaufvertrags bei
  Abholung des Fahrzeugs" — roughly, "no distance-contract withdrawal
  when the vehicle is picked up") suggesting that when the actual
  contract is finalized **in person** (e.g., at pickup, matching this
  app's existing "Picked Up" step being where a deal currently
  concludes), it may not count as a distance contract even if earlier
  steps happened remotely. **This is not confirmed as a safe harbor —
  it's a real, specific nuance that needs a direct answer from counsel
  before anyone treats it as protection**, not something to assume
  because a search summary implied it favorably.

Why this matters commercially, not just legally: if the app's deal-intake
→ WhatsApp → salesperson flow ends up counting as a distance contract by
the time real money changes hands, a customer could legally return a car
weeks or months later if the withdrawal notice wasn't handled correctly
— a materially different risk than a GDPR fine. **Recommend this be the
first question taken to counsel**, ahead of the others in this doc, given
it's about undoing completed sales, not just data handling.

## 6. Pkw-EnVKV (car energy/CO2 labeling) — likely doesn't apply, not fully confirmed

Germany's car energy-consumption labeling ordinance requires fuel
consumption/CO2/energy-cost disclosure in car advertising. Everything
found in research frames this around **new** passenger cars specifically
(manufacturer/new-car dealer advertising) — UCG sells used cars, which
suggests this likely doesn't apply, but research did not turn up an
explicit used-car carve-out or confirmation either way. Worth a quick,
low-effort confirmation rather than a deep one, given it looks unlikely
to apply but hasn't been definitively ruled out.

## Recommended order to bring these to counsel

1. **§312g BGB / distance-contract withdrawal rights** — highest stakes,
   most directly tied to how the app's sales flow is actually designed.
2. **GDPR + BDSG** — needed before any real backend stores customer PII
   (ties to `docs/backend-and-ai-agent-plan.md`).
3. **Impressum** — mechanical to fix once the right business details are
   supplied, but legally required from the moment the app is live, not
   just at some later "real launch" milestone.
4. **TTDSG/TDDDG** — not urgent, no tracking exists yet.
5. **Pkw-EnVKV** — quick confirmation, likely a non-issue for used cars.
