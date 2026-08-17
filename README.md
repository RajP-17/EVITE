# Parsottam Dada's 75th: invitation & RSVP site

A one-page invitation with a working RSVP form, plus a private dashboard for
whoever is counting heads. Built as plain HTML/CSS/JS with no build step, no
framework, no npm install. Open `index.html` and it runs.

```
index.html              the invitation + RSVP form
rsvps.html              host dashboard (who's coming, notes, messages)
assets/js/config.js     ← the only file you normally edit
assets/css/styles.css   styling
assets/js/app.js        invitation behaviour
assets/js/rsvps.js      dashboard behaviour
apps-script/Code.gs     the RSVP backend, to paste into Google Apps Script
```

---

## 1. Check the details

Open **`assets/js/config.js`**. Everything the site says about the party comes
from that one file. It's currently filled in from the printed invitation:

| | |
|---|---|
| Who | Parsottam Dada |
| What | 75th Birthday, surprise |
| When | Saturday 19 September 2026, 6:00 PM |
| Where | 1519 Scenic Club Drive, Cary, NC 27519 |
| Dress | Indian Bandhini & Kurta Pyjama |
| RSVP by | 1 September 2026 |

**A few things I filled in that you should check or change:**

- **`guestArrival: "5:30 PM"`**: guests arrive 5:30, Dada walks in at 6:00.
  I inferred this because it's a surprise; the invitation only says 6 PM.
  Set `guestArrival: ""` to drop the callout entirely.
- **`hostedBy: "Alpesh Patel and family"`** is what the footer signs off with.
- **`contacts`** is the list of people guests can reach, one card each. Add or
  remove entries freely; each needs a name and a phone or an email.
- **`parkingNote` / `foodNote` / `giftsNote`**: I wrote sensible versions. Edit
  or set to `""` to hide the card.
- **`faq`**: six questions written for a surprise party. Add or delete freely.

Also worth knowing: the **link preview** (`share.previewTitle`) deliberately
does *not* name Parsottam Dada or say "surprise", so if the link gets forwarded to
the wrong group chat the preview card doesn't spoil it.

---

## 2. Collecting RSVPs

Out of the box `rsvp.mode` is `"demo"`. The form works, but submissions are
saved to the visitor's own browser and nobody receives them. A dark warning
banner shows across the top while this is on. **Pick one of the two options
below before you send the link to anyone.**

### Option A: Google Sheet (recommended)

RSVPs land in a spreadsheet you own, you get an email on each one, and
`rsvps.html` works. Free. About five minutes.

1. Go to <https://sheets.new> and name it something like *Parsottam Dada 75th RSVPs*.
2. **Extensions ▸ Apps Script**. Delete the placeholder code.
3. Paste in the whole of [`apps-script/Code.gs`](apps-script/Code.gs).
4. Near the top, change `ADMIN_KEY` to a passphrase of your own.
5. **Run ▸ `setup`**. Approve the permission prompt (it's your own script asking
   to write to your own sheet and send mail as you).
6. **Deploy ▸ New deployment ▸ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ← this matters; "Anyone with Google account"
     will block guests
7. Copy the `/exec` URL it gives you.
8. In `assets/js/config.js`:

   ```js
   rsvp: {
     mode: "appsscript",
     endpoint: "https://script.google.com/macros/s/AKfy…/exec"
   }
   ```

Submit a test RSVP. It should appear in the sheet within a second or two.

> Editing `Code.gs` later? **Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New
> version ▸ Deploy.** The URL stays the same. If you skip this, your edits
> won't be live.

### Option B: Formspree (fastest)

RSVPs arrive as email. Simpler, but the dashboard won't work.

1. Sign up at <https://formspree.io>, create a form, copy the ID (the last part
   of the endpoint, e.g. `xbldnvqk`).
2. ```js
   rsvp: { mode: "formspree", formspreeId: "xbldnvqk" }
   ```

The free tier caps monthly submissions, fine for a family party, worth
checking if you're inviting a few hundred people.

---

## 3. Putting it online

### GitHub Pages (free, already wired up)

`.github/workflows/deploy-pages.yml` publishes the site on every push to `main`.
Turn it on once:

**Settings ▸ Pages ▸ Build and deployment ▸ Source: GitHub Actions**

Then push to `main`. The site appears at
`https://<your-username>.github.io/<repo-name>/`.

### Netlify or Vercel

Drag the folder onto <https://app.netlify.com/drop>, or point Vercel at the
repo. No build command, publish directory `.`.

### Just testing locally

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000>. (Opening `index.html` straight from Finder
works too, but a local server is closer to the real thing.)

---

## 4. The host dashboard

`rsvps.html`, e.g. `https://…github.io/evite/rsvps.html`. Enter the
`ADMIN_KEY` you set in `Code.gs` and you get:

- headcount, yes/no split, how many households are in
- a searchable table of every RSVP with contact details and notes
- every birthday message, laid out ready to print for the memory book
- CSV export for the caterer

The passphrase is a doorknob lock, not a vault. It keeps a stray guest from
wandering in, but anyone determined could read it out of the page. Don't put
anything genuinely sensitive in the form, and remember the Google Sheet itself
is always the real source of truth.

---

## 5. Details worth knowing

- **Repeat RSVPs replace earlier ones.** Someone submitting twice under the same
  name doesn't get double-counted. The older row is flagged `replaced` in the
  sheet (never deleted) and dropped from the totals.
- **Returning guests see their previous answer pre-filled**, and the button
  changes to *Update my RSVP*.
- **Add to calendar** opens Google Calendar on Android/desktop and downloads a
  `.ics` on iPhone/Mac. The event includes the arrival time, the dress code, and
  a reminder the day before.
- **Spam** is handled by a hidden honeypot field. Bots fill it in, people can't
  see it; those submissions are silently dropped.
- **Accessibility**: keyboard-navigable, labelled fields, live-region status
  messages, and all animation stops under `prefers-reduced-motion`.
- **Printing** the invitation page gives you a clean paper invite; printing the
  dashboard gives you a check-in list for the door.
- **`noindex`** is set on both pages so search engines stay away.

---

## 6. Before you send the link

- [ ] `rsvp.mode` is no longer `"demo"` and a test RSVP arrived
- [ ] `ADMIN_KEY` in `Code.gs` changed from the default
- [ ] Arrival time in `config.js` is what you actually want guests to do
- [ ] Names and phone numbers in `contacts` are right
- [ ] Opened it on your phone, that's how nearly everyone will see it
- [ ] Sent it to one person first as a sanity check

🤫 And not a word to Dada.
