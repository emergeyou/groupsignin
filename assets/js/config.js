/* EMERGE YOU Programs - kiosk configuration.
   Edit the values, save, reload the kiosk. Console edits on a tablet
   override these defaults (they are stored on the tablet itself). */
window.EMERGE_CONFIG = {
  "_comment": "EMERGE YOU Programs - kiosk configuration. Edit the values below; each tablet reads this file on load. Anything edited later in the coach console (stored on that tablet) overrides these defaults.",
  "org": "EMERGE YOU Programs",
  "kioskId": "Front desk",
  "coachPin": "1234",
  "defaultLogo": "assets/img/emerge-you-logo.png",
  "defaultIcon": "assets/img/emerge-you-icon.png",
  "enrollFormUrl": "https://form.jotform.com/241715534439156",
  "groups": [
    {
      "ref": "ACCENTURE",
      "full": "Work Readiness - Accenture (Hours)",
      "desc": "Work Readiness",
      "type": "WR"
    },
    {
      "ref": "EMP READY IN PERS",
      "full": "Work Readiness - In Person (Hours)",
      "desc": "In Person Work Readiness",
      "type": "WR"
    },
    {
      "ref": "MONEY ESS",
      "full": "Work Readiness - Money Essentials (Hours)",
      "desc": "Financial Wellness",
      "type": "WR"
    },
    {
      "ref": "WORK ESS",
      "full": "Work Readiness - Work Essentials (Hours)",
      "desc": "Work Readiness",
      "type": "WR"
    },
    {
      "ref": "BUILD",
      "full": "Youth Group - BUILD / Mastering the Self (Hours)",
      "desc": "Young Men Groups",
      "type": "YG"
    },
    {
      "ref": "REEL TALK",
      "full": "Youth Group - Reel Talk (Hours)",
      "desc": "Movie and activity nights",
      "type": "YG"
    },
    {
      "ref": "COMM SVC",
      "full": "Youth Group - Community Service (Hours)",
      "desc": "Community Service Work",
      "type": "YG"
    },
    {
      "ref": "SEL",
      "full": "Youth Group - SEL (Hours)",
      "desc": "Trauma, Mental Health Groups",
      "type": "YG"
    },
    {
      "ref": "SISTER CIRCLE",
      "full": "Youth Group - Sister Circle (Hours)",
      "desc": "Youth Girls Group",
      "type": "YG"
    },
    {
      "ref": "PRIDE & CROWN",
      "full": "Youth Group - Pride and Crown (Hours)",
      "desc": "Youth Coed Group",
      "type": "YG"
    },
    {
      "ref": "RPI",
      "full": "Restorative Practice Groups",
      "desc": "2nd Chance Group",
      "type": "OT"
    },
    {
      "ref": "FELLOWSHIP",
      "full": "Fellowship for Black Women Healers",
      "desc": "Sunday Group - Young Women",
      "type": "FBWH"
    },
    {
      "ref": "OTHER",
      "full": "Youth Group - Other (Hours)",
      "desc": "Youth Growth Groups",
      "type": "YG"
    }
  ],
  "groupTypes": {
    "YG": "Youth group",
    "WR": "Work readiness",
    "OT": "Other",
    "FBWH": "Fellowship",
    "IND": "Individual"
  },
  "requestReasons": [
    "Personal",
    "Conflict with someone",
    "Safety concern",
    "School or work",
    "Case management",
    "Just want to talk",
    "Something else"
  ],
  "urgency": {
    "now": {
      "label": "Need someone now",
      "short": "Urgent"
    },
    "soon": {
      "label": "When a coach is free",
      "short": "Routine"
    }
  },
  "mailModes": {
    "off": {
      "label": "Console + export only",
      "note": "Requests are recorded, shown on this console and carried into the export - no email is sent."
    },
    "webhook": {
      "label": "Mail relay (sends in the background)",
      "note": "Each request is POSTed to your relay URL, which sends the email to every coach on alert."
    },
    "mailto": {
      "label": "This device's mail app",
      "note": "Opens a pre-filled message on the kiosk device. Not silent, and kiosks usually have no mail app - use a relay instead."
    }
  }
};
