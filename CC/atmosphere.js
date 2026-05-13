/**
 * CC Atmosphere — Particle Engine
 * Real sparkles. Real fireflies. Starlit nighttime space.
 * Only runs on screens ≥ 520px.
 */
(function() {
  'use strict';

  if (window.innerWidth < 520) return;

  var tablet  = function() { return window.innerWidth >= 768; };
  var appW    = function() { return window.innerWidth >= 1024 ? 660 : window.innerWidth >= 768 ? 600 : 430; };

  function injectAtmosphere() {
    if (document.getElementById('cc-atmosphere')) return;

    var atm = document.createElement('div');
    atm.id = 'cc-atmosphere';
    atm.className = 'cc-atmosphere';
    atm.innerHTML =
      '<div class="cc-atm-glow-1"></div>' +
      '<div class="cc-atm-glow-2"></div>' +
      '<div class="cc-atm-glow-3"></div>' +
      '<div class="cc-atm-glow-4"></div>' +
      '<canvas id="cc-particles"></canvas>' +
      '<div class="cc-atm-vignette"></div>';
    document.body.insertBefore(atm, document.body.firstChild);

    var lp = document.createElement('div');
    lp.className = 'cc-atm-left-panel';
    document.body.appendChild(lp);

    var rp = document.createElement('div');
    rp.className = 'cc-atm-right-panel';
    document.body.appendChild(rp);

    if (tablet()) {
      // Frame glow
      var fg = document.createElement('div');
      fg.id = 'cc-frame-glow';
      document.body.appendChild(fg);
      // Edge fades — dissolve the hard line
      var el = document.createElement('div');
      el.id = 'cc-edge-fade-left';
      document.body.appendChild(el);
      var er = document.createElement('div');
      er.id = 'cc-edge-fade-right';
      document.body.appendChild(er);
    }

    initParticles();
  }

  function initParticles() {
    var canvas = document.getElementById('cc-particles');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width  = window.innerWidth;
    var H = canvas.height = window.innerHeight;

    window.addEventListener('resize', function() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    });

    // Particle counts — tablet gets real atmosphere
    var COUNT_FIREFLY = tablet() ? 22 : 0;
    var COUNT_SPARKLE = tablet() ? 35 : 14;
    var COUNT_STAR    = tablet() ? 50 : 20;
    var TOTAL = COUNT_FIREFLY + COUNT_SPARKLE + COUNT_STAR;

    function getAppBounds() {
      var aw   = Math.min(appW(), W);
      var left = (W - aw) / 2;
      return { left: left, right: left + aw, w: aw };
    }

    function sideX(bounds) {
      var side = Math.random() < 0.5 ? 'left' : 'right';
      if (side === 'left'  && bounds.left  > 10) return Math.random() * bounds.left;
      if (side === 'right' && W - bounds.right > 10) return bounds.right + Math.random() * (W - bounds.right);
      return Math.random() < 0.5 ? Math.random() * 60 : W - Math.random() * 60;
    }

    var particles = [];

    function makeFirefly(bounds) {
      return {
        type: 'firefly',
        x: sideX(bounds),
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -(0.05 + Math.random() * 0.12),
        life: Math.random(),
        lifeSpeed: 0.0003 + Math.random() * 0.0004,
        size: 2.2 + Math.random() * 2.0,
        maxAlpha: 0.55 + Math.random() * 0.35,  // BRIGHT — actually visible
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.006 + Math.random() * 0.01,
        hue: 140 + Math.random() * 50,           // cool green-teal
        sat: 55 + Math.random() * 25,
        lit: 62 + Math.random() * 22,
      };
    }

    function makeSparkle(bounds) {
      return {
        type: 'sparkle',
        x: sideX(bounds),
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(0.08 + Math.random() * 0.22),
        life: Math.random(),
        lifeSpeed: 0.0006 + Math.random() * 0.0008,
        size: 1.4 + Math.random() * 1.8,
        maxAlpha: tablet() ? 0.45 + Math.random() * 0.40 : 0.18 + Math.random() * 0.20,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.015,
        // Warm amber-gold sparkles
        hue: 28 + Math.random() * 22,
        sat: 75 + Math.random() * 20,
        lit: 60 + Math.random() * 25,
      };
    }

    function makeStar(bounds) {
      return {
        type: 'star',
        x: sideX(bounds),
        y: Math.random() * H,
        vx: 0, vy: -0.015,
        life: Math.random(),
        lifeSpeed: 0.0004 + Math.random() * 0.0006,
        size: 0.6 + Math.random() * 1.0,
        maxAlpha: tablet() ? 0.30 + Math.random() * 0.35 : 0.12 + Math.random() * 0.16,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.005 + Math.random() * 0.008,
        hue: 38 + Math.random() * 20,
        sat: 35 + Math.random() * 30,
        lit: 80 + Math.random() * 15,
      };
    }

    var bounds = getAppBounds();
    for (var i = 0; i < TOTAL; i++) {
      var p;
      if (i < COUNT_FIREFLY) p = makeFirefly(bounds);
      else if (i < COUNT_FIREFLY + COUNT_SPARKLE) p = makeSparkle(bounds);
      else p = makeStar(bounds);
      particles.push(p);
    }

    function alpha(p) {
      var a;
      if      (p.life < 0.15) a = p.life / 0.15;
      else if (p.life < 0.82) a = 1;
      else                    a = 1 - (p.life - 0.82) / 0.18;
      return a * p.maxAlpha;
    }

    function draw(p) {
      var a = alpha(p);
      if (a < 0.006) return;
      var size = p.size * Math.min(1, (p.life < 0.15 ? p.life / 0.15 : 1) * 4);
      ctx.save();
      ctx.globalAlpha = a;

      if (p.type === 'firefly') {
        // Pulse with wobble — living light
        var pulse = 0.60 + 0.40 * Math.sin(p.wobble * 2.2);
        var r = size * 3.8 * pulse;
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        var col = 'hsl(' + p.hue + ',' + p.sat + '%,' + p.lit + '%)';
        g.addColorStop(0,    col);
        g.addColorStop(0.35, 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,0.35)');
        g.addColorStop(1,    'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'sparkle') {
        // Bright amber glow + 4-point star cross
        var r2 = size * 2.8;
        var g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r2);
        var c2 = 'hsl(' + p.hue + ',' + p.sat + '%,' + p.lit + '%)';
        g2.addColorStop(0,    c2);
        g2.addColorStop(0.4,  'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,0.5)');
        g2.addColorStop(1,    'transparent');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
        ctx.fill();
        // 4-point star sparkle arms
        if (size > 1.8) {
          ctx.globalAlpha = a * 0.7;
          ctx.strokeStyle = c2;
          ctx.lineWidth = size * 0.22;
          ctx.lineCap = 'round';
          var arm = size * 2.2;
          ctx.beginPath(); ctx.moveTo(p.x - arm, p.y); ctx.lineTo(p.x + arm, p.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p.x, p.y - arm); ctx.lineTo(p.x, p.y + arm); ctx.stroke();
          // Diagonal shorter arms
          ctx.globalAlpha = a * 0.35;
          ctx.lineWidth = size * 0.14;
          var arm2 = arm * 0.55;
          ctx.beginPath(); ctx.moveTo(p.x-arm2, p.y-arm2); ctx.lineTo(p.x+arm2, p.y+arm2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p.x+arm2, p.y-arm2); ctx.lineTo(p.x-arm2, p.y+arm2); ctx.stroke();
        }

      } else {
        // Star — soft glow dot, twinkles with wobble
        var tw = 0.7 + 0.3 * Math.sin(p.wobble * 3);
        ctx.globalAlpha = a * tw;
        var r3 = size * 1.8;
        var g3 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r3);
        var c3 = 'hsl(' + p.hue + ',' + p.sat + '%,' + p.lit + '%)';
        g3.addColorStop(0,   c3);
        g3.addColorStop(0.5, 'hsla(' + p.hue + ',' + p.sat + '%,' + p.lit + '%,0.4)');
        g3.addColorStop(1,   'transparent');
        ctx.fillStyle = g3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    var lastTime = 0;
    function animate(now) {
      requestAnimationFrame(animate);
      var dt = Math.min((now - lastTime) / 16, 3);
      lastTime = now;
      ctx.clearRect(0, 0, W, H);

      var b = getAppBounds();
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.wobble += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 0.09) * dt;
        p.y += p.vy * dt;
        p.life += p.lifeSpeed * dt;

        if (p.life >= 1 || p.y < -20 || p.x < -30 || p.x > W + 30) {
          var np;
          if (p.type === 'firefly') np = makeFirefly(b);
          else if (p.type === 'sparkle') np = makeSparkle(b);
          else np = makeStar(b);
          np.life = 0;
          np.y    = p.life >= 1 ? H + 10 : Math.random() * H;
          Object.assign(p, np);
        }
        draw(p);
      }
    }
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAtmosphere);
  } else {
    injectAtmosphere();
  }
})();

  function initParticles() {
    const canvas = document.getElementById('cc-particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    });

    // Particle types: ember, dust, star
    const PARTICLE_COUNT = 28;
    const particles = [];

    // App canvas boundaries — particles avoid the center zone
    function getAppBounds() {
      const appW = Math.min(430, W);
      const left  = (W - appW) / 2;
      const right = left + appW;
      return { left, right, w: appW };
    }

    function randomEdge(bounds) {
      // Particles only appear in the side zones
      const side = Math.random() < 0.5 ? 'left' : 'right';
      let x;
      if (side === 'left' && bounds.left > 20) {
        x = Math.random() * bounds.left;
      } else if (side === 'right' && (W - bounds.right) > 20) {
        x = bounds.right + Math.random() * (W - bounds.right);
      } else {
        // Fallback: edges of full screen
        x = Math.random() < 0.5 ? Math.random() * 80 : W - Math.random() * 80;
      }
      return x;
    }

    function createParticle(bounds) {
      const type = Math.random();
      let p = {
        x: randomEdge(bounds),
        y: Math.random() * H,
        vy: -(0.12 + Math.random() * 0.28),    // drift upward, slow
        vx: (Math.random() - 0.5) * 0.15,       // gentle horizontal sway
        life: Math.random(),                      // 0–1 lifecycle position
        lifeSpeed: 0.0008 + Math.random() * 0.001,
        size: 0,
        maxSize: 0,
        type: 'dust',
        alpha: 0,
        maxAlpha: 0,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.008 + Math.random() * 0.012,
      };

      if (type < 0.2) {
        // Ember — warm amber glow, slightly larger
        p.type = 'ember';
        p.maxSize  = 1.2 + Math.random() * 1.4;
        p.maxAlpha = 0.18 + Math.random() * 0.2;
        p.vy = -(0.18 + Math.random() * 0.35);
        p.color = `hsl(${25 + Math.random() * 20}, 80%, ${55 + Math.random() * 20}%)`;
      } else if (type < 0.55) {
        // Dust mote — tiny, almost invisible
        p.type = 'dust';
        p.maxSize  = 0.6 + Math.random() * 0.8;
        p.maxAlpha = 0.08 + Math.random() * 0.1;
        p.vy = -(0.05 + Math.random() * 0.18);
        p.color = `rgba(220, 200, 160, 1)`;
      } else {
        // Star — stationary twinkle, very small
        p.type = 'star';
        p.maxSize  = 0.5 + Math.random() * 0.7;
        p.maxAlpha = 0.12 + Math.random() * 0.16;
        p.vy = -0.02;
        p.vx = 0;
        p.lifeSpeed = 0.0005 + Math.random() * 0.0008;
        p.color = `rgba(240, 225, 195, 1)`;
      }

      return p;
    }

    const bounds = getAppBounds();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = createParticle(bounds);
      p.life = Math.random(); // stagger start positions
      particles.push(p);
    }

    function drawParticle(p) {
      // Life cycle: fade in (0–0.2), full (0.2–0.8), fade out (0.8–1.0)
      let alpha;
      if (p.life < 0.2)       alpha = p.life / 0.2;
      else if (p.life < 0.8)  alpha = 1;
      else                    alpha = 1 - (p.life - 0.8) / 0.2;

      const a = alpha * p.maxAlpha;
      if (a < 0.005) return;

      const size = p.maxSize * Math.min(1, alpha * 3);

      ctx.save();
      ctx.globalAlpha = a;

      if (p.type === 'ember') {
        // Soft glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.5);
        grd.addColorStop(0,   p.color);
        grd.addColorStop(0.5, p.color.replace('hsl', 'hsla').replace(')', ', 0.4)'));
        grd.addColorStop(1,   'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    let lastTime = 0;
    function animate(now) {
      requestAnimationFrame(animate);

      const dt = Math.min((now - lastTime) / 16, 3); // cap delta
      lastTime = now;

      ctx.clearRect(0, 0, W, H);

      const bounds = getAppBounds();

      particles.forEach((p, i) => {
        // Wobble
        p.wobble += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 0.08) * dt;
        p.y += p.vy * dt;
        p.life += p.lifeSpeed * dt;

        // Reset when life cycle complete or out of bounds
        if (p.life >= 1 || p.y < -20 || p.x < -20 || p.x > W + 20) {
          const newP = createParticle(bounds);
          newP.life = 0;
          newP.y = p.life >= 1 ? H + 10 : Math.random() * H;
          Object.assign(p, newP);
        }

        drawParticle(p);
      });
    }

    requestAnimationFrame(animate);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAtmosphere);
  } else {
    injectAtmosphere();
  }

})();
