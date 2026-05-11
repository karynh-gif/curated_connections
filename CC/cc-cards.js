// cc-cards.js — Card action system
// Share, Reflection, Tribute — three-dot menu on every card
// Usage: <script src="/cc-cards.js"></script>

window.CC = window.CC || {};

// Create and inject the card action sheet into the page
CC.initCardActions = function() {
  if (document.getElementById('ccCardSheet')) return;

  const sheet = document.createElement('div');
  sheet.id = 'ccCardSheet';
  sheet.style.cssText = 'position:fixed;bottom:0;left:50%;transform:translateX(-50%) translateY(100%);width:100%;max-width:430px;background:#111d14;border-radius:24px 24px 0 0;padding:1.2rem 1.4rem 2.5rem;z-index:9000;transition:transform .32s cubic-bezier(.25,.46,.45,.94);box-shadow:0 -8px 40px rgba(0,0,0,.5);';
  sheet.innerHTML = `
    <div style="width:32px;height:3px;background:rgba(255,255,255,.15);border-radius:999px;margin:0 auto .8rem;"></div>
    <div id="ccCardText" style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:.95rem;color:rgba(242,232,216,.5);line-height:1.6;margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid rgba(255,255,255,.08);"></div>
    <div style="display:flex;flex-direction:column;gap:.5rem;">
      <button onclick="CC.shareCard()" style="width:100%;padding:.85rem 1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;font-family:'DM Sans',sans-serif;font-size:.88rem;color:#f2e8d8;text-align:left;cursor:pointer;display:flex;align-items:center;gap:.8rem;">
        <span style="font-size:1.1rem;">💬</span>
        <div>
          <div style="font-weight:600;margin-bottom:.1rem;">Share a Card</div>
          <div style="font-size:.72rem;color:rgba(242,232,216,.4);">Send this question to anyone. See how they answer.</div>
        </div>
      </button>
      <button onclick="CC.sendReflection()" style="width:100%;padding:.85rem 1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;font-family:'DM Sans',sans-serif;font-size:.88rem;color:#f2e8d8;text-align:left;cursor:pointer;display:flex;align-items:center;gap:.8rem;">
        <span style="font-size:1.1rem;">🪞</span>
        <div>
          <div style="font-weight:600;margin-bottom:.1rem;">Request a Reflection</div>
          <div style="font-size:.72rem;color:rgba(242,232,216,.4);">Ask someone how they see you. Goes into your leaf.</div>
        </div>
      </button>
      <button onclick="CC.sendTribute()" style="width:100%;padding:.85rem 1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;font-family:'DM Sans',sans-serif;font-size:.88rem;color:#f2e8d8;text-align:left;cursor:pointer;display:flex;align-items:center;gap:.8rem;">
        <span style="font-size:1.1rem;">🌳</span>
        <div>
          <div style="font-weight:600;margin-bottom:.1rem;">Send a Tribute</div>
          <div style="font-size:.72rem;color:rgba(242,232,216,.4);">Ask someone about someone else. Goes into their leaf.</div>
        </div>
      </button>
    </div>
    <button onclick="CC.closeCardSheet()" style="width:100%;padding:.7rem;background:none;border:none;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:.88rem;color:rgba(242,232,216,.3);cursor:pointer;margin-top:.3rem;">Cancel</button>
  `;
  document.body.appendChild(sheet);

  // Send flow overlay
  const sendFlow = document.createElement('div');
  sendFlow.id = 'ccSendFlow';
  sendFlow.style.cssText = 'position:fixed;inset:0;background:rgba(6,12,9,.85);z-index:9001;display:none;align-items:flex-end;justify-content:center;';
  sendFlow.innerHTML = `
    <div style="width:100%;max-width:430px;background:#111d14;border-radius:24px 24px 0 0;padding:1.4rem 1.4rem 3rem;">
      <div id="ccSendTitle" style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:300;font-style:italic;color:#f2e8d8;margin-bottom:.3rem;"></div>
      <div id="ccSendDesc" style="font-size:.78rem;color:rgba(242,232,216,.4);font-style:italic;margin-bottom:1.2rem;line-height:1.6;"></div>
      <input id="ccSendName" placeholder="Their name" style="width:100%;padding:.75rem 1rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:.88rem;color:#f2e8d8;margin-bottom:.6rem;outline:none;"/>
      <input id="ccSendContact" placeholder="Email or phone number" style="width:100%;padding:.75rem 1rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:.88rem;color:#f2e8d8;margin-bottom:.6rem;outline:none;"/>
      <div id="ccSendLeafRow" style="display:none;margin-bottom:.6rem;">
        <input id="ccSendLeafName" placeholder="Whose leaf is this for? (their name)" style="width:100%;padding:.75rem 1rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:.88rem;color:#f2e8d8;outline:none;"/>
      </div>
      <button onclick="CC.submitSend()" style="width:100%;padding:.9rem;background:linear-gradient(135deg,#c97d3a,#e89448);border:none;border-radius:999px;font-family:'DM Sans',sans-serif;font-size:.92rem;font-weight:700;color:#fff;cursor:pointer;margin-top:.4rem;">Send →</button>
      <button onclick="CC.closeSendFlow()" style="width:100%;padding:.6rem;background:none;border:none;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:.85rem;color:rgba(242,232,216,.3);cursor:pointer;margin-top:.2rem;">Cancel</button>
    </div>
  `;
  document.body.appendChild(sendFlow);
};

