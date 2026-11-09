# Private in-app chat — setup and demo checklist

## What it is

The customer chats with their salesperson **inside the app** instead of
being sent out to WhatsApp (Terry, 2026-11-09: the customer should stay in
the app until they pick up their car). It mirrors how UCG already works:

| Today (WhatsApp) | In the app |
|---|---|
| Customer messages the shared Trengo number | Customer's chat lands on every salesperson's **"Waiting for a salesperson"** list |
| A salesperson moves the customer to their personal WhatsApp | The salesperson taps **Take This Customer** |
| That chat is private between the two of them | Only that salesperson and that customer can read it, enforced by the database (RLS), not just by the screens |

Guests (not logged in) still get the WhatsApp hand-off, unchanged, plus a
prompt to log in for the in-app chat.

Code: `supabase/migrations/20261109120000_private_chat.sql` (tables, privacy
rules, claiming), `src/lib/chat.ts` (data), `src/lib/chat-context.tsx`
(in-app vs WhatsApp routing), `src/components/chat-conversation.tsx`
(shared bubbles), `src/app/salesperson.tsx` (customer side),
`src/app/staff/` (Staff Inbox + conversation).

## One-time setup

1. **Apply the migration.** In the Supabase dashboard → SQL Editor, paste
   the whole of `supabase/migrations/20261109120000_private_chat.sql` and
   run it. (The CLI's `supabase db push` couldn't open a database
   connection from Terry's Mac on 2026-11-09 even though the project was
   up. If you apply it via the dashboard, then run
   `supabase migration repair --status applied 20261109120000` once the
   CLI can connect, so a later `db push` doesn't try to run it twice.)
2. **Create the salesperson's account** in the app like any customer
   (Create Account), and confirm the email if Supabase asks.
3. **Mark it as staff** in the SQL Editor:

   ```sql
   insert into public.staff_members (user_id, display_name, location)
   select id, 'John Smith', 'Ramstein' from auth.users
   where email = 'john.smith@usedcarguys.net';
   ```

   Nobody can make themselves staff from inside the app. This step is the
   only way. To remove someone: `update public.staff_members set active =
   false where user_id = ...;`.
4. Log out and back in on the salesperson's phone. **Account → Staff
   Inbox** now appears.

## Demo checklist (two phones)

- [ ] Migration applied, and one staff account created (steps above).
- [ ] **Customer phone:** logged in with a *different*, normal account.
- [ ] **Salesperson phone:** logged in with the staff account.
- [ ] Both phones online. In-app chat needs a connection; there's no
      offline queue yet.

Script:

1. On the **customer phone**, pick a car, then go to the specialist chat. The intake
   summary is pre-filled; tap send. The header says "A UCG specialist will
   pick this up shortly."
2. On the **salesperson phone**, open Account → Staff Inbox. The customer appears under
   *Waiting for a salesperson* (live, no refresh needed).
3. Open it, then tap **Take This Customer**. On the customer phone the header
   switches to the salesperson's name: "Private chat — only you and John
   can see it."
4. Chat back and forth. Messages appear live on both phones.
5. *(Optional privacy proof)* Log a **second** staff account in on a
   third phone. The taken customer isn't in their inbox at all.
6. On the **customer phone**, Insurance → "Request a Quote". The request lands in
   the same private chat, and the customer never leaves the app.

## Known limits (not built yet)

- **Notifications when the app is closed.** Messages arrive live while the
  chat is open, but there's no push notification yet. Push needs an EAS
  development build (the same step parked for the document scanner, see
  memory/planned-document-scanner-upgrade). For the demo, keep both
  chats on screen.
- **Manager visibility.** Off by default (salesperson-only). Turning it on
  is one clause in `chat_can_access_thread()` using the existing
  `staff_members.is_manager` column. This is David's call.
- **Hand-off between salespeople.** There's no "transfer this customer"
  button yet. An admin can change `chat_threads.salesperson_id` in the
  dashboard for now.
- **Photos/files in chat.** Text only. Documents still go through the
  existing documents flow.
- **Assignment from DealerTeam.** Today the salesperson claims the
  customer by hand. Later this could come from the Sales Up record's
  *Salesperson 1* field (see `docs/salesforce-dealerteam-integration-plan.md`).
