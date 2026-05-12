// netlify/functions/airtable-proxy.js
const AIRTABLE_BASE = "https://api.airtable.com/v0";

const ALLOWED_TABLES = new Set([
  "Users",
  "Conversation Cards",
  "Wit and Wonder",
  "Curated Moments",
  "Discover You Quizzes",
  "Quiz Questions",
  "Quiz Results",
  "Gather Quizzes",
  "Legacy Cards",
  "Memory Games",
  "Memory Game Prompts",
  "Play Together Decks",
  "Play Together Cards",
  "Dream Out Loud",
  "Pattern Reveal Cards",
  "Seasonal Cards",
  "That Tracks Prompts",
  "That Tracks Hand Cards",
  "Journal Prompts",
  "Living Legacy Leaves",
  "Family Tree Nodes",
  "Promo Codes",
  "Referrals",
  "Leaf Tags",
  "Tiers",
  "Game Sessions",
  "Game Plays",
]);

const ALLOWED_ACTIONS = new Set(["list", "get", "create", "update", "delete"]);

function airtableHeaders() {
  return {
    "Authorization": `Bearer ${process.env.AIRTABLE_API_KEY}`,
    "Content-Type":  "application/json",
  };
}

function tableURL(tableName, recordId) {
  const base = `${AIRTABLE_BASE}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
  return recordId ? `${base}/${recordId}` : base;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  process.env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type":                 "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { action, table, recordId, fields, filterFormula, sort, maxRecords, offset } = body;

  if (!ALLOWED_ACTIONS.has(action)) return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
  if (!ALLOWED_TABLES.has(table))   return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown table: ${table}` }) };

  try {
    let result;
    if (action === "list") {
      const url = new URL(tableURL(table));
      if (filterFormula) url.searchParams.set("filterByFormula", filterFormula);
      if (maxRecords)    url.searchParams.set("maxRecords", String(maxRecords));
      if (offset)        url.searchParams.set("offset", offset);
      if (sort)          { url.searchParams.set("sort[0][field]", sort.field); url.searchParams.set("sort[0][direction]", sort.direction || "asc"); }
      const res = await fetch(url.toString(), { headers: airtableHeaders() });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    } else if (action === "get") {
      const res = await fetch(tableURL(table, recordId), { headers: airtableHeaders() });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    } else if (action === "create") {
      const res = await fetch(tableURL(table), { method: "POST", headers: airtableHeaders(), body: JSON.stringify({ fields }) });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    } else if (action === "update") {
      const res = await fetch(tableURL(table, recordId), { method: "PATCH", headers: airtableHeaders(), body: JSON.stringify({ fields }) });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    } else if (action === "delete") {
      const res = await fetch(tableURL(table, recordId), { method: "DELETE", headers: airtableHeaders() });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    }
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
