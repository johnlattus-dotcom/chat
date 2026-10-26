# Next Step

A personal job application tracker with follow-up reminders. Runs on Node.js 22+ without third-party dependencies.

```sh
npm start
```

The server uses port 3000 by default; set `PORT` to override. `npm run dev` enables server watching. Run `npm test` for the reminder, validation and calendar tests.

Add applications with a company, role, status, application date, job link, notes and optional follow-up date. Search and filter applications, edit statuses, and mark follow-ups complete. Changing the follow-up date starts a new reminder.

Applications are stored in localStorage in the current browser and origin. Export JSON backups regularly; importing replaces current data after confirmation. Data is not synced between devices and is not sent to the server. Clearing browser storage removes applications.

The Next up panel lists pending follow-ups, highlighting today and overdue items. Rejected and withdrawn applications do not generate reminders. Use **Add to calendar** to download an all-day calendar event with an alert on the prior evening; import it into your calendar and enable that calendar’s notifications. The calendar controls alert timing and delivery. Editing or completing an application does not update previously imported calendar events; remove or adjust those in your calendar. The web app itself does not send background, email, or push notifications.
