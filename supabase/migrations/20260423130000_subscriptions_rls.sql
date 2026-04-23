-- Enable row level security for the Subscription table.
-- Writes are performed only via the Stripe webhook (service role, bypasses RLS).
-- Reads are limited to the owner.

alter table "Subscription" enable row level security;

drop policy if exists "select own subscription" on "Subscription";
create policy "select own subscription"
  on "Subscription" for select
  to authenticated
  using (auth.uid() = "userId");
