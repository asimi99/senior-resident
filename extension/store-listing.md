# Chrome Web Store listing: My Senior Resident

Paste these into the Chrome Web Store Developer Dashboard. Replace DOMAIN with the domain once it is bought.

## Store listing tab

**Name:** My Senior Resident: Qbank Reasoning Coach

**Summary (132 characters max):**
A reasoning coach beside your question bank. Walks you to the answer one decision at a time and turns what you learn into Anki cards.

**Category:** Education

**Language:** English

**Description:**
My Senior Resident sits beside your question bank like a senior resident on rounds. When you are stuck, it reads the question you are on and walks you to the answer one decision at a time, instead of just telling you.

What it does
- Coaches the question on screen step by step: how sick, where the problem is, the finding that decides it, then ruling out the wrong choices.
- Uses your own cross-outs to narrow the coaching to the choices you still have open.
- Page the attending when a step does not click.
- Turns what you learned into Anki cards in one tap, sent straight to your own Anki through AnkiConnect.
- Image occlusion cards from any image you choose.
- Builds a day-by-day study plan for your exam.

How it works
- Press Alt+S to open the side panel, then Alt+C (or "Coach this question") to coach the question you are on. Nothing is read until you ask.
- Works alongside UWorld, AMBOSS, NBME practice exams, Kaplan, TrueLearn, Rosh Review, BoardVitals, Canada QBank and Lecturio.

Plans
- Free: a few coached questions a day and the study plan.
- Resident and Chief plans add more questions, harder modes and Anki cards. Details at https://DOMAIN/pricing.html

Your data
- Question text is sent to our server only to coach that question and is never stored or used for training.
- Anki cards go straight to your own Anki on your computer.

My Senior Resident is a study aid, not medical advice. It is independent and not affiliated with or endorsed by any question bank, publisher, exam body, Anki or AnKing. You are responsible for following your question bank's terms of use.

**Website:** https://DOMAIN/
**Support:** https://DOMAIN/app/#help
**Privacy policy:** https://DOMAIN/privacy.html

## Graphics needed
- Icon 128x128: extension/senior-resident/icon128.png (done)
- Screenshots, 1280x800, 1 to 5:
  1. Side panel coaching a step next to a question bank page (use a made-up demo question, never a real UWorld question)
  2. The elimination step with cross-outs
  3. Page the attending reply
  4. Anki card preview
  5. Study plan
- Small promo tile 440x280 (optional): logo plus "Your senior resident on every question"

## Privacy practices tab

**Single purpose:**
Coach a medical student through the practice question they are viewing, one reasoning step at a time, and save what they learn as Anki cards.

**Permission justifications:**
- sidePanel: shows the coach in Chrome's side panel next to the question bank so it never covers the question.
- activeTab: reads the question on the current tab only when the student presses "Coach this question" or Alt+C.
- scripting: injects the reader into the current tab when the student asks for coaching, for question bank sites not covered by the content script.
- storage: keeps the student's settings, colour theme and recent coaching sessions on their device.
- identity: lets the student sign in with Google to keep their plan and progress across devices.
- offscreen: runs the AnkiConnect request in the background so cards reach the student's local Anki without opening a tab.
- Host permissions (question bank sites): the content script adds the "Coach this question" button and reads the visible question and answer choices only when asked.
- Host permission http://127.0.0.1:8765: AnkiConnect, the student's own Anki on their computer, to add the cards they choose.

**Remote code:** No. All code ships in the package.

**Data usage (tick these):**
- Personally identifiable information: yes (email and name for the account).
- Authentication information: yes (Google sign-in token).
- Website content: yes (the question text the student chooses to coach, sent to our server to generate coaching, not stored).
- Everything else: no.

**Certify:**
- I do not sell or transfer user data to third parties, apart from the approved use cases.
- I do not use or transfer user data for purposes unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Distribution tab
- Visibility: Public (or Unlisted for a soft launch to classmates first)
- Regions: Canada and United States at launch
- Pricing: Free (paid plans are sold on the website through Stripe)

## Before submitting
1. Developer account: one-time US$5 fee at https://chrome.google.com/webstore/devconsole (sign in with the Google account that should own the listing).
2. Upload extension/senior-resident.zip (version 1.0.20).
3. Review usually takes a few days. Broad host permissions can add time.
