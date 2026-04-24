import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs";
import * as XLSX from "xlsx";

dotenv.config();

const app = express();
const PORT = 3000;
const TOKEN_PATH = path.join(process.cwd(), ".tokens.json");

app.use(express.json());

// Load tokens/gasUrl from file if they exist
let userTokens: any = null;
let gasUrl: string | null = process.env.GOOGLE_GAS_URL || null;

if (fs.existsSync(TOKEN_PATH)) {
  try {
    const stored = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    userTokens = stored.tokens || (stored.access_token ? stored : null);
    gasUrl = stored.gasUrl || gasUrl;
  } catch (e) {
    console.error("Error loading stored config");
  }
}

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

const getSheetsClient = () => {
  if (gasUrl || DEFAULT_GAS_URL) return null; // Bridge mode active
  if (!userTokens) throw new Error("Google Account not linked. Go to Master Setup.");
  oauth2Client.setCredentials(userTokens);
  return google.sheets({ version: "v4", auth: oauth2Client });
};

// --- BRIDGE PROXY HELPER ---
const callBridge = async (action: string, data?: any) => {
  const activeUrl = gasUrl || DEFAULT_GAS_URL;
  if (!activeUrl) throw new Error("GAS Bridge URL not configured.");
  const response = await fetch(activeUrl, {
    method: "POST",
    body: JSON.stringify({ action, data }),
    headers: { "Content-Type": "application/json" }
  });
  const res = await response.json();
  if (res.error) throw new Error(res.error);
  return res;
};

const getBridge = async (action: string, params: Record<string, string> = {}) => {
  const activeUrl = gasUrl || DEFAULT_GAS_URL;
  if (!activeUrl) throw new Error("GAS Bridge URL not configured.");
  const qs = new URLSearchParams({ action, ...params }).toString();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${activeUrl}?${qs}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const res = await response.json();
    if (res.error) throw new Error(res.error);
    return res;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error("Bridge request timed out. Please check your GS connectivity.");
    throw e;
  }
};

// --- AUTH ROUTES ---

app.get("/api/auth/config-status", (req, res) => {
  res.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    spreadsheetId: getSpreadsheetId(),
    gasUrl: gasUrl || DEFAULT_GAS_URL
  });
});

app.post("/api/auth/gas-url", (req, res) => {
  const { url } = req.body;
  gasUrl = url;
  const existing = fs.existsSync(TOKEN_PATH) ? JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8")) : {};
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, gasUrl: url }));
  res.json({ success: true });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ authenticated: !!userTokens || !!gasUrl || !!DEFAULT_GAS_URL });
});

app.get("/api/auth/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    prompt: "consent",
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    userTokens = tokens;
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens)); // Persist tokens
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/auth/logout", (req, res) => {
  userTokens = null;
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  res.json({ success: true });
});

// --- CORE LOGIC & SHEET INITIALIZATION ---

const TABS = {
  MASTER_METERS: "MASTER_METERS",
  RAW_DATA: "RAW_DATA",
  CALCULATIONS: "CALCULATIONS",
  DAILY_SUMMARY: "DAILY_SUMMARY",
  DASHBOARD: "DASHBOARD",
  SETTINGS: "SETTINGS",
};

const DEFAULT_SPREADSHEET_ID = "1O9MEVQScffngbMywD_S0AsdbF2DTFs5hk1v4z9ONf14";
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbzrsNLrUQsYsTAzWZ9aUsdTM61PiDIoG4E0fS5PPBtjxhkXiHgRBc_CWzy4y7rpjFhr/exec";

const getSpreadsheetId = () => process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;

