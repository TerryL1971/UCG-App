# Privacy Policy — DRAFT, not for publication

**Not legal advice, and not ready to publish.** Rewritten 2026-11-18 to
match the app as it is now (customer-only, WhatsApp to UCG — see
`docs/companion-app.md`). It covers what GDPR Article 13 requires, but
**a lawyer must review the final wording before it goes live.** Items in
[brackets] need confirming. The previous draft (for the old app) is in
git history.

---

## Privacy Policy for the UCG app ("the App"), operated by The Used Car Guys GmbH

**Last updated:** [DATE]

### 1. Who is responsible for your data (the "controller")

The Used Car Guys GmbH
Ludwig-Erhard-Str. 8, 66877 Ramstein-Miesenbach, Germany
online@usedcarguys.net · +49 (0)6371 920 000

**Privacy contact:** Michelle [surname + direct email to confirm].
**Data Protection Officer:** [name/contact, or confirm with counsel that
none is required under GDPR Art. 37 / § 38 BDSG.]

*(Same details as the Impressum — `docs/impressum-template.md`.)*

### 2. How the App works, in short

The App is a personal guide for buying a car from, or selling a car to,
UCG: a step-by-step plan for your base, your deadlines, and your car's
paperwork in one place. **UCG employees do not use the App and cannot see
what you put in it.** When you contact UCG from the App, WhatsApp opens
and you send the message yourself (section 4).

### 3. What data we process, and why

| Data | When | Purpose | Legal basis |
|---|---|---|---|
| Name, email address, password (stored only as a secure hash), WhatsApp number, the base you're stationed at | Creating your account / editing it | Your account; showing the right steps for your base; UCG reaching you on WhatsApp | Contract (Art. 6(1)(b)) |
| Your car plan: Deal #, Stock #, car details and VIN, price, deposit, cash or loan and lender, dates, your salesperson's name and WhatsApp number, dealership, the steps you tick | Setting up and using your plan | Your step-by-step plan, deadlines and reminders | Contract (Art. 6(1)(b)) |
| Documents you add (PDFs and scans): e.g. Purchase Order, Cost Estimate, Bill of Sale, AE Form 550-175A/B, Transfer Title Document, Hand-Over Document, Warranty Certificate, driver's license. These contain personal data such as your name, address, unit, phone number and vehicle details | When you choose to add them | Keeping your car's paperwork together so you can view, share or print it | Contract (Art. 6(1)(b)); for the driver's license, your consent by choosing to add it (Art. 6(1)(a)) |
| The content of a document you ask the App to read: your Purchase Order, Cost Estimate or Bill of Sale (to fill in your plan), or your AE Form 550-175A/B (to check it against your plan). Includes your name, the car, VIN and price | Only when you tap "Scan My Paperwork", or add a 550 | Reading the numbers for you, and spotting typing mistakes on customs forms before they hold up your registration. You check the results before anything is saved | Contract (Art. 6(1)(b)) |
| Key Dates you enter (registration expiry, 550-175B issue date, USAREUR license expiry) | Key Dates | Reminders | Contract (Art. 6(1)(b)) |
| Sell My Car details (name, email, phone, VIN, year, mileage, condition, duty station, notes) and car photos | Sell My Car | Requesting an offer — sent by you on WhatsApp (section 4). Form drafts and photos stay on your phone | Contract / pre-contract steps (Art. 6(1)(b)) |

We do not use your data for advertising, we do not sell it, and the App
has no analytics or tracking.

**Stays on your phone only:** reminders (scheduled by your phone), the
pickup photo, Sell My Car photos and drafts, demo-mode sample data.

### 4. Who your data goes to

- **Our hosting provider (processor):** Supabase, Inc. stores your
  account, plan and documents. Data is held in the [London, UK —
  `eu-west-2`] region. The UK has an EU adequacy decision; [confirm the
  data processing agreement with Supabase and its sub-processors].
- **Document reading (processor):** when you ask the App to read a
  document (section 3), that document is sent to Anthropic, PBC, whose
  AI model (Claude) reads it and returns the numbers to your phone.
  [Confirm: Anthropic's commercial terms and data processing addendum;
  that API inputs are not used to train its models; how long Anthropic
  keeps API inputs and outputs; the transfer mechanism for sending data
  to the US (e.g. EU–US Data Privacy Framework or Standard Contractual
  Clauses).] UCG does not keep the reader's results except what you
  save in your plan.
- **Email codes:** sign-up and password-reset codes are sent by [Resend,
  as an email processor]. [Before launch: send from a UCG email domain —
  see section 9.]
- **WhatsApp (Meta):** when you tap "Message my salesperson", "Send my
  documents", or similar, WhatsApp opens on your phone with a message or
  file ready, and **you** decide whether to send it. What you send is
  processed by WhatsApp under its own terms and reaches UCG's
  salesperson. [Confirm with counsel how to describe this.]
- **Exchange rates:** the currency converter asks the European Central
  Bank's public rate service (via frankfurter.dev) for today's rate. No
  personal data is sent; the service sees your IP address like any
  website.
- **Links you open:** UCG pages, American Auto Nation and Google reviews
  open in an in-app browser or the Maps app and are subject to those
  sites' own policies.

### 5. How long we keep it

Your account, plans and documents are kept **until you delete them** —
your car's paperwork matters for as long as you own the car, including
when you sell it. You can delete a document, a whole plan, or your
account at any time in the App (section 6). [UCG to confirm whether a
maximum retention period should apply to inactive accounts.]

### 6. Your rights

You have the right to access, correct, delete and receive a copy of your
data, to restrict or object to processing, and to withdraw consent at any
time. In the App you can yourself:
- edit your account details, base and WhatsApp number (Account);
- remove any document (Documents → Remove) or a whole plan (My Deal →
  Change car or start over);
- **delete your account (Account → Delete My Account)** — this deletes
  your account, all your plans and every document you added.

For anything else, contact [privacy email]. You can also complain to a
supervisory authority — for UCG, the Landesbeauftragte für den
Datenschutz und die Informationsfreiheit Rheinland-Pfalz (LfDI RLP).

### 7. Security

Your data is sent encrypted (HTTPS) and protected by access rules so that
only your own account can read your plans and documents.

### 8. Children

[Confirm with counsel; the App is intended for adults buying or selling
a car.]

### 9. Changes to this policy

We'll update this page when what we do with your data changes, and the
"Last updated" date above.

---

## Still needed before publishing

- Fill every [bracket] with confirmed information; lawyer review of the
  whole text (especially sections 3–5).
- **Email sender:** the email codes currently come from
  `mail.european-living.live` (set up for testing). Switch Supabase's
  SMTP to a UCG domain before launch.
- Data processing agreements in place (Supabase, email provider,
  Anthropic for document reading), and a decision on the US transfer
  basis for Anthropic.
- A live URL for this policy — App Store Connect and Google Play require
  one at submission.
