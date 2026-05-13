// ── RATE YOUR EXPERIENCE ──────────────────────────────────────
// Inject at bottom of any page's scroll area

function injectRateExperience(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Don't show if rated in last 3 days
  try {
    var last = parseInt(localStorage.getItem('cc_last_rated') || '0');
    if (Date.now() - last < 1000 * 60 * 60 * 24 * 3) return;
  } catch(e) {}

  var page = window.location.pathname.split('/').pop().replace('.html','') || 'gather';

  var div = document.createElement('div');
  div.id = 'rateExpSection';
  div.style.cssText = 'margin:1.5rem .9rem 2rem;padding:1.2rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;text-align:center;';
  div.innerHTML = '<div style="font-family:\'Nunito\',sans-serif;font-size:.62rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(242,232,216,.25);margin-bottom:.7rem;">Rate your experience</div>'
    + '<div style="display:flex;justify-content:center;gap:.5rem;margin-bottom:.8rem;" id="rateStars">'
    + [1,2,3,4,5].map(function(n){
        return '<div onclick="selectRating(' + n + ')" id="rateStar_' + n + '" style="font-size:1.6rem;cursor:pointer;opacity:.3;transition:all .15s;" onmouseover="hoverRating(' + n + ')" onmouseout="unhoverRating()">★</div>';
      }).join('')
    + '</div>'
    + '<div id="rateFeedback" style="display:none;margin-top:.4rem;">'
    + '<textarea id="rateComment" placeholder="Tell us more (optional)..." style="width:100%;min-height:60px;padding:.6rem .8rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;font-family:\'DM Sans\',sans-serif;font-size:.82rem;color:rgba(242,232,216,.7);outline:none;resize:none;line-height:1.5;" onfocus="this.style.borderColor=\'rgba(201,125,58,.35)\'" onblur="this.style.borderColor=\'rgba(255,255,255,.08)\'"></textarea>'
    + '<div style="display:flex;gap:.5rem;margin-top:.5rem;">'
    + '<button onclick="submitRating()" style="flex:1;padding:.55rem;background:linear-gradient(135deg,rgba(201,125,58,.8),rgba(232,160,69,.8));border:none;border-radius:8px;font-family:\'Nunito\',sans-serif;font-size:.72rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff;cursor:pointer;">Send ✦</button>'
    + '<button onclick="dismissRating()" style="padding:.55rem .8rem;background:none;border:1px solid rgba(255,255,255,.07);border-radius:8px;font-family:\'Nunito\',sans-serif;font-size:.72rem;font-weight:700;color:rgba(242,232,216,.25);cursor:pointer;">Skip</button>'
    + '</div></div>';

  container.appendChild(div);
  window._ratingPage = page;
  window._selectedRating = 0;
}

function hoverRating(n) {
  for (var i = 1; i <= 5; i++) {
    var s = document.getElementById('rateStar_' + i);
    if (s) s.style.opacity = i <= n ? '1' : '.2';
  }
}

function unhoverRating() {
  for (var i = 1; i <= 5; i++) {
    var s = document.getElementById('rateStar_' + i);
    if (s) s.style.opacity = i <= (window._selectedRating || 0) ? '1' : '.3';
  }
}

function selectRating(n) {
  window._selectedRating = n;
  for (var i = 1; i <= 5; i++) {
    var s = document.getElementById('rateStar_' + i);
    if (s) {
      s.style.opacity = i <= n ? '1' : '.2';
      s.style.color = i <= n ? '#c97d3a' : 'rgba(242,232,216,.4)';
    }
  }
  // Show feedback area
  document.getElementById('rateFeedback').style.display = 'block';
  // Auto-submit 5 stars without comment
  if (n === 5) {
    setTimeout(function() {
      if (window._selectedRating === 5) submitRating();
    }, 800);
  }
}

function submitRating() {
  var rating  = window._selectedRating || 0;
  if (!rating) return;
  var comment = (document.getElementById('rateComment') || {}).value || '';
  var page    = window._ratingPage || 'unknown';

  // Save locally
  try {
    localStorage.setItem('cc_last_rated', Date.now().toString());
    var ratings = JSON.parse(localStorage.getItem('cc_ratings') || '[]');
    ratings.unshift({ rating, comment, page, date: new Date().toISOString() });
    if (ratings.length > 20) ratings = ratings.slice(0,20);
    localStorage.setItem('cc_ratings', JSON.stringify(ratings));
  } catch(e) {}

  // Save to Airtable
  fetch('/api/airtable', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ action:'create', table:'Responses', fields:{
      'response_id': 'rate_' + Date.now(),
      'user_id':     'rating',
      'spoken_answer': page + ' · ' + rating + '/5' + (comment ? ' · ' + comment : ''),
      'is_living_legacy': false,
      'recorded_at': new Date().toISOString()
    }})
  }).catch(function(){});

  // Show thank you
  var sec = document.getElementById('rateExpSection');
  if (sec) {
    sec.innerHTML = '<div style="text-align:center;padding:.5rem 0;">'
      + '<div style="font-size:1.4rem;margin-bottom:.3rem;">' + (rating >= 4 ? '✦' : '🙏') + '</div>'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:.95rem;color:rgba(242,232,216,.45);">'
      + (rating >= 4 ? 'Thank you. That means a lot.' : 'Thank you. We\'re listening.') + '</div></div>';
    setTimeout(function(){ if(sec.parentNode) sec.parentNode.removeChild(sec); }, 3000);
  }
}

function dismissRating() {
  try { localStorage.setItem('cc_last_rated', Date.now().toString()); } catch(e) {}
  var sec = document.getElementById('rateExpSection');
  if (sec && sec.parentNode) sec.parentNode.removeChild(sec);
}
