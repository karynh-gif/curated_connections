// cc-seasonal.js — Seasonal deck auto-surfacing
// Checks the current date and surfaces relevant seasonal content
// Include on gather.html and circles.html

window.CC = window.CC || {};

CC.SEASONAL_WINDOWS = [
  { deck: "Mother's Day",    start: [4, 1],  end: [5, 15] },
  { deck: "Father's Day",    start: [5, 16], end: [6, 21] },
  { deck: "4th of July",     start: [6, 25], end: [7, 6]  },
  { deck: "Grandparents Day",start: [8, 25], end: [9, 14] },
  { deck: "Thanksgiving",    start: [11, 1], end: [11, 30] },
  { deck: "Christmas",       start: [11, 25], end: [12, 26] },
  { deck: "New Year",        start: [12, 27], end: [1, 7]  },
  { deck: "Valentine's Day", start: [2, 1],  end: [2, 15] },
  { deck: "Easter",          start: [3, 15], end: [4, 15] },
  { deck: "Graduation",      start: [5, 1],  end: [6, 15] },
  { deck: "Back to School",  start: [8, 1],  end: [9, 10] },
  { deck: "Memorial Day",    start: [5, 20], end: [5, 31] },
];

CC.getCurrentSeason = function() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  for (const s of CC.SEASONAL_WINDOWS) {
    const [sm, sd] = s.start;
    const [em, ed] = s.end;
    // Simple check — handle year wrap for New Year
    if (sm <= em) {
      if ((m > sm || (m === sm && d >= sd)) && (m < em || (m === em && d <= ed))) return s.deck;
    } else {
      if (m > sm || (m === sm && d >= sd) || m < em || (m === em && d <= ed)) return s.deck;
    }
  }
  return null;
};

CC.loadSeasonalCards = async function() {
  const season = CC.getCurrentSeason();
  if (!season) return null;

  const res = await fetch('/api/airtable', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      action: 'list',
      table: 'Seasonal Cards',
      filterFormula: `AND({Season}="${season}", {Active}=TRUE)`,
      maxRecords: 20
    })
  });
  const data = await res.json();
  return { season, cards: data.records || [] };
};

CC.injectSeasonalShelf = async function(targetEl) {
  const result = await CC.loadSeasonalCards();
  if (!result || !result.cards.length) return;

  const { season, cards } = result;
  const shelf = document.createElement('div');
  shelf.style.cssText = 'margin-bottom:1.5rem;';
  shelf.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 1.1rem;margin-bottom:.75rem;">
      <div style="font-family:'Nunito',sans-serif;font-size:.55rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:rgba(201,125,58,.5);">${season}</div>
      <div style="font-size:.62rem;color:rgba(242,232,216,.3);font-style:italic;">Seasonal</div>
    </div>
    <div style="display:flex;gap:.75rem;padding:0 1.1rem;overflow-x:auto;scrollbar-width:none;padding-bottom:.2rem;">
      ${cards.slice(0,4).map(c => `
        <div onclick="CC.openCardSheet && CC.openCardSheet('${(c.fields.Prompt||'').replace(/'/g,"\\'")}') " style="min-width:240px;max-width:280px;background:linear-gradient(135deg,rgba(201,125,58,.1),rgba(201,125,58,.05));border:1px solid rgba(201,125,58,.2);border-radius:18px;padding:1rem;cursor:pointer;flex-shrink:0;">
          <div style="font-size:.5rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:rgba(201,125,58,.5);margin-bottom:.5rem;">${c.fields.Category||'Seasonal'}</div>
          <div style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:.95rem;color:#f2e8d8;line-height:1.5;">"${c.fields.Prompt}"</div>
        </div>
      `).join('')}
    </div>
  `;

  if (targetEl) targetEl.prepend(shelf);
};
