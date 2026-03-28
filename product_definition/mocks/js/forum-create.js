/* ============================================================
   forum-create.js — Create Forum page logic
   ============================================================ */
'use strict';

// Character counter
function initCharCounter(textareaId, counterId) {
  const textarea = document.getElementById(textareaId);
  const counter  = document.getElementById(counterId);
  if (!textarea || !counter) return;

  function update() {
    counter.textContent = `${textarea.value.length.toLocaleString()} caracteres`;
  }
  textarea.addEventListener('input', update);
  update();
}

// Agent cards template
const AGENT_COLORS = ['coral', 'sky', 'emerald', 'amber', 'violet', 'rose'];
const AI_MODELS_HTML = {
  copilot: `
    <optgroup label="Copilot SDK">
      <option value="gpt-4.1">GPT-4.1 · Costo: 3x · Ctx: 128k/16k</option>
      <option value="gpt-4.1-mini">GPT-4.1-mini · Costo: 1x · Ctx: 128k/16k</option>
      <option value="gpt-4.1-nano">GPT-4.1-nano · Costo: 0.33x · Ctx: 128k/16k</option>
      <option value="o3">o3 · Costo: 3x · Razonamiento · Ctx: 200k/32k</option>
      <option value="o4-mini">o4-mini · Costo: 1x · Razonamiento · Ctx: 200k/32k</option>
      <option value="claude-sonnet-copilot">Claude Sonnet 4.5 · Costo: 3x · Ctx: 200k/16k</option>
    </optgroup>`,
  openrouter: `
    <optgroup label="OpenRouter">
      <option value="claude-opus-or">Claude Opus 4.5 · $15/$75 · Ctx: 200k/32k</option>
      <option value="claude-sonnet-or">Claude Sonnet 4.5 · $3/$15 · Ctx: 200k/16k</option>
      <option value="gemini-2-pro">Gemini 2.0 Pro · $1.25/$5 · Ctx: 1M/8k</option>
      <option value="gemini-2-flash">Gemini 2.0 Flash · $0.10/$0.40 · Ctx: 1M/8k</option>
      <option value="mistral-large">Mistral Large · $2/$6 · Ctx: 128k/4k</option>
      <option value="llama-3.3">Llama 3.3 70B · $0.23/$0.40 · Ctx: 128k/4k</option>
      <option value="qwen-2.5-coder">Qwen 2.5 Coder 32B · $0.07/$0.16 · Ctx: 128k/8k</option>
    </optgroup>`,
  deepseek: `
    <optgroup label="DeepSeek">
      <option value="deepseek-v3">DeepSeek-V3 · $0.27/$1.10 · Ctx: 64k/8k</option>
      <option value="deepseek-r1">DeepSeek-R1 · $0.55/$2.19 · Ctx: 64k/8k · Razonamiento</option>
    </optgroup>`
};

function makeAgentCard(index, agentNum) {
  const color = AGENT_COLORS[index % AGENT_COLORS.length];
  const letter = String.fromCharCode(65 + index); // A, B, C...
  const swatches = AGENT_COLORS.map(c =>
    `<div class="color-swatch${c === color ? ' selected' : ''}" data-color="${c}"></div>`
  ).join('');

  return `
    <div class="agent-config-card" id="agent-card-${agentNum}">
      <div class="agent-config-card__header">
        <div class="agent-avatar agent-avatar--lg" id="avatar-${agentNum}" data-color="${color}">${letter}</div>
        <div style="flex: 1;">
          <div class="agent-config-card__number">Agente ${agentNum}</div>
          <div class="color-picker mt-2" data-target="avatar-${agentNum}">
            ${swatches}
          </div>
        </div>
      </div>
      <div class="agent-config-card__fields">
        <div class="form-group">
          <label class="form-label">Nombre del Agente</label>
          <input type="text" class="form-input" placeholder="ej. Architect, Crítico..." />
        </div>
        <div class="form-group">
          <label class="form-label">Proveedor de IA</label>
          <select class="form-select agent-provider-select" data-agent="${agentNum}">
            <option value="">Seleccionar proveedor...</option>
            <option value="copilot">Copilot SDK</option>
            <option value="openrouter">OpenRouter</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label">Modelo de IA</label>
          <select class="form-select agent-model-select" id="model-select-${agentNum}">
            <option value="">— Selecciona primero un proveedor —</option>
          </select>
        </div>
      </div>
    </div>`;
}

window._renderAgentCards = function(count) {
  const container = document.getElementById('agents-container');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    container.insertAdjacentHTML('beforeend', makeAgentCard(i, i + 1));
  }
  // Re-init color pickers and provider selects
  initColorPickers();
  initProviderSelects();
};

function initProviderSelects() {
  document.querySelectorAll('.agent-provider-select').forEach(select => {
    select.addEventListener('change', function() {
      const agentNum = this.dataset.agent;
      const modelSelect = document.getElementById(`model-select-${agentNum}`);
      if (!modelSelect) return;
      const provider = this.value;
      if (provider && AI_MODELS_HTML[provider]) {
        modelSelect.innerHTML = AI_MODELS_HTML[provider];
      } else {
        modelSelect.innerHTML = '<option value="">— Selecciona primero un proveedor —</option>';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCharCounter('idea-text', 'idea-counter');
  initProviderSelects();
});
