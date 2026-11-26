# Senior Resident for iPhone

A native SwiftUI app. Not a website wrapper: home screen and lock screen widgets with one-tap check-in, a camera scan that reads your question bank's subject list on the phone, local reminders, Siri and Shortcuts, Sign in with Apple, and a coach for practice questions from a photo.

## What is in it

| Screen | What it does | Plan |
|---|---|---|
| Today | Today's questions, check in (done, half, missed), on-track meter, streak, shift the plan after missed days | Free |
| Plan | Day by day plan, check in any day, edit or delete | Free |
| Plan builder | Exam, subject, dates, study days, practice exams, review days. Subjects and counts from a photo or screenshot of the question bank (read on the phone with Apple's Vision, never uploaded), or split a total by the exam's published weights | Free (photo import: Resident and Chief) |
| Coach | Photograph or paste a question, get walked to the answer one decision at a time (same server and prompt as the website) | Resident and Chief |
| Widgets | Small and medium home screen, lock screen (rectangular, inline, circular). Medium has check-in buttons | Free |
| Reminders | Morning note with today's questions, evening nudge to check in (cleared once you check in) | Free |
| Account | Plan badge, reminders, privacy, terms, contact, sign out, delete account | Free |

The plan is the same JSON the website saves to the account, so a plan made on the phone shows on the website and the other way round.

While `Config.billingLive` is false (same as the website's BILLING_LIVE), every signed-in account gets everything.

## Build it (on your Mac)

1. Install Xcode from the Mac App Store, open it once, accept the licence.
2. In Terminal:
   ```
   brew install xcodegen
   git clone https://github.com/asimi99/senior-resident.git
   cd senior-resident/ios
   xcodegen
   open SeniorResident.xcodeproj
   ```
3. In Xcode, click the project, then for each target (SeniorResident and SeniorResidentWidget): Signing & Capabilities, tick Automatically manage signing, pick your Team. Xcode registers the bundle IDs (com.myseniorresident.app and com.myseniorresident.app.widget), the App Group (group.com.myseniorresident.app) and Sign in with Apple.
4. Plug in your iPhone, pick it at the top, press Run (the play button). First run: on the phone, Settings, General, VPN and Device Management, trust your developer certificate.

## One-time server setup (Supabase dashboard)

1. Authentication, Providers, Apple: turn on, and under Client IDs add `com.myseniorresident.app`. Native Sign in with Apple needs nothing else.
2. Authentication, URL Configuration, Redirect URLs: add `seniorresident://login-callback` (Google sign-in returns to the app here).
3. Edge Functions: deploy `supabase/functions/sr-delete-account` with JWT verification ON (Apple requires account deletion in the app).

## Send it to the App Store

1. App Store Connect, Apps, +, New App: platform iOS, name "Senior Resident: Study Planner", bundle ID com.myseniorresident.app, SKU senior-resident-ios.
2. In Xcode: Product, Archive, then Distribute App, App Store Connect, Upload.
3. TestFlight first: install on your phone, try every screen.
4. Fill in the listing below, add screenshots (6.9 inch iPhone: 1320 x 2868; take them in the simulator with the iPhone 16 Pro Max), answer App Privacy, and Submit for Review.

### Listing

- **Name:** Senior Resident: Study Planner
- **Subtitle:** Med school plan, widget, coach
- **Category:** Education (secondary: Medical)
- **Age rating:** 4+ (no objectionable content). Medical/treatment information: none, it is exam study, not medical advice.
- **Promotional text:** Your question bank plan on your home screen. Snap your subject list, get a day-by-day plan, check off today from the widget.
- **Description:**
  Senior Resident turns your question bank into a plan you can actually follow.

  Snap a photo of your question bank's subject list and Senior Resident reads every subject and question count on your phone. Pick your exam date and study days, and it builds a day-by-day plan with practice exams and review days at the end.

  Today's questions sit on your home screen and lock screen. Check off the day right from the widget, keep a streak, and see if you are on track. Missed a few days? Shift the rest of the plan in one tap.

  Morning reminders tell you what is due. Evening nudges keep you honest until you check in.

  Stuck on a question? With Resident or Chief, photograph it and the coach walks you to the answer one decision at a time, the way a senior resident would on rounds.

  Works with UWorld, AMBOSS, NBME practice exams, Kaplan, TrueLearn and more for USMLE, NBME shelf exams and MCCQE.

  Senior Resident is a study aid, not medical advice, and is not affiliated with any question bank or exam body.
- **Keywords:** usmle,shelf,nbme,uworld,step 1,step 2,study plan,med school,mccqe,qbank,planner
- **Support URL:** https://myseniorresident.com/
- **Privacy Policy URL:** https://myseniorresident.com/privacy.html

### App Privacy answers

- Contact info (name, email): collected, linked to the user, used for app functionality. Not used for tracking.
- User content (questions photographed for coaching, study plan): collected, linked, app functionality. Coaching photos are sent to coach that question and not stored.
- No tracking, no ads, no third-party analytics.

### Review notes (paste in App Review Information)

> Senior Resident is a study planner for medical students. To review: sign in with the demo account below. On Today, tap Build my plan, pick an exam and dates, then use Take a photo or Screenshot under Subjects to import a question bank's subject list (any photo of a list like "Cardiovascular (120)" works), and Build. Add the Today widget to the home screen to check in from it. Reminders are local notifications. The Coach tab coaches a photographed practice question.
>
> Paid plans (Resident, Chief) are sold only on our website. The app has no purchase buttons, prices or links to buy; signed-in subscribers get the coach and photo import. Account deletion: Account tab, Delete my account.
>
> Demo account: reviewer@myseniorresident.com / (create one and put the password here). It has the Resident plan.

### The payment rule to know about

Apple's guideline 3.1.1 says digital features sold to iPhone users should use in-app purchase. Apps that only unlock what was bought elsewhere, with no buy buttons or links, are often approved, but Apple can still ask for in-app purchase. If review rejects it on 3.1.1, the fix is adding Resident and Chief as App Store subscriptions (StoreKit) and syncing them to the same plan in Supabase.
