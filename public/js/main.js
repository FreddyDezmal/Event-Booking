// public/js/main.js — Frontend JavaScript

'use strict';

// ── Theme Toggle ───────────────────────────────────────────────
(function () {
  const toggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  // Read saved preference (but respect admin dark default)
  const isAdmin = document.body.classList.contains('admin-body');
  const saved = localStorage.getItem('ae-theme');
  if (!isAdmin) {
    const theme = saved || 'light';
    html.setAttribute('data-theme', theme);
    if (toggle) {
      toggle.querySelector('.theme-toggle__icon').textContent = theme === 'dark' ? '☀' : '☽';
    }
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('ae-theme', next);
      toggle.querySelector('.theme-toggle__icon').textContent = next === 'dark' ? '☀' : '☽';
    });
  }
})();

// ── Mobile Navigation ──────────────────────────────────────────
(function () {
  const hamburger = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', isOpen);

      // Animate hamburger → X
      const spans = hamburger.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });

    // Close nav on outside click
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('is-open');
      }
    });
  }
})();

// ── Toast Auto-dismiss ──────────────────────────────────────────
(function () {
  const toast = document.getElementById('toast');
  if (toast) {
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }
})();

// ── Password Visibility Toggle ──────────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// ── Password Strength Indicator ─────────────────────────────────
(function () {
  const passInput = document.getElementById('password');
  const bar = document.getElementById('strengthBar');
  if (!passInput || !bar) return;

  passInput.addEventListener('input', () => {
    const val = passInput.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const colors = ['#c0392b', '#d4581b', '#d4a82e', '#2d7a4f'];
    const widths = ['25%', '50%', '75%', '100%'];
    bar.style.background = colors[score - 1] || '#2a2620';
    bar.style.width = widths[score - 1] || '0%';
  });
})();

// ── Scroll-triggered nav shadow ─────────────────────────────────
(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.boxShadow = window.scrollY > 10
      ? '0 4px 24px rgba(0,0,0,0.1)'
      : '';
  }, { passive: true });
})();

// ── Animate elements on scroll ──────────────────────────────────
(function () {
  if (!window.IntersectionObserver) return;

  const targets = document.querySelectorAll('.event-card, .stat-card, .admin-stat-card, .booking-item');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
})();

// ── Search autocomplete hint (progressive enhancement) ──────────
(function () {
  const searchInput = document.querySelector('.hero__search-input');
  if (!searchInput) return;
  const hints = ['Jazz Festival', 'Tech Conference', 'Food & Wine', 'Sports Day', 'Comedy Night', 'Art Exhibition'];
  let i = 0, charIndex = 0, typing = true;

  // Only show placeholder animation when input is empty and unfocused
  let focused = false;
  searchInput.addEventListener('focus', () => { focused = true; });
  searchInput.addEventListener('blur', () => { focused = false; });

  function animate() {
    if (focused || searchInput.value) return;
    const hint = 'e.g. ' + hints[i];
    if (typing) {
      if (charIndex < hint.length) {
        searchInput.placeholder = hint.substring(0, charIndex + 1) + '|';
        charIndex++;
        setTimeout(animate, 60);
      } else {
        typing = false;
        setTimeout(animate, 1800);
      }
    } else {
      if (charIndex > 0) {
        searchInput.placeholder = hint.substring(0, charIndex - 1) + '|';
        charIndex--;
        setTimeout(animate, 30);
      } else {
        typing = true;
        i = (i + 1) % hints.length;
        setTimeout(animate, 500);
      }
    }
  }

  setTimeout(animate, 1000);
})();

// ── Capacity bar animated fill ───────────────────────────────────
(function () {
  const fill = document.querySelector('.capacity-bar__fill');
  if (!fill) return;
  const target = fill.style.width;
  fill.style.width = '0%';
  setTimeout(() => { fill.style.width = target; }, 400);
})();
