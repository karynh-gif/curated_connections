// netlify/functions/deck-earn.js
// Called when a user subscribes or their subscription renews.
// Determines how many cards to drip based on tier + month number,
// selects eligible cards from the library, and writes to User Decks.
//
// Trigger: POST /api/deck-earn
// Body: { userId, tier, monthNumber, email }

const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;

const TIER_DRIP = {
  free:    5,
  connect: 15,
  insight: 25,
  legacy:  40,
};

// Special deck unlock criteria: [tier, monthsRequired, deckId]
const SPECIAL_DECK_UNLOCKS = [
  { deckId: 'sd_holidaytable', tier: 'free',    months: 3 },
  { deckId: 'sd_roadtrip',     tier: 'free',    months: 6 },
  { deckId: 'sd_latenight',    tier: 'free',    months: 12 },
  { deckId: 'sd_couples',      tier: 'connect', months: 3 },
  { deckId: 'sd_legacy_all',   tier: 'legacy',  months: 0 },
];

const TIER_RANK = { free: 0, connect: 1, insight: 2, legacy: 3 };

function airtableHeaders() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Seeded pseudo-random number generator (Mulberry32)
function seededRandom(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const rng = seededRandom(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

async function fetchEligibleCards(tier) {
  // Fetch deck-eligible cards from Conversation Cards
  const tables = [
    { name: 'Conversation Cards', source: 'conversation_cards' },
    { name: 'Play Together Cards', source: 'play_together' },
  ];

  let allCards = [];

  for (const table of tables) {
    const url = new URL(`${AIRTABLE_BASE_URL}/${encodeURIComponent(table.name)}`);
    url.searchParams.set('filterByFormula', `AND({Deck Eligible}=1,{Active}=1)`);
    url.searchParams.set('maxRecords', '500');

    const res = await fetch(url.toString(), { headers: airtableHeaders() });
    if (!res.ok) continue;
    const data = await res.json();

    const cards = (data.records || []).map(r => ({
      cardId: r.id,
      sourceTable: table.source,
      prompt: r.fields.Prompt || '',
      tier: r.fields['Tier Access'] || 'free',
    }));

    // Filter by tier access
    const tierRank = TIER_RANK[tier] || 0;
    const accessible = cards.filter(c => (TIER_RANK[c.tier] || 0) <= tierRank);
    allCards = allCards.concat(accessible);
  }

  return allCards;
}

async function getUserExistingCards(userId) {
  const url = new URL(`${AIRTABLE_BASE_URL}/User%20Decks`);
  url.searchParams.set('filterByFormula', `{User ID}="${userId}"`);
  url.searchParams.set('fields[]', 'Card ID');
  url.searchParams.set('maxRecords', '1000');

  const res = await fetch(url.toString(), { headers: airtableHeaders() });
  if (!res.ok) return new Set();
  const data = await res.json();
  return new Set((data.records || []).map(r => r.fields['Card ID']));
}

async function writeUserDeckRecords(userId, cards, tier, monthNumber, source, deckName) {
  const today = new Date().toISOString().split('T')[0];
  const records = cards.map(card => ({
    fields: {
      'User Deck ID':     `ud_${userId}_${card.cardId}_${Date.now()}`,
      'User ID':          userId,
      'Card ID':          card.cardId,
      'Source Table':     card.sourceTable,
      'Source':           source,
      'Special Deck Name': deckName || '',
      'Tier At Earn':     tier,
      'Month Number':     monthNumber,
      'Earned At':        today,
    }
  }));

  // Write in batches of 10 (Airtable rate limits)
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    await fetch(`${AIRTABLE_BASE_URL}/User%20Decks`, {
      method: 'POST',
      headers: airtableHeaders(),
      body: JSON.stringify({ records: batch }),
    });
    if (i + 10 < records.length) {
      await new Promise(r => setTimeout(r, 250)); // Rate limit buffer
    }
  }
}

async function unlockSpecialDecks(userId, tier, monthNumber) {
  const tierRank = TIER_RANK[tier] || 0;
  const unlocked = [];

  for (const deck of SPECIAL_DECK_UNLOCKS) {
    const deckTierRank = TIER_RANK[deck.tier] || 0;
    if (tierRank >= deckTierRank && monthNumber >= deck.months) {
      unlocked.push(deck);
    }
  }

  for (const deck of unlocked) {
    // Check if already unlocked for this user
    const checkUrl = new URL(`${AIRTABLE_BASE_URL}/User%20Decks`);
    checkUrl.searchParams.set('filterByFormula',
      `AND({User ID}="${userId}",{Special Deck Name}="${deck.deckId}",{Source}="special_deck")`);
    checkUrl.searchParams.set('maxRecords', '1');
    const checkRes = await fetch(checkUrl.toString(), { headers: airtableHeaders() });
    const checkData = await checkRes.json();
    if (checkData.records && checkData.records.length > 0) continue; // Already have it

    // Fetch cards for this special deck — in prod, these would be tagged to the deck
    // For now we grab a seeded slice of eligible cards and tag them to the deck
    const allCards = await fetchEligibleCards(tier);
    const seed = hashStr(userId + deck.deckId);
    const shuffled = seededShuffle(allCards, seed);
    const deckCards = shuffled.slice(0, 40); // ~40 cards per special deck

    await writeUserDeckRecords(userId, deckCards, tier, monthNumber, 'special_deck', deck.deckId);
    unlocked.push({ deckId: deck.deckId, cardCount: deckCards.length });
  }

  return unlocked;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { userId, tier, monthNumber, email } = JSON.parse(event.body || '{}');
    if (!userId || !tier) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and tier required' }) };
    }

    const normalizedTier = tier.toLowerCase();
    const drip = TIER_DRIP[normalizedTier] || 5;
    const month = parseInt(monthNumber) || 1;

    // Fetch all eligible cards
    const allCards = await fetchEligibleCards(normalizedTier);
    if (!allCards.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ added: 0, message: 'No eligible cards found' }) };
    }

    // Get cards user already has
    const existing = await getUserExistingCards(userId);
    const newCards = allCards.filter(c => !existing.has(c.cardId));

    if (!newCards.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ added: 0, message: 'All eligible cards already earned' }) };
    }

    // Select this month's drip using seeded shuffle (deterministic per user+month)
    const seed = hashStr(userId + month.toString());
    const shuffled = seededShuffle(newCards, seed);
    const thisMonthCards = shuffled.slice(0, drip);

    // Write to User Decks
    await writeUserDeckRecords(userId, thisMonthCards, normalizedTier, month, 'subscription_month', '');

    // Check and unlock special decks
    const specialUnlocked = await unlockSpecialDecks(userId, normalizedTier, month);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        added: thisMonthCards.length,
        month,
        tier: normalizedTier,
        specialDecksUnlocked: specialUnlocked.length,
        totalEarned: existing.size + thisMonthCards.length,
      }),
    };

  } catch (err) {
    console.error('deck-earn error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