CC._currentCard = null;
CC._sendMode = null;

CC.openCardSheet = function(cardText) {
  CC._currentCard = cardText;
  document.getElementById('ccCardText').textContent = '"' + cardText + '"';
  document.getElementById('ccCardSheet').style.transform = 'translateX(-50%) translateY(0)';
};

CC.closeCardSheet = function() {
  document.getElementById('ccCardSheet').style.transform = 'translateX(-50%) translateY(100%)';
};

CC.shareCard = function() {
  CC._sendMode = 'share';
  CC.closeCardSheet();
  document.getElementById('ccSendTitle').textContent = 'Share a Card';
  document.getElementById('ccSendDesc').textContent = 'They\u2019ll get a link with this question. No account needed to answer.';
  document.getElementById('ccSendLeafRow').style.display = 'none';
  CC.openSendFlow();
};

CC.sendReflection = function() {
  CC._sendMode = 'reflection';
  CC.closeCardSheet();
  document.getElementById('ccSendTitle').textContent = 'Request a Reflection';
  document.getElementById('ccSendDesc').textContent = 'Ask them how they see you. Their answer goes into your leaf.';
  document.getElementById('ccSendLeafRow').style.display = 'none';
  CC.openSendFlow();
};

CC.sendTribute = function() {
  CC._sendMode = 'tribute';
  CC.closeCardSheet();
  document.getElementById('ccSendTitle').textContent = 'Send a Tribute';
  document.getElementById('ccSendDesc').textContent = 'Ask them about someone else. Their answer goes into that person\u2019s leaf.';
  document.getElementById('ccSendLeafRow').style.display = 'block';
  CC.openSendFlow();
};

CC.openSendFlow = function() {
  const el = document.getElementById('ccSendFlow');
  el.style.display = 'flex';
};

CC.closeSendFlow = function() {
  document.getElementById('ccSendFlow').style.display = 'none';
};

CC.submitSend = function() {
  const name    = document.getElementById('ccSendName').value.trim();
  const contact = document.getElementById('ccSendContact').value.trim();
  const leafFor = document.getElementById('ccSendLeafName')?.value.trim() || '';

  if (!name || !contact) {
    alert('Please enter a name and contact');
    return;
  }

  // Build the recipient link
  const base = window.location.origin;
  const params = new URLSearchParams({
    mode: CC._sendMode,
    card: CC._currentCard,
    from: (CC.getUser()?.name || 'Someone'),
    for: leafFor || CC.getUser()?.name || ''
  });
  const link = base + '/respond.html?' + params.toString();

  // Copy link to clipboard and show sharing options
  navigator.clipboard.writeText(link).then(() => {
    CC.closeSendFlow();
    // Show success with share options
    const msg = CC._sendMode === 'share'
      ? name + ' will receive this question. Link copied.'
      : 'Link copied — send it to ' + name + ' however works best.';
    if (window.t) t(msg);
  }).catch(() => {
    // Fallback — show the link
    prompt('Copy this link and send to ' + name, link);
    CC.closeSendFlow();
  });
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', CC.initCardActions);
