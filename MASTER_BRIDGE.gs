/**
 * ENERGY PORTAL - MASTER BRIDGE SCRIPT
 * Version: 1.0 (PROD)
 * 
 * INSTRUCTIONS:
 * 1. Open your Spreadsheet: https://docs.google.com/spreadsheets/d/1O9MEVQScffngbMywD_S0AsdbF2DTFs5hk1v4z9ONf14/edit
 * 2. Go to Extensions > Apps Script
 * 3. Delete any code and paste THIS code
 * 4. Click 'Deploy' > 'New Deployment'
 * 5. Select 'Web App'
 * 6. Execute as: 'Me'
 * 7. Who has access: 'Anyone' (Required for the portal to connect)
 * 8. Copy the Web App URL and paste it into the Portal Setup
 */

const TABS = {
  MASTER_METERS: "MASTER_METERS",
  RAW_DATA: "RAW_DATA",
  CALCULATIONS: "CALCULATIONS",
  DAILY_SUMMARY: "DAILY_SUMMARY",
  SETTINGS: "SETTINGS"
};

function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("✅ Disrupt Energy Bridge: ONLINE.\n\nInstructions:\n1. Copy the URL from 'Deploy' > 'Test deployments' or 'Manage deployments'.\n2. Paste it into the 'Master Setup' section of your portal.")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === "getMeters") {
      const meterSheet = ss.getSheetByName(TABS.MASTER_METERS);
      const rawSheet = ss.getSheetByName(TABS.RAW_DATA);
      
      const meterData = meterSheet.getDataRange().getValues();
      const lastRow = rawSheet.getLastRow();
      const today = Utilities.formatDate(new Date(), "GMT+5", "yyyy-MM-dd");
      
      // Optimization: Only scan last 300 rows for today's status to remain fast
      const lookback = Math.min(lastRow - 1, 300);
      const entriesToday = new Set();
      
      if (lastRow > 1) {
        const rawRows = rawSheet.getRange(Math.max(2, lastRow - lookback + 1), 1, lookback, 3).getValues();
        rawRows.forEach(row => {
           const d = row[0] instanceof Date ? Utilities.formatDate(row[0], "GMT+5", "yyyy-MM-dd") : String(row[0]);
           if (d === today) entriesToday.add(String(row[2]));
        });
      }

      const headers = meterData[0];
      const rows = meterData.slice(1).map(row => {
        let obj = {};
        headers.forEach((h, i) => {
          const key = h.replace(/\s+/g, '');
          obj[key] = row[i];
        });
        obj.isDone = entriesToday.has(String(obj.MeterID || obj.MeterId));
        return obj;
      });
      return jsonResponse(rows);
    }
    
    // ... rest of the functions remain same logic but with better string handling
    if (action === "getSettings") {
      const sheet = ss.getSheetByName(TABS.SETTINGS);
      if (!sheet) return jsonResponse({});
      const data = sheet.getDataRange().getValues();
      const settings = {};
      data.slice(1).forEach(r => settings[String(r[0])] = r[1]);
      return jsonResponse(settings);
    }

    if (action === "getDashboard") {
      const calcSheet = ss.getSheetByName(TABS.CALCULATIONS);
      if (!calcSheet) return jsonResponse({ error: "No calculations found" });
      const lastRow = calcSheet.getLastRow();
      
      const stats = {
        summary: { totalUnitsToday: 0, totalCostToday: 0 },
        buildingStats: {},
        meterStats: {},
        tariffStats: { Peak: 0, OffPeak: 0 },
        hourlyStats: {}
      };

      if (lastRow <= 1) return jsonResponse(stats);

      const today = Utilities.formatDate(new Date(), "GMT+5", "yyyy-MM-dd");
      const meterSheet = ss.getSheetByName(TABS.MASTER_METERS);
      const meters = meterSheet.getDataRange().getValues().slice(1);
      const meterToBuilding = {};
      meters.forEach(m => meterToBuilding[String(m[0])] = m[3]);

      // Optimization: Only scan last 1000 calculation rows
      const lookback = Math.min(lastRow - 1, 1000);
      const data = calcSheet.getRange(Math.max(2, lastRow - lookback + 1), 1, lookback, 10).getValues();

      data.forEach(row => {
        const rowDate = row[0] instanceof Date ? Utilities.formatDate(row[0], "GMT+5", "yyyy-MM-dd") : String(row[0]);
        if (rowDate !== today) return;

        const meterId = String(row[2]);
        const units = parseFloat(row[5]) || 0;
        const hour = String(row[6]);
        const tariff = row[7];
        const cost = parseFloat(row[9]) || 0;
        const bName = meterToBuilding[meterId] || "Unknown";

        stats.summary.totalUnitsToday += units;
        stats.summary.totalCostToday += cost;

        if (!stats.buildingStats[bName]) stats.buildingStats[bName] = { units: 0, cost: 0 };
        stats.buildingStats[bName].units += units;
        stats.buildingStats[bName].cost += cost;

        if (!stats.meterStats[meterId]) stats.meterStats[meterId] = { units: 0, cost: 0 };
        stats.meterStats[meterId].units += units;
        stats.meterStats[meterId].cost += cost;

        if (tariff === "Peak") stats.tariffStats.Peak += units;
        else stats.tariffStats.OffPeak += units;

        stats.hourlyStats[hour] = (stats.hourlyStats[hour] || 0) + units;
      });

      return jsonResponse(stats);
    }
    
    return jsonResponse({ error: "Invalid action" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  const content = JSON.parse(e.postData.contents);
  const action = content.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === "init") {
      const headersMap = {
        [TABS.MASTER_METERS]: ["Meter ID", "Meter No", "Account No", "Building", "Location", "Phase Type", "Status"],
        [TABS.RAW_DATA]: ["Date", "Time", "Meter ID", "Meter Reading (kWh)", "Phase Status", "Shift", "Remark"],
        [TABS.CALCULATIONS]: ["Date", "Time", "Meter ID", "Current Reading", "Previous Reading", "Units Used (kWh)", "Hour", "Tariff Type", "Unit Rate", "Cost"],
        [TABS.DAILY_SUMMARY]: ["Date", "Meter ID", "Total Units", "Total Cost"],
        [TABS.SETTINGS]: ["Key", "Value", "Description"]
      };

      for (let title in headersMap) {
        if (!ss.getSheetByName(title)) {
          let s = ss.insertSheet(title);
          s.getRange(1, 1, 1, headersMap[title].length).setValues([headersMap[title]]).setFontWeight("bold");
        }
      }
      
      const setSheet = ss.getSheetByName(TABS.SETTINGS);
      if (setSheet.getLastRow() < 2) {
        setSheet.getRange(2, 1, 4, 3).setValues([
          ["PEAK_START", "18:30", "Peak start time"],
          ["PEAK_END", "22:30", "Peak end time"],
          ["RATE_PEAK", "50", "PKR per kWh"],
          ["RATE_OFF_PEAK", "35", "PKR per kWh"]
        ]);
      }
      return jsonResponse({ success: true });
    }

    if (action === "addEntry") {
      const { date, time, meterId, reading, phaseStatus, shift, remark } = content.data;
      const rawSheet = ss.getSheetByName(TABS.RAW_DATA);
      const calcSheet = ss.getSheetByName(TABS.CALCULATIONS);
      const setSheet = ss.getSheetByName(TABS.SETTINGS);
      
      // Get settings
      const sData = setSheet.getDataRange().getValues();
      const settings = {};
      sData.slice(1).forEach(r => settings[String(r[0])] = r[1]);
      
      // Calculate units
      const rows = calcSheet.getDataRange().getValues();
      let lastReading = null;
      for (let i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][2]) === String(meterId)) {
          lastReading = parseFloat(rows[i][3]);
          break;
        }
      }
      
      const units = lastReading !== null ? reading - lastReading : 0;
      
      // Safe handle time split
      let timeStr = "";
      if (time instanceof Date) {
        timeStr = Utilities.formatDate(time, "GMT+5", "HH:mm");
      } else {
        timeStr = String(time || "00:00");
      }
      
      const hour = timeStr.includes(":") ? timeStr.split(":")[0] : "00";
      
      // Tariff logic
      const getTimeVal = (s) => {
        if (!s) return 0;
        let ts = String(s);
        if (s instanceof Date) ts = Utilities.formatDate(s, "GMT+5", "HH:mm");
        if (!ts.includes(":")) return 0;
        const [h,m] = ts.split(":").map(Number);
        return h * 60 + m;
      };

      const nowVal = getTimeVal(time);
      const startVal = getTimeVal(settings.PEAK_START || "18:30");
      const endVal = getTimeVal(settings.PEAK_END || "22:30");
      const isPeak = nowVal >= startVal && nowVal <= endVal;
      const rate = isPeak ? (settings.RATE_PEAK || 50) : (settings.RATE_OFF_PEAK || 35);
      const cost = (units > 0 ? units : 0) * rate;

      // Append
      rawSheet.appendRow([date, time, meterId, reading, phaseStatus, shift, remark]);
      calcSheet.appendRow([date, time, meterId, reading, lastReading || "", units, hour, isPeak ? "Peak" : "Off-Peak", rate, cost]);
      
      return jsonResponse({ success: true });
    }

    if (action === "updateSettings") {
      let sheet = ss.getSheetByName(TABS.SETTINGS);
      if (!sheet) {
        // Self-heal: create sheet if missing
        sheet = ss.insertSheet(TABS.SETTINGS);
        sheet.getRange(1,1,1,3).setValues([["Key", "Value", "Description"]]).setFontWeight("bold");
      }
      
      const range = sheet.getDataRange();
      const rows = range.getValues();
      const keys = rows.map(r => String(r[0]));
      
      const payload = content.data || {};
      Object.entries(payload).forEach(([k, v]) => {
        const idx = keys.indexOf(k);
        if (idx !== -1) {
          sheet.getRange(idx + 1, 2).setValue(v);
        } else {
          // If key doesn't exist, append it
          sheet.appendRow([k, v, "User-defined setting"]);
        }
      });
      return jsonResponse({ success: true });
    }
    
    return jsonResponse({ error: "Action not supported" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
