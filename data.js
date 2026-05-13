// ============================================================
// GOOGLE SHEET DATA SOURCE
// Sheet ID: 1st7T2kHXPI0PpZvNpekadupNdkLrgliDgNO4LDn3HTc
// ============================================================

const SHEET_ID = "1st7T2kHXPI0PpZvNpekadupNdkLrgliDgNO4LDn3HTc";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// Fallback sample data (used only if Google Sheet fails)
const SAMPLE_INVENTORY = [];

/**
 * Fetches and parses data from Google Sheet.
 * Deduplicates rows by ITEM_ID (keeps last occurrence with highest MRP).
 */
async function fetchSheetData() {
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Sheet fetch failed: " + response.status);
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) throw new Error("No data rows found");

    // Header row
    const headers = rows[0].map(h => h.trim().toUpperCase());

    // Map column indices
    const colMap = {
      item_id: headers.indexOf("ITEM_ID"),
      product_name: headers.indexOf("PRODUCT_NAME"),
      brand: headers.indexOf("BRAND"),
      upc: headers.indexOf("UPC"),
      mrp: headers.indexOf("MRP")
    };

    // Parse rows into objects, dedup by ITEM_ID (keep last with valid data)
    const itemMap = new Map();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;

      const itemId = (row[colMap.item_id] || "").trim();
      if (!itemId) continue;

      const productName = (row[colMap.product_name] || "").trim();
      if (!productName) continue;

      const mrpVal = parseFloat((row[colMap.mrp] || "0").trim()) || 0;
      const cat = guessCategory((row[colMap.brand] || "").trim(), productName);

      const item = {
        item_id: itemId,
        product_name: productName,
        brand: (row[colMap.brand] || "").trim(),
        upc: (row[colMap.upc] || "").trim(),
        mrp: mrpVal,
        category: cat,
        image: getCategoryFallbackIcon(cat)
      };

      // Keep the entry — if duplicate ITEM_ID, overwrite (last wins)
      if (!itemMap.has(itemId) || mrpVal > 0) {
        itemMap.set(itemId, item);
      }
    }

    return Array.from(itemMap.values());
  } catch (err) {
    console.error("Error fetching Google Sheet:", err);
    throw err;
  }
}

/**
 * Parse CSV text handling quoted fields with commas and newlines.
 */
function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = "";
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        current.push(field);
        field = "";
        if (current.some(c => c.trim())) rows.push(current);
        current = [];
        if (ch === '\r') i++;
      } else {
        field += ch;
      }
    }
  }
  // Last field/row
  current.push(field);
  if (current.some(c => c.trim())) rows.push(current);

  return rows;
}

/**
 * Guess a product category from brand/name.
 */
function guessCategory(brand, name) {
  const n = (brand + " " + name).toLowerCase();
  if (/ice cream|cone|tub|sundae/.test(n)) return "Ice Cream";
  if (/milk|paneer|curd|ghee|butter|cheese|dairy/.test(n)) return "Dairy";
  if (/shampoo|conditioner|hair|face wash|soap|cream|lotion|serum|sunscreen|lip|nail|cosmetic|beauty|perfume|deodorant/.test(n)) return "Personal Care";
  if (/diaper|baby|wipes|sipper|bib|feeding/.test(n)) return "Baby Care";
  if (/chips|biscuit|cookie|snack|makhana|namkeen|mixture|chocolate|candy|cream roll/.test(n)) return "Snacks";
  if (/juice|drink|water|coffee|tea|milkshake|energy|sharbat/.test(n)) return "Beverages";
  if (/noodle|pasta|ramen|momos|ready to eat/.test(n)) return "Instant Food";
  if (/detergent|dishwash|cleaner|brush|garbage|tissue/.test(n)) return "Home Care";
  if (/dal|rice|atta|flour|oil|salt|sugar|spice|powder|masala|pickle|seeds|honey|jam|oats|cerelac/.test(n)) return "Grocery";
  if (/condom|massager|lubricant/.test(n)) return "Wellness";
  if (/phone|cable|adapter|earphone|earbud|charger/.test(n)) return "Electronics";
  if (/toy|game|puzzle/.test(n)) return "Toys";
  if (/bedsheet|pillow|blanket|quilt|curtain/.test(n)) return "Home & Living";
  if (/shoe|slipper|flip|sock|boxer|vest|belt/.test(n)) return "Fashion";
  if (/notebook|paper|drawing|pen|pencil/.test(n)) return "Stationery";
  if (/chicken|egg|meat|fish/.test(n)) return "Non-Veg";
  if (/dog|pet|cat/.test(n)) return "Pet Care";
  if (/bag|umbrella/.test(n)) return "Accessories";
  return "General";
}


/**
 * Category fallback icons from Flaticon CDN.
 */
function getCategoryFallbackIcon(category) {
  const icons = {
    "Ice Cream":     "https://cdn-icons-png.flaticon.com/128/3514/3514516.png",
    "Dairy":         "https://cdn-icons-png.flaticon.com/128/3050/3050158.png",
    "Personal Care": "https://cdn-icons-png.flaticon.com/128/2553/2553691.png",
    "Baby Care":     "https://cdn-icons-png.flaticon.com/128/3081/3081627.png",
    "Snacks":        "https://cdn-icons-png.flaticon.com/128/2553/2553651.png",
    "Beverages":     "https://cdn-icons-png.flaticon.com/128/3050/3050095.png",
    "Instant Food":  "https://cdn-icons-png.flaticon.com/128/1046/1046786.png",
    "Home Care":     "https://cdn-icons-png.flaticon.com/128/2947/2947656.png",
    "Grocery":       "https://cdn-icons-png.flaticon.com/128/3724/3724788.png",
    "Wellness":      "https://cdn-icons-png.flaticon.com/128/2966/2966327.png",
    "Electronics":   "https://cdn-icons-png.flaticon.com/128/3659/3659899.png",
    "Toys":          "https://cdn-icons-png.flaticon.com/128/3081/3081559.png",
    "Home & Living": "https://cdn-icons-png.flaticon.com/128/2271/2271046.png",
    "Fashion":       "https://cdn-icons-png.flaticon.com/128/2331/2331716.png",
    "Stationery":    "https://cdn-icons-png.flaticon.com/128/2541/2541988.png",
    "Non-Veg":       "https://cdn-icons-png.flaticon.com/128/1046/1046751.png",
    "Pet Care":      "https://cdn-icons-png.flaticon.com/128/1076/1076877.png",
    "Accessories":   "https://cdn-icons-png.flaticon.com/128/2331/2331895.png",
    "General":       "https://cdn-icons-png.flaticon.com/128/3081/3081648.png"
  };
  return icons[category] || icons["General"];
}


// ============================================================
// API Configuration Templates (for future backend integration)
// ============================================================
const API_CONFIG = {
  googleSheet: {
    sheetId: SHEET_ID,
    csvUrl: SHEET_CSV_URL
  },
  supabase: {
    url: "https://YOUR_PROJECT.supabase.co",
    key: "YOUR_ANON_KEY",
    table: "inventory"
  },
  firebase: {
    apiKey: "YOUR_API_KEY",
    projectId: "YOUR_PROJECT_ID",
    collection: "inventory"
  },
  restApi: {
    baseUrl: "https://your-api.com/api/v1",
    endpoints: {
      getAll: "/inventory",
      getById: "/inventory/:id",
      create: "/inventory",
      update: "/inventory/:id",
      delete: "/inventory/:id"
    }
  }
};
