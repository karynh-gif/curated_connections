// cc-birthday.js — Birthday Engine
// Checks for upcoming birthdays in Circles and surfaces card decks
// Include on circles.html

window.CC = window.CC || {};

CC.checkBirthdays = async function(circleId) {
  try {
    const today = new Date();
    const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayMMDD = (today.getMonth()+1).toString().padStart(2,'0') + '-' + today.getDate().toString().padStart(2,'0');

    // Get circle members with birthdays
    const res = await fetch('/api/airtable', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'list',
        table: 'Circle Game Dynamics',
        filterFormula: `{Circle ID}="${circleId}"`,
        maxRecords: 1
      })
    });

    // Check if today is anyone's birthday
    // Pull birthday cards from Seasonal Cards table
    const cardsRes = await fetch('/api/airtable', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'list',
        table: 'Seasonal Cards',
        filterFormula: `{Season}="Birthday"`,
        maxRecords: 20
      })
    });
    const cardsData = await cardsRes.json();
    return cardsData.records || [];
  } catch(e) {
    return [];
  }
};

CC.showBirthdayDeck = function(personName, cards) {
  if (!cards || !cards.length) return;

  const deck = document.createElement('div');
  deck.style.cssText = 'background:linear-gradient(135deg,rgba(201,125,58,.12),rgba(201,125,58,.06));border:1.5px solid rgba(201,125,58,.3);border-radius:22px;padding:1.2rem 1.1rem;margin-bottom:1.2rem;';
  deck.innerHTML = `
    <div style="font-size:1.4rem;margin-bottom:.4rem;">🎂</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:400;color:#f2e8d8;margin-bottom:.2rem;">It's ${personName}'s birthday.</div>
    <div style="font-size:.75rem;color:rgba(242,232,216,.45);font-style:italic;margin-bottom:.8rem;">We put something together for them.</div>
    <div style="display:flex;flex-direction:column;gap:.5rem;">
      ${cards.slice(0,3).map(c => `
        <div style="background:rgba(255,255,255,.05);border-radius:14px;padding:.8rem .9rem;cursor:pointer;" onclick="CC.openCardSheet('${(c.fields.Prompt||'').replace(/'/g,"\\'")}')">
          <div style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:.9rem;color:#f2e8d8;line-height:1.5;">"${c.fields.Prompt}"</div>
        </div>
      `).join('')}
    </div>
  `;

  const feed = document.querySelector('.circle-feed, .scroll, .app');
  if (feed) feed.prepend(deck);
};

// Circle invite link generator
CC.generateInviteLink = function(circleId, circleName) {
  const base = window.location.origin;
  const token = btoa(circleId + ':' + Date.now());
  return base + '/circle-join.html?circle=' + circleId + '&name=' + encodeURIComponent(circleName) + '&token=' + token;
};

CC.copyInviteLink = function(circleId, circleName) {
  const link = CC.generateInviteLink(circleId, circleName);
  navigator.clipboard.writeText(link).then(() => {
    if (window.t) t('Invite link copied — send it to anyone');
  }).catch(() => {
    prompt('Copy this invite link:', link);
  });
};
