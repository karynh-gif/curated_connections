// cc-auth.js — shared client-side auth & tier module
// Include this script on any page that needs tier gating
// Usage: <script src="/cc-auth.js"></script>

window.CC = window.CC || {};

CC.TIERS = {
  free:         0,
  connect:      1,
  insight:      2,
  legacy: 3
};

CC.TIER_FEATURES = {
  free:         ['gather', 'gather_quizzes', 'wit_wonder', 'tonight_cards'],
  connect:      ['gather', 'gather_quizzes', 'wit_wonder', 'tonight_cards', 'all_cards', 'all_editions', 'discover_you', 'circles', 'that_tracks', 'play_together', 'journal'],
  insight:      ['gather', 'gather_quizzes', 'wit_wonder', 'tonight_cards', 'all_cards', 'all_editions', 'discover_you', 'circles', 'that_tracks', 'play_together', 'journal', 'pattern_reveal', 'dream_out_loud', 'play_live', 'session_recaps'],
  legacy: ['gather', 'gather_quizzes', 'wit_wonder', 'tonight_cards', 'all_cards', 'all_editions', 'discover_you', 'circles', 'that_tracks', 'play_together', 'journal', 'pattern_reveal', 'dream_out_loud', 'play_live', 'session_recaps', 'living_legacy', 'voice_recording', 'family_tree', 'life_in_bloom']
};

CC.getUser = function() {
  try {
    const u = localStorage.getItem('cc_user');
    return u ? JSON.parse(u) : null;
  } catch(e) { return null; }
};

CC.getTier = function() {
  const u = CC.getUser();
  return u ? (u.tier || 'free') : 'free';
};

CC.hasFeature = function(feature) {
  const tier = CC.getTier();
  return (CC.TIER_FEATURES[tier] || CC.TIER_FEATURES.free).includes(feature);
};

CC.tierLevel = function() {
  return CC.TIERS[CC.getTier()] || 0;
};

CC.requireTier = function(minTier, onFail) {
  if (CC.TIERS[CC.getTier()] < CC.TIERS[minTier]) {
    if (onFail) onFail(minTier);
    return false;
  }
  return true;
};

CC.signOut = async function() {
  localStorage.removeItem('cc_user');
  window.location.href = 'index.html';
};

// Refresh tier from Airtable (call after payment)
CC.refreshTier = async function() {
  const user = CC.getUser();
  if (!user) return;
  try {
    const res = await fetch('/api/airtable', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'list',
        table: 'Users',
        filterFormula: `{email}="${user.email}"`,
        maxRecords: 1
      })
    });
    const data = await res.json();
    const rec = data.records?.[0];
    if (rec) {
      user.tier = rec.fields.subscription_tier || 'free';
      localStorage.setItem('cc_user', JSON.stringify(user));
    }
  } catch(e) {}
  return CC.getTier();
};
