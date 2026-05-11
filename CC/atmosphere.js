/**
 * CC Atmosphere — Particle Engine
 * Drifting embers, floating dust, quiet storytelling energy.
 * Only runs on screens ≥ 520px. Ultra-lightweight.
 * No dependencies. No impact on app performance.
 */
(function() {
  'use strict';

  // Only activate on larger screens
  if (window.innerWidth < 520) return;

  // Inject DOM structure if not already present
  function injectAtmosphere() {
    if (document.getElementById('cc-atmosphere')) return;

    const atm = document.createElement('div');
    atm.id = 'cc-atmosphere';
    atm.className = 'cc-atmosphere';
    atm.innerHTML = `
      <div class="cc-atm-glow-1"></div>
      <div class="cc-atm-glow-2"></div>
      <div class="cc-atm-glow-3"></div>
      <canvas id="cc-particles"></canvas>
      <div class="cc-atm-vignette"></div>
    `;
    document.body.insertBefore(atm, document.body.firstChild);

    // Side panels
    const lp = document.createElement('div');
    lp.className = 'cc-atm-left-panel';
    document.body.appendChild(lp);

    const rp = document.createElement('div');
    rp.className = 'cc-atm-right-panel';
    document.body.appendChild(rp);

    initParticles();
  }

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
