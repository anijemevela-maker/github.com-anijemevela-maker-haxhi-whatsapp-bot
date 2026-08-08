/**
 * Apartamenta e Haxhi — Asistent WhatsApp (Twilio WhatsApp API)
 * -------------------------------------------------------------
 * Webhook server that powers real automated replies on WhatsApp
 * using Twilio's WhatsApp API. Same conversation logic as the
 * HTML demo, adapted to plain-text numbered menus (works on any
 * phone, no button templates needed).
 *
 * SETUP: see README.md for full step-by-step instructions.
 */

const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const { appendBooking } = require("./sheets");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;

// ---------------- EDIT HOTEL DATA HERE ----------------
const HOTEL = {
  name: "Apartamenta e Haxhi",
  address: "Rruga e Plazhit, afër plazhit qendror, Sarandë",
  checkin: "14:00",
  checkout: "11:00",
  phoneDisplay: "+355 68 343 9349",
  rooms: [
    { label: "Apartament Studio (1-2 persona)", price: "40€/natë", desc: "Krevat dopio, kuzhinë e vogël, banjo private, balkon." },
    { label: "Apartament 1+1 (2-4 persona)", price: "55€/natë", desc: "Dhomë ndenje + 1 dhomë gjumi, kuzhinë e plotë, balkon me pamje nga deti." },
    { label: "Apartament 2+1 (4-6 persona)", price: "75€/natë", desc: "2 dhoma gjumi, ideal për familje, kuzhinë e plotë, 2 balkone." },
  ],
  amenities: "Wi-Fi falas, klimë, kuzhinë e pajisur plotësisht, balkon me pamje nga deti, parking falas, çarçafë & peshqirë të përfshirë",
};

const FAQ = {
  "1": { label: "Syri i Kaltër", text: "Syri i Kaltër (Blue Eye) është ~17 km nga Sarandë — burim natyror me ujë kristal blu të thellë. Rekomandojmë vizitë herët në mëngjes. 💙" },
  "2": { label: "Butrint", text: "Butrinti është park arkeologjik, Patrimon i UNESCO-s, ~18 km nga Sarandë. Hapur çdo ditë 08:00–19:00 (verë)." },
  "3": { label: "Ksamil", text: "Ksamili është ~17 km nga Sarandë, i njohur për ishujt e vegjël dhe ujin türkiz. ~20 min me taxi ose autobus lokal." },
  "4": { label: "Traget për Korfuz", text: "Nga porti i Sarandës ka trageta të shpeshta për Korfuz (Greqi), ~30-40 min. Biletat merren në port ose online." },
  "5": { label: "Kalaja e Lëkurësisë", text: "Mbi qytet, ~5 km, me pamje panoramike nga Sarandë deri në Korfuz — ideale për perëndim dielli." },
  "6": { label: "Restorante afër", text: "Rreth Apartamenteve ka disa restorante peshku dhe taverna tradicionale brenda 5 min në këmbë, pranë bregdetit." },
};

// ---------------- Session state (in-memory) ----------------
// NOTE: for production with many users, replace this Map with a real
// database (e.g. Redis or a small Postgres table) so sessions survive
// server restarts. Fine as-is for a single small hotel's volume.
const sessions = new Map();

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, { step: "root", booking: {} });
  }
  return sessions.get(from);
}

function mainMenuText() {
  return (
    `Mirë se erdhët te ${HOTEL.name} 🌊\n\n` +
    `Përgjigjuni me numrin e opsionit:\n` +
    `1️⃣ Dhomat & çmimet\n` +
    `2️⃣ Dua të rezervoj\n` +
    `3️⃣ Adresa & udhëtimi\n` +
    `4️⃣ Pyetje për Sarandën`
  );
}

function roomsText() {
  let msg = "Këto janë opsionet tona:\n\n";
  HOTEL.rooms.forEach((r) => {
    msg += `🛏️ ${r.label}\n💶 ${r.price}\n${r.desc}\n\n`;
  });
  msg += `Të përfshira: ${HOTEL.amenities}.\n\nShkruani "2" për të rezervuar, ose "menu" për t'u kthyer.`;
  return msg;
}

function addressText() {
  return (
    `📍 ${HOTEL.address}\n\n` +
    `🕑 Check-in: ${HOTEL.checkin}\n🕚 Check-out: ${HOTEL.checkout}\n📞 ${HOTEL.phoneDisplay}\n\n` +
    `Jemi 3 minuta në këmbë nga plazhi qendror i Sarandës.\n\nShkruani "menu" për t'u kthyer.`
  );
}

