// netlify/functions/storage-tracker.js
// Tracks Firebase Storage usage per user and updates Airtable
// Called from the app when files are uploaded or deleted

const AIRTABLE_BASE = 'https://api.airtable.com/v0';

function atHeaders() {
  return {
    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function atFind(table, formula) {
  const url = new URL(`${AIRTABLE_BASE}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`);
  url.searchParams.set('filterByFormula', formula);
  const res = await fetch(url.toString(), { headers: atHeaders() });
  const d = await res.json();
  return d.records || [];
}

async function atUpdate(table, recordId, fields) {
  await fetch(`${AIRTABLE_BASE}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${recordId}`, {
    method: 'PATCH',
    headers: atHeaders(),
    body: JSON.stringify({ fields }),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { leafId, storageUsedGB, action } = JSON.parse(event.body);

    if (!leafId) {
      return { statusCode: 400, body: 'leafId required' };
    }

    // Find the leaf record
    const leaves = await atFind('Living Legacy Leaves', `{Leaf ID}="${leafId}"`);
    if (!leaves.length) {
      return { statusCode: 404, body: 'Leaf not found' };
    }

    const leaf = leaves[0];
    const currentGB = leaf.fields['Storage Used GB'] || 0;
    let newGB = currentGB;

    if (action === 'set') {
      newGB = storageUsedGB;
    } else if (action === 'add') {
      newGB = currentGB + storageUsedGB;
    } else if (action === 'subtract') {
      newGB = Math.max(0, currentGB - storageUsedGB);
    }

    // Update storage in Airtable
    await atUpdate('Living Legacy Leaves', leaf.id, {
      'Storage Used GB': parseFloat(newGB.toFixed(3))
    });

    // Check if over 85% of 2GB limit — trigger upgrade prompt
    const pct = (newGB / 2) * 100;
    const needsUpgrade = pct >= 85;

    return {
      statusCode: 200,
      body: JSON.stringify({
        leafId,
        storageUsedGB: newGB,
        percentUsed: Math.round(pct),
        needsUpgrade,
        limitGB: 2
      })
    };

  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
