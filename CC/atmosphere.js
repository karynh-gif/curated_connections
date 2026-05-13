/**
 * CC Atmosphere — Cinematic Emotional Environment
 * Bokeh · dust motes · embers · depth fog · fairy lights · warmth bleed
 * Only activates at 520px+. Tablet (768px+) gets the full environment.
 * No sparkles. No star arms. Light suspended in air.
 */
(function() {
  'use strict';

  if (window.innerWidth < 520) return;

  var isTablet = function() { return window.innerWidth >= 768; };
  var appW = function() {
    // zoom: 1.22 at 768px, 1.32 at 1024px — particles avoid the zoomed visual footprint
    if (window.innerWidth >= 1024) return 660;
    if (window.innerWidth >= 768)  return 660; // matches .app max-width on tablet
    return 430;
  };

  function getAppBounds() {
    var aw = Math.min(appW(), window.innerWidth);
    var l  = (window.innerWidth - aw) / 2;
    return { left: l, right: l + aw };
  }

  function sideX(b) {
    var W = window.innerWidth;
    var s = Math.random() < 0.5 ? 'L' : 'R';
    if (s === 'L' && b.left  > 8) return Math.random() * b.left;
    if (s === 'R' && W - b.right > 8) return b.right + Math.random() * (W - b.right);
    return Math.random() < 0.5 ? Math.random() * 50 : W - Math.random() * 50;
  }

  // ── INJECT DOM ──────────────────────────────────────────────
  function injectAtmosphere() {
    if (document.getElementById('cc-atmosphere')) return;

    var atm = document.createElement('div');
    atm.id = 'cc-atmosphere';
    atm.className = 'cc-atmosphere';
    atm.innerHTML =
      '<div class="cc-atm-glow-1"></div>' +
      '<div class="cc-atm-glow-2"></div>' +
      '<div class="cc-atm-glow-3"></div>' +
      '<canvas id="cc-particles"></canvas>' +
      '<div class="cc-atm-vignette"></div>';
    document.body.insertBefore(atm, document.body.firstChild);

    var lp = document.createElement('div');
    lp.className = 'cc-atm-left-panel';
    document.body.appendChild(lp);

    var rp = document.createElement('div');
    rp.className = 'cc-atm-right-panel';
    document.body.appendChild(rp);

    if (isTablet()) {
      // Warmth bleed — app is the light source
      var fg = document.createElement('div');
      fg.id = 'cc-frame-glow';
      document.body.appendChild(fg);

      // Edge dissolve — no hard line at container boundary
      var el = document.createElement('canvas');
      el.id = 'cc-edge-fade-left';
      document.body.appendChild(el);

      var er = document.createElement('canvas');
      er.id = 'cc-edge-fade-right';
      document.body.appendChild(er);

      // Depth fog canvas
      var fog = document.createElement('canvas');
      fog.id = 'cc-fog';
      document.body.appendChild(fog);

      // Fairy lights canvas
      var fl = document.createElement('canvas');
      fl.id = 'cc-fairy-lights';
      document.body.appendChild(fl);

      initFog(fog);
      initFairyLights(fl);
    }

    initParticles(document.getElementById('cc-particles'));
  }

  // ── DEPTH FOG ───────────────────────────────────────────────
  function initFog(canvas) {
    var ctx = canvas.getContext('2d');
    var W, H;

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    var patches = [];
    for (var i = 0; i < 7; i++) {
      patches.push({
        x: Math.random() * 1.3 - 0.15, y: 0.45 + Math.random() * 0.7,
        w: 0.32 + Math.random() * 0.38, h: 0.16 + Math.random() * 0.20,
        a: 0.018 + Math.random() * 0.016,
        vx: (Math.random() - 0.5) * 0.00006,
        vy: -0.000035 - Math.random() * 0.000025,
        hue: 215 + Math.random() * 38
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      patches.forEach(function(p) {
        p.x += p.vx; p.y += p.vy;
        if (p.y + p.h < -0.1) { p.y = 1.1; p.x = Math.random() * 1.2 - 0.1; }
        var cx = p.x * W, cy = p.y * H, rx = p.w * W * 0.5, ry = p.h * H * 0.5;
        ctx.save();
        ctx.globalAlpha = p.a;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        g.addColorStop(0,   'hsla(' + p.hue + ',35%,26%,0.85)');
        g.addColorStop(0.5, 'hsla(' + p.hue + ',28%,20%,0.4)');
        g.addColorStop(1,   'transparent');
        ctx.fillStyle = g;
        ctx.scale(1, ry / rx);
        ctx.beginPath(); ctx.arc(cx, cy * (rx / ry), rx, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ── FAIRY LIGHTS ────────────────────────────────────────────
  function initFairyLights(canvas) {
    var ctx = canvas.getContext('2d');
    var W, H, strands = [], t = 0;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      buildStrands();
    }

    function addStrand(x0, x1, y0, y1) {
      var n = 4 + Math.floor(Math.random() * 3), s = [];
      for (var i = 0; i <= n; i++) {
        var tt = i / n, sag = Math.sin(Math.PI * tt) * (16 + Math.random() * 18);
        s.push({ x: x0 + (x1-x0)*tt, y: y0 + (y1-y0)*tt + sag,
          phase: Math.random()*Math.PI*2, speed: 0.22+Math.random()*0.38,
          hue: 30+Math.random()*16, size: 1.6+Math.random()*1.4 });
      }
      strands.push(s);
    }

    function buildStrands() {
      strands = [];
      var b = getAppBounds();

      if (b.left > 20) {
        addStrand(b.left*0.12, b.left*0.72, H*0.06, H*0.28);
        addStrand(b.left*0.28, b.left*0.82, H*0.40, H*0.62);
        addStrand(b.left*0.08, b.left*0.58, H*0.70, H*0.88);
        var hc = Math.max(3, Math.floor(b.left/30)), hs = [];
        for (var i = 0; i <= hc; i++) {
          var tt = i/hc, sg = Math.sin(Math.PI*tt)*16;
          hs.push({ x: i*(b.left/hc), y: H*0.055+sg,
            phase: Math.random()*Math.PI*2, speed: 0.18+Math.random()*0.30,
            hue: 33+Math.random()*12, size: 1.8+Math.random()*1.2 });
        }
        strands.push(hs);
      }

      if (W - b.right > 20) {
        var rw = W - b.right;
        addStrand(b.right+rw*0.12, b.right+rw*0.72, H*0.06, H*0.28);
        addStrand(b.right+rw*0.28, b.right+rw*0.82, H*0.40, H*0.62);
        addStrand(b.right+rw*0.08, b.right+rw*0.58, H*0.70, H*0.88);
        var hc2 = Math.max(3, Math.floor(rw/30)), hs2 = [];
        for (var i = 0; i <= hc2; i++) {
          var tt = i/hc2, sg = Math.sin(Math.PI*tt)*16;
          hs2.push({ x: b.right+i*(rw/hc2), y: H*0.055+sg,
            phase: Math.random()*Math.PI*2, speed: 0.18+Math.random()*0.30,
            hue: 33+Math.random()*12, size: 1.8+Math.random()*1.2 });
        }
        strands.push(hs2);
      }
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      ctx.clearRect(0, 0, W, H); t += 0.007;
      strands.forEach(function(strand) {
        if (strand.length < 2) return;
        ctx.beginPath(); ctx.moveTo(strand[0].x, strand[0].y);
        for (var i = 1; i < strand.length; i++) ctx.lineTo(strand[i].x, strand[i].y);
        ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 0.4; ctx.stroke();

        strand.forEach(function(b) {
          var f  = 0.60 + 0.40 * Math.sin(t * b.speed + b.phase);
          var al = 0.38 + 0.35 * f;
          var gw = b.size * (1.6 + 0.9 * f);
          ctx.save();
          var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, gw * 2.6);
          g.addColorStop(0,    'hsla('+b.hue+',70%,66%,'+(al*0.45)+')');
          g.addColorStop(0.35, 'hsla('+b.hue+',60%,55%,'+(al*0.18)+')');
          g.addColorStop(0.7,  'hsla('+b.hue+',48%,42%,'+(al*0.055)+')');
          g.addColorStop(1,    'transparent');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(b.x, b.y, gw*2.6, 0, Math.PI*2); ctx.fill();
          var c = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size*0.85);
          c.addColorStop(0,    'hsla('+b.hue+',82%,82%,'+(al*0.70)+')');
          c.addColorStop(0.55, 'hsla('+b.hue+',72%,62%,'+(al*0.35)+')');
          c.addColorStop(1,    'transparent');
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.size*0.85, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        });
      });
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ── PARTICLES: bokeh · dust · ember ─────────────────────────
  // No star arms. No sparkle shapes. Light suspended in air.
  function initParticles(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H;

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    var tab = isTablet();

    function makeBokeh(b) { return { type:'bk', x:sideX(b), y:Math.random()*H, vx:(Math.random()-0.5)*0.045, vy:-(0.012+Math.random()*0.032), life:Math.random(), lifeSpeed:0.00012+Math.random()*0.00018, size:14+Math.random()*30, maxAlpha:0.05+Math.random()*0.07, wobble:Math.random()*Math.PI*2, wobbleSpeed:0.002+Math.random()*0.003, hue:Math.random()<0.62?28+Math.random()*16:218+Math.random()*32, sat:30+Math.random()*28, lit:52+Math.random()*28 }; }
    function makeDust(b)  { return { type:'du', x:sideX(b), y:Math.random()*H, vx:(Math.random()-0.5)*0.07,  vy:-(0.022+Math.random()*0.055), life:Math.random(), lifeSpeed:0.00035+Math.random()*0.00045, size:0.7+Math.random()*1.1, maxAlpha:0.16+Math.random()*0.16, wobble:Math.random()*Math.PI*2, wobbleSpeed:0.007+Math.random()*0.011, hue:30+Math.random()*18, sat:38+Math.random()*22, lit:68+Math.random()*20 }; }
    function makeEmber(b) { return { type:'em', x:sideX(b), y:Math.random()*H, vx:(Math.random()-0.5)*0.10,  vy:-(0.04+Math.random()*0.10),  life:Math.random(), lifeSpeed:0.00028+Math.random()*0.00035, size:2.2+Math.random()*2.5, maxAlpha:0.25+Math.random()*0.20, wobble:Math.random()*Math.PI*2, wobbleSpeed:0.004+Math.random()*0.007, hue:24+Math.random()*16, sat:72+Math.random()*20, lit:56+Math.random()*18 }; }

    var b = getAppBounds(), ps = [];
    var bCount = tab ? 20 : 8;
    var dCount = tab ? 24 : 12;
    var eCount = tab ? 13 : 6;
    for (var i=0; i<bCount; i++) ps.push(makeBokeh(b));
    for (var i=0; i<dCount; i++) ps.push(makeDust(b));
    for (var i=0; i<eCount; i++) ps.push(makeEmber(b));

    function getAlpha(p) {
      var a;
      if      (p.life < 0.12) a = p.life / 0.12;
      else if (p.life < 0.85) a = 1;
      else                    a = 1 - (p.life - 0.85) / 0.15;
      return a * p.maxAlpha;
    }

    function drawP(p) {
      var a = getAlpha(p); if (a < 0.004) return;
      ctx.save();
      if (p.type === 'bk') {
        ctx.globalAlpha = a;
        var g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);
        g.addColorStop(0,    'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0.85)');
        g.addColorStop(0.3,  'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0.50)');
        g.addColorStop(0.65, 'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0.15)');
        g.addColorStop(1,    'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      } else if (p.type === 'du') {
        ctx.globalAlpha = a;
        var g2 = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2.0);
        g2.addColorStop(0,   'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0.75)');
        g2.addColorStop(0.55,'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0.25)');
        g2.addColorStop(1,   'transparent');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*2.0,0,Math.PI*2); ctx.fill();
      } else {
        var pulse = 0.65 + 0.35 * Math.sin(p.wobble * 1.8);
        ctx.globalAlpha = a * pulse;
        var r = p.size * 2.5;
        var g3 = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
        g3.addColorStop(0,    'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,1.0)');
        g3.addColorStop(0.38, 'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0.42)');
        g3.addColorStop(0.72, 'hsla('+p.hue+','+p.sat+'%,'+p.lit+'%,0.10)');
        g3.addColorStop(1,    'transparent');
        ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    var last = 0;
    function animate(now) {
      requestAnimationFrame(animate);
      var dt = Math.min((now - last) / 16, 3); last = now;
      ctx.clearRect(0, 0, W, H);
      var b = getAppBounds();
      ps.forEach(function(p) {
        p.wobble += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 0.05) * dt;
        p.y += p.vy * dt;
        p.life += p.lifeSpeed * dt;
        if (p.life >= 1 || p.y < -40 || p.x < -40 || p.x > window.innerWidth + 40) {
          var np = p.type==='bk' ? makeBokeh(b) : p.type==='du' ? makeDust(b) : makeEmber(b);
          np.life = 0; np.y = p.life >= 1 ? H + 20 : Math.random() * H;
          Object.assign(p, np);
        }
        drawP(p);
      });
    }
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAtmosphere);
  } else {
    injectAtmosphere();
  }

})();
