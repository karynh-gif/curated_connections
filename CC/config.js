// ============================================================
// config.js — Curated Connections™
//
// SAFE TO SHIP TO BROWSER. No secret keys here.
//
// All API keys (Airtable, Anthropic, Stripe secret) live in
// Netlify environment variables → netlify/functions/*.js
// ============================================================

const CC_CONFIG = {

  // ── API ENDPOINTS (Netlify functions) ─────────────────────
  api: {
    yourTruth:  "/api/your-truth",
    airtable:   "/api/airtable",
    invite:     "/api/invite",
    deckEarn:   "/api/deck-earn",
  },

  // ── STRIPE PAYMENT LINKS (safe to expose) ─────────────────
  stripe: {
    connect:     { label:"Connect",      price:"$4.99/mo",  paymentLink:"https://buy.stripe.com/cNi9AN0nz2mR8fKeHZ7EQ00" },
    insight:     { label:"Insight",      price:"$9.99/mo",  paymentLink:"https://buy.stripe.com/5kQdR39Y9bXr7bG57p7EQ01" },
    deepConnect: { label:"Deep Connect", price:"$19.99/mo", paymentLink:"https://buy.stripe.com/28E00dc6h4uZ2VqarJ7EQ02" },
    customerPortal: "https://billing.stripe.com/p/login/PLACEHOLDER",
  },

  // ── APP SETTINGS ──────────────────────────────────────────
  app: {
    name:         "Curated Connections™",
    tagline:      "Play. Discover. Connect.",
    domain:       "https://joincuratedconnections.com",
    supportEmail: "hello@joincuratedconnections.com",
    version:      "1.2.0",
  },

  // ── TIER FEATURE GATES ────────────────────────────────────
  tiers: {
    free:        ["gather", "gather_quizzes", "wit_wonder", "tonight_cards", "living_legacy_start", "family_tree_start"],
    connect:     ["gather", "gather_quizzes", "wit_wonder", "tonight_cards", "all_cards", "all_editions", "discover_you", "circles", "that_tracks", "play_together", "journal", "living_legacy_start", "family_tree_start"],
    insight:     ["gather", "gather_quizzes", "wit_wonder", "tonight_cards", "all_cards", "all_editions", "discover_you", "circles", "that_tracks", "play_together", "journal", "pattern_reveal", "dream_out_loud", "play_live", "session_recaps", "living_legacy_start", "family_tree_start"],
    legacy:      ["gather", "gather_quizzes", "wit_wonder", "tonight_cards", "all_cards", "all_editions", "discover_you", "circles", "that_tracks", "play_together", "journal", "pattern_reveal", "dream_out_loud", "play_live", "session_recaps", "living_legacy_start", "living_legacy_open", "family_tree_start", "family_tree_open", "voice_recording", "life_in_bloom"],
  },
};