app.post("/api/init-sheet", async (req, res) => {
  try {
    const activeGasUrl = gasUrl || DEFAULT_GAS_URL;
    if (activeGasUrl) {
      const result = await callBridge("init");
      return res.json(result);
    }
    const sheets = getSheetsClient()!;
    const spreadsheetId = getSpreadsheetId();

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = meta.data.sheets?.map(s => s.properties?.title) || [];

    const sheetsToCreate = Object.values(TABS).filter(t => !existingSheets.includes(t));

    if (sheetsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: sheetsToCreate.map(title => ({
            addSheet: { properties: { title } }
          }))
        }
      });
    }

    // Add Headers and Seed Data
    const headersMap: Record<string, string[]> = {
      [TABS.MASTER_METERS]: ["Meter ID", "Meter No", "Account No", "Building", "Location", "Phase Type", "Status"],
      [TABS.RAW_DATA]: ["Date", "Time", "Meter ID", "Meter Reading (kWh)", "Phase Status", "Shift", "Remark"],
      [TABS.CALCULATIONS]: ["Date", "Time", "Meter ID", "Current Reading", "Previous Reading", "Units Used (kWh)", "Hour", "Tariff Type", "Unit Rate", "Cost"],
      [TABS.DAILY_SUMMARY]: ["Date", "Meter ID", "Total Units", "Total Cost"],
      [TABS.SETTINGS]: ["Key", "Value", "Description"]
    };

    for (const [title, headers] of Object.entries(headersMap)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] }
      });
    }

    // Seed provided meter data
    const meterSeed = [
      ["AL-214422", "AL-214422", "", "140-H", "", "3-Phase", "Live"],
      ["AL-151959", "AL-151959", "", "140-H", "", "3-Phase", "Live"],
      ["AL-060851", "AL-060851", "", "141-C", "Data Center - D", "1-Phase", "Live"],
      ["AL-214649", "AL-214649", "", "141-C", "All building", "3-Phase", "Live"],
      ["AL-060852", "AL-060852", "", "141-C", "Container", "1-Phase", "Live"],
      ["SCT93928", "SCT93928", "400006419249", "141-D", "GF", "1-Phase", "Live"],
      ["SCJ84853", "SCJ84853", "400006419575", "141-D", "Out Door Area + Motor", "1-Phase", "Live"],
      ["AL-214647", "AL-214647", "", "141-D", "2nd Floor", "3-Phase", "Live"],
      ["SCJ84858", "SCJ84858", "400006419869", "141-D", "2nd Floor", "1-Phase", "Live"],
      ["AL-281215", "AL-281215", "", "141-D", "GF", "3-Phase", "Live"],
      ["SCJ84852", "SCJ84852", "400006422142", "141-D", "FF", "1-Phase", "Live"],
      ["SCJ84851", "SCJ84851", "400006422290", "141-D", "FF", "1-Phase", "Live"],
      ["SCJ84856", "SCJ84856", "", "141-D", "", "1-Phase", "Live"],
      ["SCT93927", "SCT93927", "400006419338", "141-D", "FF", "1-Phase", "No Display"],
      ["SCJ84855", "SCJ84855", "400006419451", "141-D", "", "1-Phase", "No Display"],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.MASTER_METERS}!A2:G${meterSeed.length + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: meterSeed }
    });

    // Default Settings
    const defaultSettings = [
      ["PEAK_START", "18:30", "Starting time for Peak tariff (HH:MM)"],
      ["PEAK_END", "22:30", "Ending time for Peak tariff (HH:MM)"],
      ["RATE_PEAK", "50", "Cost per unit during peak hours (PKR)"],
      ["RATE_OFF_PEAK", "35", "Cost per unit during off-peak hours (PKR)"]
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TABS.SETTINGS}!A2:C5`,
      valueInputOption: "RAW",
      requestBody: { values: defaultSettings }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- API ROUTES ---

app.get("/api/settings", async (req, res) => {
  try {
    const activeGasUrl = gasUrl || DEFAULT_GAS_URL;
    if (activeGasUrl) {
       const result = await getBridge("getSettings");
       return res.json(result);
    }
    const sheets = getSheetsClient()!;
    const spreadsheetId = getSpreadsheetId();
    const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TABS.SETTINGS}!A2:B` });
    const rows = result.data.values || [];
    const settings: Record<string, string> = {};
    rows.forEach(r => settings[r[0]] = r[1]);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const activeGasUrl = gasUrl || DEFAULT_GAS_URL;
    if (activeGasUrl) {
       const result = await callBridge("updateSettings", req.body);
       return res.json(result);
    }
    const sheets = getSheetsClient()!;
    const spreadsheetId = getSpreadsheetId();
    const settings = req.body;
    const values = Object.entries(settings).map(([key, val]) => [key, val]);
    
    const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TABS.SETTINGS}!A2:A` });
    const keys = (result.data.values || []).map(r => r[0]);

    for (const [key, val] of values) {
      const idx = keys.indexOf(key as string);
      if (idx !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${TABS.SETTINGS}!B${idx + 2}`,
          valueInputOption: "RAW",
          requestBody: { values: [[val]] }
        });
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

