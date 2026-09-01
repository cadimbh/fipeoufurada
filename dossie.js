(() => {
  'use strict';

  const STORAGE_KEY = 'fipeoufurada:checklist:v2';
  const $ = id => document.getElementById(id);
  let currentStep = 0;

  const fields = () => [...document.querySelectorAll('[data-save]')];
  const checks = () => [...document.querySelectorAll('[data-check]')];
  const steps = () => [...document.querySelectorAll('[data-step]')];

  function persist() {
    const data = {};
    fields().forEach(field => { data[field.id] = field.type === 'checkbox' ? field.checked : field.value; });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { feedback('O navegador bloqueou o salvamento local.'); }
  }

  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      fields().forEach(field => {
        if (!(field.id in data)) return;
        if (field.type === 'checkbox') field.checked = Boolean(data[field.id]);
        else field.value = String(data[field.id] ?? '');
      });
    } catch (_) { localStorage.removeItem(STORAGE_KEY); }
  }

  function checkTitle(check) {
    return check.closest('.dossier-check').querySelector('b').textContent;
  }

  function update() {
    const all = checks();
    const done = all.filter(item => item.checked);
    const essentialPending = all.filter(item => item.dataset.priority === 'essential' && !item.checked);
    const percent = Math.round((done.length / all.length) * 100);
    $('dossier-progress').style.width = `${percent}%`;
    $('dossier-progress-label').textContent = `${done.length} de ${all.length} concluídas`;
    $('dossier-score').textContent = `${percent}%`;

    if (!done.length) {
      $('dossier-status').textContent = 'Comece pelo carro';
      $('dossier-summary').textContent = 'Marque somente o que já foi confirmado por documento, consulta ou avaliação.';
    } else if (essentialPending.length) {
      $('dossier-status').textContent = `${essentialPending.length} ${essentialPending.length === 1 ? 'ponto essencial aberto' : 'pontos essenciais abertos'}`;
      $('dossier-summary').textContent = 'Ainda não é hora de concluir. Use a lista abaixo como próximo roteiro.';
    } else {
      $('dossier-status').textContent = 'Checklist essencial concluído';
      $('dossier-summary').textContent = 'As etapas essenciais foram registradas. Releia as evidências e condições antes de pagar.';
    }

    const list = $('dossier-pending-list');
    list.replaceChildren();
    const pending = essentialPending.length ? essentialPending : all.filter(item => !item.checked);
    if (!pending.length) {
      const li = document.createElement('li');
      li.textContent = 'Nenhuma pendência marcada como aberta.';
      list.append(li);
    } else {
      pending.slice(0, 5).forEach(check => {
        const li = document.createElement('li');
        li.textContent = checkTitle(check);
        list.append(li);
      });
      if (pending.length > 5) {
        const li = document.createElement('li');
        li.textContent = `E mais ${pending.length - 5}.`;
        list.append(li);
      }
    }
    $('dossier-pending-label').textContent = essentialPending.length ? 'Priorize agora' : 'Itens restantes';
    persist();
  }

  function showStep(index) {
    currentStep = Math.max(0, Math.min(steps().length - 1, index));
    steps().forEach((step, position) => {
      const active = position === currentStep;
      step.hidden = !active;
      step.classList.toggle('is-active', active);
    });
    document.querySelectorAll('[data-step-button]').forEach((button, position) => {
      button.classList.toggle('is-active', position === currentStep);
      button.classList.toggle('is-done', position < currentStep);
      button.setAttribute('aria-current', position === currentStep ? 'step' : 'false');
    });
    $('dossier-step-label').textContent = `Etapa ${currentStep + 1} de ${steps().length}`;
    $('dossier-prev').disabled = currentStep === 0;
    $('dossier-next').textContent = currentStep === steps().length - 1 ? 'Ver resumo →' : 'Próxima etapa →';
    if (window.matchMedia('(max-width: 760px)').matches) document.querySelector('.dossier-app').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function feedback(message) {
    $('dossier-feedback').textContent = message;
    setTimeout(() => { if ($('dossier-feedback').textContent === message) $('dossier-feedback').textContent = ''; }, 4500);
  }

  function summaryText() {
    const vehicle = $('dossier-vehicle').value.trim() || 'veículo não identificado';
    const completed = checks().filter(item => item.checked).length;
    const pending = checks().filter(item => item.dataset.priority === 'essential' && !item.checked).map(checkTitle);
    return [
      `CHECKLIST DE COMPRA — ${vehicle}`,
      $('dossier-price').value ? `Preço: R$ ${$('dossier-price').value}` : '',
      $('dossier-mileage').value ? `Quilometragem: ${$('dossier-mileage').value} km` : '',
      $('dossier-city').value ? `Cidade: ${$('dossier-city').value}` : '',
      `Progresso: ${completed}/${checks().length}`,
      '',
      'PENDÊNCIAS ESSENCIAIS',
      ...(pending.length ? pending.map(item => `• ${item}`) : ['• Nenhuma pendência essencial marcada como aberta']),
      $('dossier-notes').value.trim() ? `\nANOTAÇÃO\n${$('dossier-notes').value.trim()}` : '',
      '',
      'Organizado no FIPE ou Furada? — não substitui laudo, consulta oficial ou contrato.'
    ].filter(Boolean).join('\n');
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText());
      feedback('Resumo copiado.');
    } catch (_) { feedback('Não foi possível copiar; use “Salvar em PDF”.'); }
  }

  function reset() {
    if (!window.confirm('Limpar o checklist salvo neste navegador?')) return;
    fields().forEach(field => { if (field.type === 'checkbox') field.checked = false; else field.value = ''; });
    localStorage.removeItem(STORAGE_KEY);
    showStep(0);
    update();
    feedback('Checklist limpo.');
  }

  function formatNumber(event) {
    const digits = event.target.value.replace(/\D/g, '');
    event.target.value = digits ? Number(digits).toLocaleString('pt-BR') : '';
    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('dossier-form')) return;
    restore();
    fields().forEach(field => field.addEventListener(field.type === 'checkbox' ? 'change' : 'input', update));
    ['dossier-price', 'dossier-mileage'].forEach(id => $(id).addEventListener('input', formatNumber));
    document.querySelectorAll('[data-step-button]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.stepButton))));
    $('dossier-prev').addEventListener('click', () => showStep(currentStep - 1));
    $('dossier-next').addEventListener('click', () => {
      if (currentStep < steps().length - 1) showStep(currentStep + 1);
      else document.querySelector('.dossier-summary').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('dossier-copy').addEventListener('click', copySummary);
    $('dossier-print').addEventListener('click', () => window.print());
    $('dossier-reset').addEventListener('click', reset);
    showStep(0);
    update();
  });
})();
