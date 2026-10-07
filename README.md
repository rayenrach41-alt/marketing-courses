# Midad | Marketing learning platform

A responsive Arabic, English, and French marketing learning site with 27 structured lessons across nine practical courses and an in-browser admin panel.

## Run

Serve the site over HTTP/HTTPS; Firebase email links and ES modules do not work from `file://`. Web fonts, course images, Firebase, and registration email delivery require an internet connection.

## Admin

The admin panel is shown only to the verified owner email. Course metadata, categories, and homepage edits are still stored in `localStorage` on that browser; Firestore is the protected source for lesson bodies.

In a course editor, use `##` at the start of each lesson title and `>` at the start of its practical exercise. The text between them is the lesson explanation. Each course must have at least one complete lesson.

## Registration

Email-link sign-in uses Firebase Authentication. Firestore stores lesson bodies, and its rules deny reads to unverified users and writes to everyone except the verified platform owner. Before registration can work:

1. Create a Firebase project and add a Web app.
2. Enable Authentication, then enable Email/Password and Email link (passwordless sign-in) under Sign-in providers.
3. Add `localhost` and the deployed website hostname to Authentication's Authorized domains.
4. Copy the Firebase Web app values into `firebase-config.js`. These client config values are public; never put a service-account key in this site.
5. Create a Firestore database.
6. Install the Firebase CLI, run `firebase login`, then `firebase use --add` and select the same project.
7. Add `localhost` and the deployed website hostname to Authentication's Authorized domains.
8. Run `firebase deploy --only firestore:rules,hosting` to publish the database rules and site with security headers. The deployment excludes `curriculum.js` and the import utility.
9. Serve the folder locally with `python -m http.server 8000`, sign in as `rayenrach41@gmail.com` at `http://localhost:8000`, then open `http://localhost:8000/import-curriculum.html` in the same browser and choose **Import curriculum**. This copies the lessons into protected Firestore documents; reload the site afterwards.
10. Confirm FormSubmit's one-time recipient activation email in `rayenrach41@gmail.com` so verified registrations can be forwarded there.

Only verified users can read curriculum documents. Only `rayenrach41@gmail.com` can write them. The owner-only import utility is not deployed to public hosting. No site can be guaranteed "unhackable"; deploy the included Firebase rules, review any changes before publishing, and never expose private service-account credentials. Firebase Hosting ignores the source curriculum; if deploying elsewhere, configure the host to block `curriculum.js` and the import utility.

## Curriculum

Twelve courses cover market research and positioning, content strategy, paid campaigns, social media, analytics, copywriting, SEO, email and retention, marketing planning and budgets, creator partnerships, e-commerce conversion, and marketing automation. Each course has three lessons with an explanation and practical exercise in Arabic, English, and French.

Only the lesson curriculum is shared through Firestore. Admin changes to course metadata, categories, and homepage copy remain local to the current browser profile and are not a shared CMS.
