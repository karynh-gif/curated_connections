// netlify/functions/game-session.js
// Dedicated function for Really Bad Day multiplayer sessions
// Only touches the RBD Sessions table

const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/RBD%20Sessions`;

function headers() {
  return {
    "Authorization": `Bearer ${process.env.AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const origin = event.headers.origin || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({error: "Invalid JSON"}) };
  }

  const { action, recordId, fields, filterByFormula } = body;

  try {
    let url, method, fetchBody;

    if (action === "create") {
      url = BASE_URL;
      method = "POST";
      fetchBody = JSON.stringify({ fields });
    } else if (action === "update") {
      url = `${BASE_URL}/${recordId}`;
      method = "PATCH";
      fetchBody = JSON.stringify({ fields });
    } else if (action === "find") {
      const params = new URLSearchParams();
      if (filterByFormula) params.set("filterByFormula", filterByFormula);
      params.set("maxRecords", "1");
      url = `${BASE_URL}?${params.toString()}`;
      method = "GET";
    } else {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({error: "Unknown action"}) };
    }

    const res = await fetch(url, {
      method,
      headers: headers(),
      body: fetchBody,
    });

    const data = await res.json();

    if (!res.ok) {
      return { 
        statusCode: res.status, 
        headers: corsHeaders, 
        body: JSON.stringify({error: data.error || "Airtable error", details: data}) 
      };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };

  } catch(e) {
    return { 
      statusCode: 500, 
      headers: corsHeaders, 
      body: JSON.stringify({error: e.message}) 
    };
  }
};
