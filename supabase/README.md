# The hub's database

humanshaped.org signs people in with GitHub through Supabase, and keeps
only what a cohort needs: who is in it, its sessions and groups, and
what people choose to share there. Code, repositories and apps stay on
GitHub with the people who made them.

- `migrations/` holds the schema and its row-level security, the rules
  that decide who can see and change what, because the site talks to
  the database straight from the browser.
- `tests/test_policies.py` runs those migrations against a throwaway
  local Postgres and acts as a teacher, two students and an outsider,
  checking 26 things the rules must allow or refuse (see the docstring
  to run it). It was seen to fail when a rule was deliberately opened.

The project's address and its publishable key are public by design;
the secret service key never goes in this repository.
