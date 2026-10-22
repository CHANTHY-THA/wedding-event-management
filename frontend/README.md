# Vows wedding planner

An Angular 21 starter for the wedding event management system. It includes a responsive dashboard and working prototypes for event schedules, guest management, invitations/RSVP, check-in, and budget tracking.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200/`. To create a production build, run `npm run build`.

## Project structure

```
src/
├── app/
│   ├── app.ts, app.config*.ts, app.routes*.ts   Root component, providers and routes
│   ├── core/                                    Models, data service and seed data
│   ├── shared/                                  Reusable components and pure helpers (CSV, filtering, schedule grouping)
│   ├── layout/dashboard-layout/                 Sidebar + top bar shell for the planner pages
│   └── features/
│       ├── overview/                            /             Dashboard: RSVP progress, schedule, budget, tasks, replies
│       ├── check-in/                            /check-in     Day-of guest check-in
│       ├── schedule/                            /schedule     Run of show and "add event" dialog
│       ├── guests/                              /guests       Guest management and CSV import
│       ├── invitations/                         /invitations  Invite links, reminders, photo gallery
│       └── guest-invitation/                    /invite/:token  Public invitation and RSVP form
├── styles.scss                                  Imports the global partials in styles/
└── styles/                                      _base (design tokens), _layout, _components, _shared, _invitation
```

Feature pages are lazy-loaded. Colors, type and radii are CSS custom properties defined in `src/styles/_base.scss`; use them instead of hex values. Couple names, date, venue and RSVP deadline live in `WEDDING_DETAILS` (`src/app/core/wedding-seed-data.ts`). Page-specific styles sit next to their component; only rules shared across pages live in `src/styles/`.

Run `npm test` for the unit and integration tests.

## Included features

- Add wedding timeline items with ceremony type, date, time, location, and a responsible person; the run of show is grouped by day and ordered by time.
- Manage guest family/group, wedding side, relationship, email/phone, party size, plus-ones, children, and tags; import CSV using the column headers shown in the guest page.
- Open a unique invitation URL for each party, collect an accept/decline response, attendee count, and meal preference, and see RSVP totals update immediately.
- Prepare reminder messages in email, SMS, WhatsApp, and Telegram. These links open the user's messaging app; the app does not send messages itself.
- Invitations show the run-of-show timeline, a sample meal menu with dietary labels, and a masonry-style pre-wedding photo gallery that preserves portrait and landscape proportions. Gallery photos have a subtle entrance animation and hover effect. A bundled illustration previews the gallery frame; remove it and upload up to six of your own photos in the Invitations & RSVP workspace.
- The dashboard shows RSVP totals and progress, the event schedule, budget by category with the next payment, tasks due soon (tick them off), and the latest guest replies. Guest check-in has its own page.

## Prototype limitations

- Guest, RSVP, schedule, and check-in data is in-memory sample data; it resets on refresh and is not shared across devices.
- The bundled gallery illustration is a locally served preview asset. Uploaded invitation photos use local browser object URLs and are lost on refresh; they are not published to invited guests on other devices until connected to persistent image storage and a deployed gallery.
- To preview an invitation, open the Invitations & RSVP workspace and select "Open invite" for a guest. The sample wedding timeline and meal menu are illustrative and should be updated to match the actual event.
- Invitation tokens are prototype identifiers, not production security credentials. Do not distribute real guest data or rely on these links for private events until a backend adds persistent storage, access control, and token management.
- Reminder delivery, QR codes, authentication, and a database are not connected.
- Budget figures, the sample wedding/event details, and menu descriptions are illustrative; confirm food options and dietary handling with the venue.
- SSR is enabled for the invitation route. Further brief suggestions such as offline check-in, seating charts, and localization can be scoped separately.

The project was generated with Angular CLI 21 and uses standalone components, SCSS, and server-side rendering.