let cachedMeters: { data: any; timestamp: number } | null = null;

app.get("/api/meters", async (req, res) => {
  try {
    if (cachedMeters && Date.now() - cachedMeters.timestamp < CACHE_TTL) {
       return res.json(cachedMeters.data);
    }

    const activeGasUrl = gasUrl || DEFAULT_GAS_URL;
    if (activeGasUrl) {
      const result = await getBridge("getMeters");
      cachedMeters = { data: result, timestamp: Date.now() };
      return res.json(result);
    }
    const sheets = getSheetsClient()!;
    const spreadsheetId = getSpreadsheetId();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.MASTER_METERS}!A2:G`,
    });
    const rows = result.data.values || [];
    const meters = rows.map(r => ({
      MeterID: r[0],
      no: r[1],
      AccountNo: r[2],
      Building: r[3],
      Location: r[4],
      type: r[5],
      status: r[6]
    }));
    res.json(meters);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/readings", async (req, res) => {
  try {
    const activeGasUrl = gasUrl || DEFAULT_GAS_URL;
    if (activeGasUrl) {
       const result = await callBridge("addEntry", req.body);
       return res.json(result);
    }
    const { date, time, meterId, reading, phaseStatus, shift, remark } = req.body;
    const sheets = getSheetsClient()!;
    const spreadsheetId = getSpreadsheetId();

    // 1. Check for duplicates (same ID, Date, Time) - Simple check against RAW_DATA
    const rawData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.RAW_DATA}!A2:C`,
    });
    const rows = rawData.data.values || [];
    const isDuplicate = rows.some(r => r[0] === date && r[1] === time && r[2] === meterId);
    if (isDuplicate) return res.status(400).json({ error: "Duplicate entry for this meter at this time." });

    // 2. Fetch calculations for previous reading
    const calcData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.CALCULATIONS}!A2:F`,
    });
    const calcRows = calcData.data.values || [];
    const meterReadings = calcRows.filter(r => r[2] === meterId).sort((a, b) => {
      const dtA = new Date(`${a[0]} ${a[1]}`).getTime();
      const dtB = new Date(`${b[0]} ${b[1]}`).getTime();
      return dtB - dtA; // Latest first
    });

    const lastEntry = meterReadings[0];
    const prevReading = lastEntry ? parseFloat(lastEntry[3]) : null;
    const unitsUsed = prevReading !== null ? parseFloat(reading) - prevReading : "";

    // 3. Peak/Off-Peak logic from SETTINGS
    const settingsRes = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range: `${TABS.SETTINGS}!A2:B` 
    });
    const sRows = settingsRes.data.values || [];
    const settings: any = {};
    sRows.forEach(r => settings[r[0]] = r[1]);

    const pStartStr = settings.PEAK_START || "18:30";
    const pEndStr = settings.PEAK_END || "22:30";
    const rPeak = parseFloat(settings.RATE_PEAK) || 50;
    const rOffPeak = parseFloat(settings.RATE_OFF_PEAK) || 35;

    const [h, m] = time.split(":").map(Number);
    const timeInMins = h * 60 + m;
    
    const [psH, psM] = pStartStr.split(":").map(Number);
    const [peH, peM] = pEndStr.split(":").map(Number);
    const peakStart = psH * 60 + psM;
    const peakEnd = peH * 60 + peM;

    const isPeak = timeInMins >= peakStart && timeInMins <= peakEnd;
    const tariffType = isPeak ? "Peak" : "Off-Peak";
    const unitRate = isPeak ? rPeak : rOffPeak;
    const cost = typeof unitsUsed === "number" ? unitsUsed * unitRate : "";

    // 4. Save to RAW_DATA
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.RAW_DATA}!A:G`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[date, time, meterId, reading, phaseStatus, shift, remark]]
      }
    });

    // 5. Save to CALCULATIONS
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${TABS.CALCULATIONS}!A:J`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[date, time, meterId, reading, prevReading || "", unitsUsed, h, tariffType, unitRate, cost]]
      }
    });

    res.json({ success: true, warning: prevReading !== null && parseFloat(reading) < prevReading ? "Current reading is less than previous reading." : null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

let cachedDashboard: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 15000; // 15 seconds cache

app.get("/api/dashboard", async (req, res) => {
  try {
    // Return cached data if fresh
    if (cachedDashboard && Date.now() - cachedDashboard.timestamp < CACHE_TTL) {
      return res.json(cachedDashboard.data);
    }

    const activeGasUrl = gasUrl || DEFAULT_GAS_URL;
    if (activeGasUrl) {
      const result = await getBridge("getDashboard");
      
      // Update cache
      cachedDashboard = { data: result, timestamp: Date.now() };
      
      return res.json(result);
    }
    // ... rest of the logic
    const sheets = getSheetsClient()!;
    const spreadsheetId = getSpreadsheetId();
    const calcData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.CALCULATIONS}!A2:J`,
    });
    const rows = calcData.data.values || [];
    
    // Process rows into stats
    const today = new Date().toISOString().split('T')[0];
    const todayData = rows.filter(r => r[0] === today);
    const totalUnitsToday = todayData.reduce((acc, r) => acc + (parseFloat(r[5]) || 0), 0);
    const totalCostToday = todayData.reduce((acc, r) => acc + (parseFloat(r[9]) || 0), 0);

    // Meters Mapping
    const metersRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.MASTER_METERS}!A2:D`,
    });
    const metersRows = metersRes.data.values || [];
    const meterBuildingMap: Record<string, string> = {};
    metersRows.forEach(r => meterBuildingMap[r[0]] = r[3]);

    const buildingStats: Record<string, { units: number, cost: number }> = {};
    const meterStats: Record<string, { units: number, cost: number }> = {};
    const tariffStats = { Peak: 0, OffPeak: 0 };
    const hourlyStats: Record<number, number> = {};
    const dailyStats: Record<string, number> = {};

    rows.forEach(r => {
      const date = r[0];
      const bld = meterBuildingMap[r[2]] || "Unknown";
      const units = parseFloat(r[5]) || 0;
      const cost = parseFloat(r[9]) || 0;
      const tType = r[7];
      const hr = parseInt(r[6]);

      // Overall stats
      buildingStats[bld] = buildingStats[bld] || { units: 0, cost: 0 };
      buildingStats[bld].units += units;
      buildingStats[bld].cost += cost;

      meterStats[r[2]] = meterStats[r[2]] || { units: 0, cost: 0 };
      meterStats[r[2]].units += units;
      meterStats[r[2]].cost += cost;

      if (tType === "Peak") tariffStats.Peak += units;
      else tariffStats.OffPeak += units;

      // Hourly (of all time or we could filter - for now let's keep as is but add daily)
      hourlyStats[hr] = (hourlyStats[hr] || 0) + units;
      
      // Daily
      dailyStats[date] = (dailyStats[date] || 0) + units;
    });

    res.json({
      summary: { totalUnitsToday, totalCostToday },
      buildingStats,
      meterStats,
      tariffStats,
      hourlyStats,
      dailyStats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/reports", async (req, res) => {
  try {
    const { from, to, meterId, building } = req.query;
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    
    const [calcData, metersData] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${TABS.CALCULATIONS}!A1:J` }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${TABS.MASTER_METERS}!A2:D` })
    ]);

    const rows = calcData.data.values || [];
    const headers = rows[0];
    let dataRows = rows.slice(1);

    const meterBuildingMap: Record<string, string> = {};
    (metersData.data.values || []).forEach(r => meterBuildingMap[r[0]] = r[3]);

    if (from) dataRows = dataRows.filter(r => r[0] >= (from as string));
    if (to) dataRows = dataRows.filter(r => r[0] <= (to as string));
    if (meterId) dataRows = dataRows.filter(r => r[2] === meterId);
    if (building) dataRows = dataRows.filter(r => meterBuildingMap[r[2]] === building);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=EnergyReport.xlsx");
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
