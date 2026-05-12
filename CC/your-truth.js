// netlify/functions/your-truth.js
// Proxies Your Truth™ requests to Anthropic.
// ANTHROPIC_API_KEY lives in Netlify env — never in browser.

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // CORS — tighten origin to your domain in production
  const headers = {
    "Access-Control-Allow-Origin":  process.env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type":                 "application/json",
  };

  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { answer, question, context, quizTitle, resultTitle, resultBody } = body;

  // Support quiz result mode (quizTitle/resultTitle/resultBody)
  // and card reflection mode (answer/question/context)
  const isQuizMode = !!(quizTitle || resultTitle);

  if (!isQuizMode && (!answer || typeof answer !== "string" || answer.trim().length < 3)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Answer is required" }) };
  }
  if (!isQuizMode && (!question || typeof question !== "string")) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Question is required" }) };
  }

  // Sanitise inputs — strip any prompt injection attempts
  const safeAnswer   = (answer || '').slice(0, 2000).replace(/<[^>]*>/g, "");
  const safeQuestion = question.slice(0, 500).replace(/<[^>]*>/g, "");

  const systemPrompt = `You are the Your Truth™ engine inside Curated Connections™, a self-discovery and connection game.
Your only job: distill what the person just shared into 1–2 sentences that feel unmistakably, specifically true about them.
Rules:
- Write in second person ("You…" or "What's true for you is…")
- Be specific to what they actually said — no generic affirmations, no therapy platitudes
- Use plain, warm language — no jargon
- Never moralise, advise, compliment, or add context beyond what they shared
- Maximum 2 sentences. No bullet points. No preamble or explanation. No quotation marks.
- If the answer is unclear or too short, return: "You're still finding the words for this one."`;

  const userPrompt = `Card asked: "${safeQuestion}"${context ? `\nContext: ${context}` : ""}
Person said: "${safeAnswer}"
Return their truth in 1–2 sentences.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 150,
        system:     systemPrompt,
        messages:   [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Anthropic error:", data);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "AI service error", detail: data.error?.message }),
      };
    }

    const truth = data.content?.[0]?.text?.trim() || "";
    return { statusCode: 200, headers, body: JSON.stringify({ truth }) };

  } catch (err) {
    console.error("your-truth function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal error", detail: err.message }),
    };
  }
};
