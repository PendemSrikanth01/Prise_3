# PrISE 3.0 — everyday workflow

## 1. Sign in and complete profiles

Use your registered email and personal password. Use the password-reset link if needed. Do not share passwords. Mentors complete expertise and availability; incubatees check their startup details. Program Team checks the matching profile PDF and logo.

## 2. Choose preferences, then confirm assignments

Mentor: Directory → Incubatees → More info → choose up to three preferences → order them → submit.

Incubatee: Directory → Mentors → view profiles → choose up to three preferences → order them → submit.

Program Lead / Program Team: Mentor mapping → compare both sides' preferences → check the final mentors or startups → Save assignments. Review the opposite tab to verify the result. Uncheck and save to remove an assignment. Preferences remain separate from final assignments.

Saving assignments grants the relevant startup access; it does not send an email. Notify participants only after reviewing the final mapping.

## 3. Notify participants

Program Lead / Program Team: Notifications → Compose.

1. Select the exact mentor and incubatee recipients, or enter their email addresses.
2. Add the responsible team member in CC. To and CC recipients can see each other's addresses; use BCC where privacy is needed.
3. Subject: `PrISE 3.0 — Mentor assignment confirmed: [Startup]`.
4. Message: `Hello [names], your mentoring assignment is confirmed. Please sign in, review the startup milestones and agree your first meeting. Program contact: [name/email]. https://prise.bvcsrb.org`.
5. Add an optional attachment. Review recipients, subject and message before sending.
6. Open Outbox and check the result. Inspect failures before retrying. Sent means provider acceptance, not guaranteed inbox delivery.

Current sending identity: `notifications@mail.prise.bvcsrb.org`; Reply-To: `prise@balavikasa.org`. Replies arrive in that mailbox, not inside the app. Sending directly from `prise@balavikasa.org` requires verification of its domain with the email provider.

## 4. Work together

Incubatee: My Startup → propose milestones → submit for program confirmation → complete tasks and upload relevant evidence → submit updates for review.

Mentor: open assigned startups → review progress/evidence → provide feedback → manage permitted tasks and meetings.

Program Team: confirm milestone plans, coordinate assignments, follow up on overdue work, review submissions and resolve support tickets.

Program Lead: oversee the cohort, manage accounts, review exceptions and audit history, and manage communication templates.

Use Tasks for work with an owner and due date; Tickets for support requests needing a response; Resources for reusable reference material. Avoid creating the same work item in all three places.

## 5. Meetings and automated mail

Calendar → choose startup, facilitator, time and participants → save. Use 15-minute time intervals. Creating Google Meet requires the organizer's Google Calendar connection and the Google Meet option; an ordinary calendar entry alone does not create a Meet link. Confirm a join link is present before inviting people.

Notifications → Templates controls welcome, task and meeting emails. Check Active and automatic-send settings; use the template test option before wider use. Account/task/session actions queue the relevant messages. Timed reminders and scheduled custom emails also require a running server worker.

## Release gate

- Local lint, typecheck, unit tests and production build must pass.
- Back up production data before deployment; do not seed or reset production.
- Configure a private AUTOMATION_SECRET on app and worker; start the automation-worker and inspect its logs. A secret alone does not prove that the worker is running.
- Review pending mail before enabling automation: it can send due messages immediately.
- With permission, send one test email to the program lead; verify delivery and reply routing.
- Test one mentor/incubatee pair: preference → assignment → permitted startup access → task → submission → review → meeting.

The latest review was a focused code review, not an exhaustive live role-by-role audit. Deployment, scheduler activation and live test emails require final confirmation.
