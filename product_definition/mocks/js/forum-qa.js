/* ============================================================
   forum-qa.js — Q&A Phase logic
   ============================================================ */
'use strict';

const QA_QUESTIONS = [
  {
    id: 1,
    text: '¿Cuál es el stack tecnológico actual y qué restricciones tienes para el nuevo sistema?',
    options: [
      { id: 'a', text: 'PHP/Laravel en backend, React en frontend — abierto a cambiar ambos' },
      { id: 'b', text: 'PHP/Laravel en backend, React en frontend — solo cambiar backend', recommended: true },
      { id: 'c', text: 'Stack mixto — necesito documentar antes de migrar' },
      { id: 'd', text: 'Estoy abierto a cambiar todo el stack si hay justificación técnica' },
    ]
  },
  {
    id: 2,
    text: '¿Cuál es el presupuesto estimado de infraestructura mensual para el nuevo sistema?',
    options: [
      { id: 'a', text: 'Menos de $2,000/mes — optimización de costos es prioridad' },
      { id: 'b', text: 'Entre $2,000 y $10,000/mes — balance entre costo y rendimiento', recommended: true },
      { id: 'c', text: 'Más de $10,000/mes — rendimiento es la prioridad absoluta' },
      { id: 'd', text: 'No definido aún — necesito una estimación como parte de la documentación' },
    ]
  },
  {
    id: 3,
    text: '¿Tienes un equipo de DevOps o SRE para gestionar la infraestructura Kubernetes?',
    options: [
      { id: 'a', text: 'Sí, tenemos un equipo DevOps de 2-3 personas con experiencia en K8s' },
      { id: 'b', text: 'Tenemos devs que manejan infraestructura pero no especialistas K8s', recommended: true },
      { id: 'c', text: 'No, el plan es usar servicios gestionados (EKS, GKE, AKS)' },
      { id: 'd', text: 'Estamos contratando — la arquitectura debe ser operacionalmente simple' },
    ]
  },
  {
    id: 4,
    text: '¿Cuál es el plazo esperado para la migración completa del sistema actual al nuevo?',
    options: [
      { id: 'a', text: 'Menos de 6 meses — migración rápida con mínimo refactoring' },
      { id: 'b', text: '6 a 12 meses — migración progresiva por dominios de negocio' },
      { id: 'c', text: '1 a 2 años — migración completa con refactoring profundo', recommended: true },
      { id: 'd', text: 'No hay plazo definido — calidad por encima de velocidad' },
    ]
  }
];

let currentQ = 0;
let answers  = {};

function renderQuestion(index) {
  const q = QA_QUESTIONS[index];
  const container = document.getElementById('qa-question-container');
  if (!container) return;

  const optionsHtml = q.options.map(opt => `
    <div class="qa-option${answers[q.id] === opt.id ? ' selected' : ''}" 
         data-question="${q.id}" data-option="${opt.id}"
         onclick="selectOption(${q.id}, '${opt.id}', this)">
      <div class="qa-option__radio">
        ${answers[q.id] === opt.id ? '' : ''}
      </div>
      <div class="qa-option__text">${opt.text}</div>
      ${opt.recommended ? '<span class="qa-option__recommended">✓ Recomendada</span>' : ''}
    </div>
  `).join('');

  container.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .06em;">
        Pregunta ${index + 1}
      </span>
    </div>
    <div class="qa-question-text">${q.text}</div>
    <div class="qa-options">
      ${optionsHtml}
    </div>
    <div class="separator-label">O escribe tu propia respuesta</div>
    <div class="qa-option qa-option--freetext${answers[`${q.id}_free`] ? ' focused' : ''}" id="freetext-wrap-${q.id}">
      <div class="flex items-center gap-2 mb-2">
        <div class="qa-option__radio" id="freetext-radio-${q.id}">${answers[q.id] === 'free' ? '' : ''}</div>
        <span class="qa-option__text" style="font-weight: 600;">Respuesta personalizada</span>
      </div>
      <textarea class="form-input" 
        style="min-height: 80px; resize: vertical;" 
        placeholder="Escribe tu respuesta aquí..."
        oninput="handleFreetext(${q.id}, this)"
        onfocus="focusFreetext(${q.id})">${answers[`${q.id}_free`] || ''}</textarea>
    </div>
  `;

  updateNav(index);
  updateDots(index);
  updateProgress(index);
}

function selectOption(qId, optId, el) {
  answers[qId] = optId;
  // Deselect free text if any
  delete answers[`${qId}_free`];

  // Update UI
  document.querySelectorAll(`.qa-option[data-question="${qId}"]`).forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.option === optId);
  });

  // Deselect freetext
  const ftWrap = document.getElementById(`freetext-wrap-${qId}`);
  if (ftWrap) ftWrap.classList.remove('focused');

  updateNav(currentQ);
}

function handleFreetext(qId, textarea) {
  if (textarea.value.trim()) {
    answers[qId] = 'free';
    answers[`${qId}_free`] = textarea.value;
    // Deselect radio options
    document.querySelectorAll(`.qa-option[data-question="${qId}"]`).forEach(opt => {
      opt.classList.remove('selected');
    });
  } else {
    if (answers[qId] === 'free') delete answers[qId];
    delete answers[`${qId}_free`];
  }
  updateNav(currentQ);
}

function focusFreetext(qId) {
  const ftWrap = document.getElementById(`freetext-wrap-${qId}`);
  if (ftWrap) ftWrap.classList.add('focused');
}

function isCurrentAnswered() {
  const q = QA_QUESTIONS[currentQ];
  return answers[q.id] !== undefined;
}

function updateNav(index) {
  const backBtn = document.getElementById('qa-back-btn');
  const nextBtn = document.getElementById('qa-next-btn');
  const isLast  = index === QA_QUESTIONS.length - 1;
  const isFirst = index === 0;

  if (backBtn) backBtn.disabled = isFirst;

  if (nextBtn) {
    if (isLast) {
      nextBtn.textContent = 'Enviar Respuestas ✓';
      nextBtn.disabled = !isCurrentAnswered();
    } else {
      nextBtn.textContent = 'Siguiente →';
      nextBtn.disabled = !isCurrentAnswered();
    }
  }
}

function updateDots(index) {
  const dotsContainer = document.getElementById('qa-dots');
  if (!dotsContainer) return;
  dotsContainer.innerHTML = QA_QUESTIONS.map((_, i) => `
    <div style="
      width: ${i === index ? '20px' : '8px'};
      height: 8px;
      border-radius: 4px;
      background: ${i === index ? 'var(--accent-primary)' : i < index ? 'var(--accent-success)' : 'var(--border-default)'};
      transition: all 0.3s ease;
    "></div>
  `).join('');
}

function updateProgress(index) {
  const bar  = document.getElementById('qa-progress-bar');
  const text = document.getElementById('qa-progress-text');
  const pct  = ((index + 1) / QA_QUESTIONS.length * 100).toFixed(0);
  if (bar)  bar.style.width  = `${pct}%`;
  if (text) text.textContent = `Pregunta ${index + 1} de ${QA_QUESTIONS.length}`;
}

function qaNext() {
  if (!isCurrentAnswered()) return;

  if (currentQ === QA_QUESTIONS.length - 1) {
    // Show confirm modal
    Modal.open('confirm-qa-modal');
    return;
  }
  currentQ++;
  renderQuestion(currentQ);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function qaBack() {
  if (currentQ === 0) return;
  currentQ--;
  renderQuestion(currentQ);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  renderQuestion(0);
});
