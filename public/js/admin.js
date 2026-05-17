// public/js/admin.js — Admin Panel JavaScript

'use strict';

// ── Sidebar Toggle (mobile) ─────────────────────────────────────
(function () {
  const sidebar   = document.getElementById('adminSidebar');
  const openBtn   = document.getElementById('sidebarOpen');
  const closeBtn  = document.getElementById('sidebarToggle');
  const overlay   = document.createElement('div');

  if (!sidebar) return;

  // Backdrop overlay
  overlay.style.cssText = `
    display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6);
    z-index:499; backdrop-filter:blur(2px);
  `;
  document.body.appendChild(overlay);

  function openSidebar() {
    sidebar.classList.add('is-open');
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
})();

// ── Confirm dialogs for destructive actions ─────────────────────
(function () {
  // Any delete/cancel forms with data-confirm
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!confirm(el.dataset.confirm)) e.preventDefault();
    });
  });
})();

// ── Admin table row click ────────────────────────────────────────
(function () {
  document.querySelectorAll('.table tbody tr[data-href]').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      window.location.href = row.dataset.href;
    });
  });
})();

// ── Admin stat cards entrance animation ─────────────────────────
(function () {
  const cards = document.querySelectorAll('.admin-stat-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    card.style.transition = `opacity 0.4s ease ${i * 0.07}s, transform 0.4s ease ${i * 0.07}s`;
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 50);
  });
})();
