# Next Step

A personal job application tracker with follow-up reminders. Runs on Node.js 22+ without third-party dependencies.

```sh
npm start
```

The server uses port 3000 by default; set `PORT` to override. `npm run dev` enables server watching. Run `npm test` for the reminder, validation and calendar tests.

Add applications with a company, role, status, application date, job link, notes and optional follow-up date. Search and filter applications, edit statuses, and mark follow-ups complete. Changing the follow-up date starts a new reminder.

Applications are stored in localStorage in the current browser and origin. Export JSON backups regularly; importing replaces current data after confirmation. Data is not synced between devices and is not sent to the server. Clearing browser storage removes applications.

The Next up panel lists pending follow-ups, highlighting today and overdue items. Rejected and withdrawn applications do not generate reminders. Use **Add to calendar** to download an all-day calendar event with an alert on the prior evening; import it into your calendar and enable that calendar’s notifications. The calendar controls alert timing and delivery. Editing or completing an application does not update previously imported calendar events; remove or adjust those in your calendar. The web app itself does not send background, email, or push notifications.

## Find jobs

Open **Find jobs**, fill in the search profile, and select **Find matching jobs**. You can set areas of interest, student/entry-level versus any experience, job type, locations, remote/hybrid/on-site preference, posting age, required keywords, exclusions, and minimum annual pay/currency. Profiles are saved separately from your applications. Use **Export profile** to back up your preferences and resume; the application backup button only exports tracked roles.

Paste resume or LinkedIn profile text, or upload a TXT/Markdown resume (30,000 characters maximum). For PDF or Word, copy the document text into the box. A LinkedIn profile URL is stored for reference and is not scraped. Matching runs locally in the browser using finance interest terms, student-level signals, and skill keyword overlap; it is not an AI assessment. Resume text is never sent to the server or job boards. The match points are relative keyword scores, not a probability of being hired. Check requirements, pay, and work authorization yourself.

The server retrieves public listings from **The Muse** (first two pages of Accounting and Finance) and **Remotive** (remote finance/legal). No API keys are required. These limited feeds do not cover all finance jobs and may be delayed, unavailable, or rate-limited. Feed responses are cached in server memory for six hours. Listing availability is confirmed by visiting the original source. Tailored LinkedIn, Indeed, and Handshake search links provide broader coverage; those sites may require an account and may interpret or ignore some query filters. Links never contain your resume or profile URL.

Student mode excludes senior titles and requires an internship, student, graduate, or entry-level signal in the title/level (or an internship mention in the description). Location preferences are comma-separated alternatives matched as phrases in the advertised location, without a distance radius or inferred eligibility for worldwide remote roles. Work arrangement and job type filters exclude unconfirmed values. A posting-age filter excludes missing dates. Minimum annual pay only filters confirmed pay in your selected currency; unknown pay remains visibly flagged unless you choose **Only show confirmed annual pay**. A range can qualify when only its upper end meets the minimum. Hourly pay is never guessed into annual pay, and ambiguous dollar currencies are not inferred.

Choose **Save to tracker** on a result, then confirm the form. It starts in **Saved** status, so finding a job does not mark it as applied. Change the status to Applied when you apply and adjust the date. Existing applications use the same browser storage key and remain compatible with this update.

### Updating on Windows

1. Export an application backup in the old app first.
2. Stop the terminal server with Ctrl+C.
3. Download and extract the updated GitHub ZIP.
4. Double-click **start-windows.cmd** in the extracted folder (or run `npm.cmd start` in the folder containing `package.json`).
5. Reopen the app in the same browser at the same address and port (normally `http://localhost:3000`). Existing browser data should still appear. No `npm install` is needed.

### Network and validation

Live discovery needs outbound HTTPS access to `www.themuse.com` and `remotive.com`. The app reports unavailable feeds without substituting example jobs, and the tailored searches remain usable. Tests cover normalization, ranking, filters, privacy of search links, safe URLs, partial source failures, reminder logic and calendar export. Browser smoke tests during development also exercised profile persistence/import/export, the tracker handoff, mobile layout, and unavailable feeds using explicit test fixtures. Live retrieval could not be verified in the restricted cloud environment; both hosts were blocked there. Normal internet access is needed on the computer running the app.