function faqMenuText() {
  let msg = "Çfarë ju intereson rreth Sarandës? 🏖️\n\n";
  Object.entries(FAQ).forEach(([k, v]) => (msg += `${k}️⃣ ${v.label}\n`));
  msg += `\nShkruani numrin, ose "menu" për t'u kthyer.`;
  return msg;
}

/**
 * Core conversation logic: given the session and incoming text,
 * returns the reply text and updates session.step / session.booking.
 */
function handleMessage(session, textRaw) {
  const text = textRaw.trim().toLowerCase();

  if (text === "menu" || text === "menuja" || text === "start" || text === "hi" || text === "hello" || text === "përshëndetje") {
    session.step = "root";
    return mainMenuText();
  }

  switch (session.step) {
    case "root": {
      if (text === "1") { session.step = "rooms"; return roomsText(); }
      if (text === "2") { session.step = "book_dates"; return "Super! Le ta bëjmë rezervimin 📅\n\nShkruani datën e ardhjes dhe largimit (p.sh. 12 Gusht – 16 Gusht):"; }
      if (text === "3") { session.step = "address"; return addressText(); }
      if (text === "4") { session.step = "faq_menu"; return faqMenuText(); }
      return `Nuk e kuptova 🙂\n\n${mainMenuText()}`;
    }

    case "rooms": {
      if (text === "2") { session.step = "book_dates"; return "Super! Le ta bëjmë rezervimin 📅\n\nShkruani datën e ardhjes dhe largimit (p.sh. 12 Gusht – 16 Gusht):"; }
      session.step = "root";
      return mainMenuText();
    }

    case "address": {
      session.step = "root";
      return mainMenuText();
    }

    case "faq_menu": {
      if (FAQ[text]) {
        session.step = "faq_menu";
        return `${FAQ[text].text}\n\nShkruani një tjetër numër, ose "menu" për t'u kthyer.`;
      }
      session.step = "root";
      return mainMenuText();
    }

    case "book_dates": {
      session.booking.dates = textRaw.trim();
      session.step = "book_guests";
      return "Për sa persona është rezervimi? (p.sh. 2 persona)";
    }

    case "book_guests": {
      session.booking.guests = textRaw.trim();
      session.step = "book_name";
      return "Faleminderit! Si quheni?";
    }

    case "book_name": {
      session.booking.name = textRaw.trim();
      session.step = "book_phone";
      return "Cili është numri juaj i telefonit për kontakt?";
    }

    case "book_phone": {
      session.booking.phone = textRaw.trim();
      const b = session.booking;
      session.step = "root";
      const summary =
        `✅ Përmbledhja e kërkesës:\n\n` +
        `📅 Datat: ${b.dates}\n👥 Persona: ${b.guests}\n🙋 Emri: ${b.name}\n📞 Telefoni: ${b.phone}\n\n` +
        `Kërkesa u ruajt — stafi ynë do t'ju konfirmojë së shpejti!\n\n` +
        `Shkruani "menu" për t'u kthyer.`;
      // TODO: this is where you'd notify the hotel owner, e.g. by
      // sending them a separate WhatsApp/SMS message via Twilio, or
      // saving the booking to a spreadsheet/database/CRM.
      notifyOwnerOfBooking(b).catch((err) => console.error("Notify owner failed:", err));
      appendBooking(b).catch((err) => console.error("Google Sheets log failed:", err));
      return summary;
    }

    default: {
      session.step = "root";
      return mainMenuText();
    }
  }
}

// ---------------- Optional: notify the owner of new booking requests ----------------
async function notifyOwnerOfBooking(booking) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
  const ownerWhatsApp = process.env.OWNER_WHATSAPP_TO; // e.g. "whatsapp:+355683439349"

  if (!sid || !token || !fromWhatsApp || !ownerWhatsApp) {
    console.log("Owner notification skipped (Twilio env vars not fully set).");
    return;
  }

  const client = twilio(sid, token);
  await client.messages.create({
    from: fromWhatsApp,
    to: ownerWhatsApp,
    body:
      `📩 Kërkesë e re rezervimi — ${HOTEL.name}\n\n` +
      `📅 ${booking.dates}\n👥 ${booking.guests}\n🙋 ${booking.name}\n📞 ${booking.phone}`,
  });
}

// ---------------- Webhook endpoint (Twilio calls this on every incoming message) ----------------
app.post("/webhook", (req, res) => {
  const from = req.body.From; // e.g. "whatsapp:+355691234567"
  const body = req.body.Body || "";

  const session = getSession(from);
  const replyText = handleMessage(session, body);

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(replyText);

  res.type("text/xml").send(twiml.toString());
});

// simple health check
app.get("/", (req, res) => res.send(`${HOTEL.name} WhatsApp bot is running.`));

app.listen(PORT, () => {
  console.log(`✅ ${HOTEL.name} bot listening on port ${PORT}`);
});
