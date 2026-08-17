/* =============================================================================
 * config.js: THE ONLY FILE YOU NEED TO EDIT
 * =============================================================================
 * Everything about the party lives here. Change a value, save, refresh.
 * Nothing else in the site has hard-coded party details.
 * ========================================================================== */

window.EVITE_CONFIG = {

  /* ---------------------------------------------------------------------
   * 1. THE PARTY
   * ------------------------------------------------------------------ */
  event: {
    // Name as it appears on the invitation.
    honoreePossessive: "Parsottam Dada's",
    honoreeName: "Parsottam Dada",
    // What the family calls him. Used in warm/casual sentences.
    honoreeNickname: "Dada",
    occasion: "75th Birthday",

    // Surprise party? Turns on the "keep it a secret" banner + reminders.
    isSurprise: true,

    // Start / end. Keep the -04:00 offset (Eastern Daylight Time in September).
    start: "2026-09-19T18:00:00-04:00",
    end:   "2026-09-19T22:00:00-04:00",
    timeZone: "America/New_York",

    // Surprise logistics. Set guestArrival to "" to hide the timing callout.
    guestArrival: "5:30 PM",
    surpriseMoment: "6:00 PM",

    // Where. Leave venueName as "" for a private residence.
    venueName: "The Clubhouse",
    addressLine1: "1519 Scenic Club Drive",
    addressLine2: "Cary, NC 27519",

    dressCode: "Indian Bandhini & Kurta Pyjama",
    dressCodeNote: "Bandhini prints and kurta pyjama in golds, creams and warm colours. Anything festive is welcome. Comfort over perfection.",

    // Last day to RSVP.
    rsvpDeadline: "2026-09-01T23:59:59-04:00",

    hostedBy: "Alpesh Patel and family",

    // Who guests contact with questions.
    contactName: "Raj",
    contactEmail: "rajpatel211075@gmail.com",
    contactPhone: "",   // e.g. "+1 919 555 0134". Leave "" to hide

    // Optional extra notes. Leave "" to hide the card entirely.
    parkingNote: "Park in any open spot.",
    foodNote: "Dinner will be served. Full vegetarian options available.",
    giftsNote: "Your presence is the gift."
  },

  /* ---------------------------------------------------------------------
   * 2. WHERE RSVPs GO
   * ------------------------------------------------------------------ */
  // mode: "appsscript" | "formspree" | "demo"
  //
  //   "appsscript"  RECOMMENDED. Free, RSVPs land in your own Google Sheet,
  //                 and the host dashboard (rsvps.html) works. Setup takes
  //                 about 5 minutes. See README.md, section "Collecting RSVPs".
  //
  //   "formspree"   Easiest. Sign up at formspree.io, paste your form ID.
  //                 RSVPs arrive by email. Dashboard won't work.
  //
  //   "demo"        No backend. Saves to the visitor's own browser only.
  //                 A loud warning banner shows while this is on.
  //                 THIS IS THE DEFAULT. Switch it before you send the link.
  rsvp: {
    mode: "appsscript",

    // For mode "appsscript": the /exec URL from your deployed Web App.
    endpoint: "https://script.google.com/macros/s/AKfycbxCzVRakQVaVZH6UEhCT_777XbS3UHe_u5ECbtjhSTHRZdO6T6kZdi_VvkThkaRvhqZ/exec",

    // For mode "formspree": just the ID, e.g. "xbldnvqk"
    formspreeId: ""
  },

  /* ---------------------------------------------------------------------
   * 3. LINK PREVIEWS  (surprise-safe by default)
   * ------------------------------------------------------------------ */
  // When someone drops the link in a group chat, this is the preview card.
  // It deliberately does NOT name Parsottam Dada or say "surprise", so a stray
  // forward doesn't spoil anything. Change if you don't care.
  share: {
    previewTitle: "You're Invited: Saturday, September 19",
    previewDescription: "An evening in Cary. Please RSVP by September 1st.",
    // Message pre-filled when a guest taps "Share invite".
    shareText: "You're invited! Details + RSVP here:"
  },

  /* ---------------------------------------------------------------------
   * 4. FAQ  (add, remove or reorder freely)
   * ------------------------------------------------------------------ */
  faq: [
    {
      q: "Wait, he really doesn't know?",
      a: "He really doesn't. Please don't mention it to him, don't post about it, and don't tag the address anywhere until after the 19th."
    },
    {
      q: "What time should I actually arrive?",
      a: "By 5:30 PM. Everyone needs to be inside and settled before he walks in at 6:00. If you're running late, please text rather than arriving during the surprise."
    },
    {
      q: "Can I bring my kids?",
      a: "Absolutely. Just include them in the headcount below so we plan food and seating properly."
    },
    {
      q: "Can I bring a plus-one?",
      a: "Yes, add them under \"who's coming with you\" so we know to expect them."
    },
    {
      q: "Do I have to wear Indian clothes?",
      a: "It's the theme and it'll look wonderful in photos, but nobody is being turned away. Wear something festive you feel good in."
    },
    {
      q: "What if my plans change after I RSVP?",
      a: "Just submit the form again with the same name, or text the number on this page. Later answers replace earlier ones."
    }
  ]
};
