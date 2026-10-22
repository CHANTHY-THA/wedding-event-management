# Everly wedding planner

An Angular 21 starter for the wedding event management system. It includes a responsive dashboard and working prototypes for event schedules, guest management, invitations/RSVP, check-in, and budget tracking.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200/`. To create a production build, run `npm run build`.

## Included features

- Add wedding timeline items with ceremony type, date, time, location, and a responsible person; the run of show is grouped by day and ordered by time.
- Manage guest family/group, wedding side, relationship, email/phone, party size, plus-ones, children, and tags; import CSV using the column headers shown in the guest page.
- Open a unique invitation URL for each party, collect an accept/decline response, attendee count, and meal preference, and see RSVP totals update immediately.
- Prepare reminder messages in email, SMS, WhatsApp, and Telegram. These links open the user's messaging app; the app does not send messages itself.
- Invitations show the run-of-show timeline, a sample meal menu with dietary labels, and a masonry-style pre-wedding photo gallery that preserves portrait and landscape proportions. Gallery photos have a subtle entrance animation and hover effect. A bundled illustration previews the gallery frame; remove it and upload up to six of your own photos in the Invitations & RSVP workspace.
- The dashboard includes a sample budget overview and guest check-in controls.

## Prototype limitations

- Guest, RSVP, schedule, and check-in data is in-memory sample data; it resets on refresh and is not shared across devices.
- The bundled gallery illustration is a locally served preview asset. Uploaded invitation photos use local browser object URLs and are lost on refresh; they are not published to invited guests on other devices until connected to persistent image storage and a deployed gallery.
- To preview an invitation, open the Invitations & RSVP workspace and select "Open invite" for a guest. The sample wedding timeline and meal menu are illustrative and should be updated to match the actual event.
- Invitation tokens are prototype identifiers, not production security credentials. Do not distribute real guest data or rely on these links for private events until a backend adds persistent storage, access control, and token management.
- Reminder delivery, QR codes, authentication, and a database are not connected.
- Budget figures, the sample wedding/event details, and menu descriptions are illustrative; confirm food options and dietary handling with the venue.
- SSR is enabled for the invitation route. Further brief suggestions such as offline check-in, seating charts, and localization can be scoped separately.

The project was generated with Angular CLI 21 and uses standalone components, SCSS, and server-side rendering.
