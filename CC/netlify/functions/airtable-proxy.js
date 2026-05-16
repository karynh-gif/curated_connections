// netlify/functions/airtable-proxy.js
// All Airtable reads/writes go through here.
// AIRTABLE_API_KEY and AIRTABLE_BASE_ID live in Netlify env only.

const AIRTABLE_BASE = "https://api.airtable.com/v0";

// Allowed table names — prevents callers from accessing arbitrary bases/tables
const ALLOWED_TABLES = new Set([
  // ── CORE ──
  "Users",
  "Responses",
  "Subscriptions",
  "Connections",
  "Invites",
  // ── CARDS ──
  "Conversation Cards",
  "Wit and Wonder",
  "Gather Quizzes",
  "Daily Observations",
  "Pattern Reveal Cards",
  "Social Translation Cards",
  "Two Truths Cards",
  // ── GAMES ──
  "Really Bad Day Cards",
  "That Tracks Cards",
  "You Really Think That Cards",
  "First Word Cards",
  "Say What Cards",
  "Spin It Cards",
  // ── SOCIAL ──
  "Circles",
  "CircleMembers",
  "FeedPosts",
  "PostReactions",
  "PrivateReplies",
  "Reflections",
  // ── LEGACY ──
  "Living Legacy Leaves",
  "Legacy Contributions",
  "CuratedMoments",
  "UserMomentStatus",
  // ── SESSIONS ──
  "GameSessions",
  "Cards",
  // ── CONTENT ──
  "Teams Accounts",
  "Teams Content Library",
  "Content Suggestions",
]);

// Allowed actions
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
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { action, table, recordId, fields, filterFormula, sort, maxRecords, offset } = body;

  // Validate
  if (!ALLOWED_ACTIONS.has(action)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
  }
  if (!ALLOWED_TABLES.has(table)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown table: ${table}` }) };
  }

  try {
    let result;

    // ── LIST ─────────────────────────────────────────────────
    if (action === "list") {
      const url = new URL(tableURL(table));
      if (filterFormula)  url.searchParams.set("filterByFormula", filterFormula);
      if (maxRecords)     url.searchParams.set("maxRecords", String(maxRecords));
      if (offset)         url.searchParams.set("offset", offset);
      if (sort)           url.searchParams.set("sort[0][field]", sort.field), url.searchParams.set("sort[0][direction]", sort.direction || "asc");

      const res = await fetch(url.toString(), { headers: airtableHeaders() });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    }

    // ── GET ──────────────────────────────────────────────────
    else if (action === "get") {
      if (!recordId) throw new Error("recordId required for get");
      const res = await fetch(tableURL(table, recordId), { headers: airtableHeaders() });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    }

    // ── CREATE ───────────────────────────────────────────────
    else if (action === "create") {
      if (!fields) throw new Error("fields required for create");
      const res = await fetch(tableURL(table), {
        method:  "POST",
        headers: airtableHeaders(),
        body:    JSON.stringify({ fields }),
      });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    }

    // ── UPDATE ───────────────────────────────────────────────
    else if (action === "update") {
      if (!recordId || !fields) throw new Error("recordId and fields required for update");
      const res = await fetch(tableURL(table, recordId), {
        method:  "PATCH",
        headers: airtableHeaders(),
        body:    JSON.stringify({ fields }),
      });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    }

    // ── DELETE ───────────────────────────────────────────────
    else if (action === "delete") {
      if (!recordId) throw new Error("recordId required for delete");
      const res = await fetch(tableURL(table, recordId), {
        method:  "DELETE",
        headers: airtableHeaders(),
      });
      result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || `Airtable ${res.status}`);
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error("airtable-proxy error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
