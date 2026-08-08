/**
 * sheets.js — shton çdo rezervim të ri si rresht të ri në Google Sheets.
 *
 * Kërkon 3 ndryshore mjedisi (shiko README.md për si t'i marrësh):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 *   GOOGLE_SHEET_ID
 *
 * Nëse nuk janë vendosur, funksioni thjesht "hesht" (nuk e ndal botin).
 */

const { google } = require("googleapis");

function isConfigured() {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

function getSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    // Render/most hosts store multi-line keys with literal "\n" — convert back to real newlines.
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  return google.sheets({ version: "v4", auth });
}

/**
 * Appends one booking row: [Data & ora, Datat kërkuara, Persona, Emri, Telefoni, Statusi]
 */
async function appendBooking(booking) {
  if (!isConfigured()) {
    console.log("Google Sheets nuk është konfiguruar — rezervimi u kap vetëm në log, jo në sheet.");
    return;
  }

  const sheets = getSheetsClient();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB || "Rezervime";

  const row = [
    new Date().toLocaleString("sq-AL", { timeZone: "Europe/Tirane" }),
    booking.dates || "",
    booking.guests || "",
    booking.name || "",
    booking.phone || "",
    "E re",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!A:F`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

module.exports = { appendBooking, isConfigured };
