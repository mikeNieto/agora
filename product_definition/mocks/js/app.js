/* ============================================================
   AGORA — app.js
   Core application logic: theme, language, modals, navigation
   ============================================================ */

'use strict';

// ── Theme ──────────────────────────────────────────────────
const Theme = (() => {
  const KEY = 'agora-theme';
  let current = localStorage.getItem(KEY) || 'dark';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Update all toggle buttons
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? (Lang.is('es') ? 'Modo claro' : 'Light mode') : (Lang.is('es') ? 'Modo oscuro' : 'Dark mode');
    });
  }

  function toggle() {
    current = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, current);
    apply(current);
  }

  function init() { apply(current); }

  return { init, toggle, get: () => current };
})();

// ── Language ───────────────────────────────────────────────
const Lang = (() => {
  const KEY = 'agora-lang';
  let current = localStorage.getItem(KEY) || 'es';

  const strings = {
    es: {
      // Nav
      'new_forum': 'Nuevo Foro',
      'my_forums': 'Mis Foros',
      'dashboard_title': 'Foros de Debate',
      'dashboard_subtitle': 'Crea y gestiona debates entre agentes de IA',
      // Forum card statuses
      'status_draft':   'Borrador',
      'status_qa':      'Preguntas',
      'status_review':  'Revisión',
      'status_debate':  'Debatiendo',
      'status_done':    'Completado',
      'status_paused':  'Pausado',
      // Create
      'create_title':   'Crear nuevo foro',
      'agents_label':   'Número de agentes',
      'idea_label':     'Describe tu idea',
      'docs_label':     'Documentos a generar',
      'submit':         'Enviar',
      'cancel':         'Cancelar',
      'confirm_submit': '¿Estás seguro de que deseas enviar?',
      'next':           'Siguiente',
      'back':           'Atrás',
      // Q&A
      'qa_title':       'Clarificación del Moderador',
      'qa_progress':    'Pregunta {n} de {total} · Ronda {r}',
      // Review
      'review_title':   'Revisión del Entendimiento',
      // Debate
      'debate_title':   'Debate en Progreso',
      'pause':          'Pausar',
      'stop':           'Detener',
      // Docs
      'docs_viewer':    'Documentos Generados',
      'export_zip':     'Exportar ZIP',
    },
    en: {
      'new_forum': 'New Forum',
      'my_forums': 'My Forums',
      'dashboard_title': 'Discussion Forums',
      'dashboard_subtitle': 'Create and manage AI agent debates',
      'status_draft':   'Draft',
      'status_qa':      'Q&A',
      'status_review':  'Review',
      'status_debate':  'Debating',
      'status_done':    'Completed',
      'status_paused':  'Paused',
      'create_title':   'Create new forum',
      'agents_label':   'Number of agents',
      'idea_label':     'Describe your idea',
      'docs_label':     'Documents to generate',
      'submit':         'Submit',
      'cancel':         'Cancel',
      'confirm_submit': 'Are you sure you want to submit?',
      'next':           'Next',
      'back':           'Back',
      'qa_title':       'Moderator Clarification',
      'qa_progress':    'Question {n} of {total} · Round {r}',
      'review_title':   'Understanding Review',
      'debate_title':   'Debate in Progress',
      'pause':          'Pause',
      'stop':           'Stop',
      'docs_viewer':    'Generated Documents',
      'export_zip':     'Export ZIP',
    }
  };

  function t(key, vars = {}) {
    let str = (strings[current] || strings.es)[key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
    return str;
  }

  function toggle() {
    current = current === 'es' ? 'en' : 'es';
    localStorage.setItem(KEY, current);
    // Update toggle buttons
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.textContent = current === 'es' ? 'EN' : 'ES';
      btn.title = current === 'es' ? 'Switch to English' : 'Cambiar a Español';
    });
    // Trigger page re-render if available
    if (window._onLangChange) window._onLangChange(current);
  }

  function is(lang) { return current === lang; }

  function init() {
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.textContent = current === 'es' ? 'EN' : 'ES';
    });
  }

  return { t, toggle, is, init, get: () => current };
})();

// ── Modal ──────────────────────────────────────────────────
const Modal = (() => {
  function open(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Focus first focusable element
    const focusable = overlay.querySelector('button, input, textarea, select, [tabindex]');
    if (focusable) setTimeout(() => focusable.focus(), 50);
  }

  function close(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(el => {
      el.classList.remove('open');
    });
    document.body.style.overflow = '';
  }

  function init() {
    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) close(overlay.id);
      });
    });
    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAll();
    });
    // Wire open/close buttons
    document.querySelectorAll('[data-modal-open]').forEach(btn => {
      btn.addEventListener('click', () => open(btn.dataset.modalOpen));
    });
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => close(btn.dataset.modalClose));
    });
  }

  return { open, close, closeAll, init };
})();

// ── Toast ──────────────────────────────────────────────────
const Toast = (() => {
  function show(message, type = 'success', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.info}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideInRight .3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();

// ── Navigation helpers ─────────────────────────────────────
const Nav = {
  go: (page) => { window.location.href = page; },
  back: () => { history.back(); }
};

// ── Color picker ───────────────────────────────────────────
function initColorPickers() {
  document.querySelectorAll('.color-picker').forEach(picker => {
    const swatches = picker.querySelectorAll('.color-swatch');
    const targetId = picker.dataset.target;

    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        // Deselect all in this picker
        swatches.forEach(s => s.classList.remove('selected'));
        // Select clicked
        swatch.classList.add('selected');
        // Update avatar if target exists
        if (targetId) {
          const avatar = document.getElementById(targetId);
          if (avatar) {
            avatar.setAttribute('data-color', swatch.dataset.color);
          }
        }
      });
    });
  });
}

// ── Agent count selector ───────────────────────────────────
function initCountSelector() {
  const buttons = document.querySelectorAll('.count-btn');
  const container = document.getElementById('agents-container');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const count = parseInt(btn.dataset.count);
      if (container && window._renderAgentCards) {
        window._renderAgentCards(count);
      }
    });
  });
}

// ── Initialize on DOM ready ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Lang.init();
  Modal.init();
  initColorPickers();
  initCountSelector();

  // Wire header controls
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', Theme.toggle);
  });
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    btn.addEventListener('click', Lang.toggle);
  });

  // Page fade-in
  document.body.classList.add('page-fade-in');
});
