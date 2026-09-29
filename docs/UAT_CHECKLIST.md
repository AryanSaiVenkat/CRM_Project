# Manual UAT Checklist (PRD v3.0 §10.2)

Run against seeded demo data (`npm run db:seed`). Login:
`owner@nexuscrmlite.test` / `demo1234` (OWNER), `staff@nexuscrmlite.test` /
`demo1234` (STAFF).

## Core scripted task (§10.2's literal test)

> "Can a first-time user log a lead, see a score, and find a ticket's
> sentiment without help, in under 5 minutes?"

- [ ] Log in as OWNER.
- [ ] From **Leads**, click **New lead**, fill in name + source, submit.
- [ ] The new lead appears in the list within 1 second, with an AI score
      badge and a top driver — without a page reload (FR-01).
- [ ] Refresh the page — the lead persists.
- [ ] Open **Tickets**, find any ticket, confirm a sentiment badge
      (POSITIVE/NEUTRAL/NEGATIVE) is visible without opening a detail view.
- [ ] Time the above — should be well under 5 minutes for a first-time user.

## FR-02 — Lead → Contact/Deal conversion

- [ ] On a `NEW` lead, click **Convert**. Confirm it lands on the Contact's
      unified view, and that name/email/phone all carried over correctly.
- [ ] Attempting to convert the same lead again is not possible from the UI
      (the lead is now shown as `CONVERTED`); calling `POST
      /api/leads/:id/convert` again returns `409`.

## FR-03 — Deal pipeline

- [ ] Open **Pipeline** — 5 columns (New/Contacted/Proposal/Won/Lost) with
      per-column counts.
- [ ] Change a deal's stage via its dropdown — the card moves columns
      immediately, no page reload.
- [ ] Drag a card between columns — same result.

## FR-04 / FR-AI-02 — Tickets

- [ ] From a Contact's unified view, click **Log ticket**, submit a
      clearly negative message (e.g. "This is unacceptable, I want a
      refund"). Confirm it appears tagged `NEGATIVE` within a few seconds.
- [ ] Mark an `OPEN` ticket **Resolve** — status updates immediately.

## FR-06 — Unified Contact record (flagship screen)

- [ ] Open any converted Contact. Confirm in one view: the AI score +
      top drivers from the source Lead, every linked Deal, and every linked
      Ticket with its sentiment — in one chronological timeline, with no
      need to navigate to a separate module.

## FR-05 — CSV import/export

- [ ] From **Leads**, click **Export CSV** — downloads a CSV with a header
      row and all visible leads.
- [ ] Prepare a CSV with 3 valid rows and 1 invalid row (e.g. missing
      `name`). Import it — confirm the response reports 3 successes and 1
      failure with a row number, and the 3 valid leads appear in the list.

## FR-07/FR-08 — Auth & access control

- [ ] Log out, then hit `GET /api/leads` directly (e.g. via curl) with no
      session — confirm `401 Unauthorized` (not the old app's fully-open
      API — see `docs/CHANGELOG_V3.md`).
- [ ] Log in as STAFF. Confirm the Leads list shows fewer records than the
      OWNER sees (STAFF is scoped to their own leads).
- [ ] As STAFF, attempt to open a Contact URL that belongs to an OWNER-only
      lead (copy the ID from an OWNER session) — confirm `404`, not the
      record.

## Sign-off

| Tester | Date | Result |
|---|---|---|
| | | |
