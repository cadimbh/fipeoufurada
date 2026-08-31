(() => {
  'use strict';
  const STORAGE_KEY = 'fipeoufurada:dossie:v1';
  const $ = id => document.getElementById(id);

  function fields() {
    return [...document.querySelectorAll('[data-save]')];
  }

  function checks() {
    return [...document.querySelectorAll('[data-check]')];
  }

  function fieldKey(field, index) {
    return field.id || `check-${index}`;
  }

  function serialize() {
    const data = {};
    fields().forEach((field, index) => {
      data[fieldKey(field, index)] = field.type === 'checkbox' ? field.checked : field.value;
    });
    return data;
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    } catch (_) {
      feedback('Seu navegador bloqueou o salvamento local. O caderno continuará funcionando nesta página.');
    }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      fields().forEach((field, index) => {
        const key = fieldKey(field, index);
        if (!(key in saved)) return;
        if (field.type === 'checkbox') field.checked = Boolean(saved[key]);
        else field.value = String(saved[key] ?? '');
      });
    } catch (_) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* armazenamento indisponível */ }
    }
  }

  function update() {
    const all = checks();
    const done = all.filter(check => check.checked);
    const essentials = all.filter(check => check.dataset.priority === 'essential' && !check.checked);
    const percent = all.length ? Math.round((done.length / all.length) * 100) : 0;
    $('dossier-progress').style.width = `${percent}%`;
    $('dossier-progress-label').textContent = `${done.length} de ${all.length} verificações registradas`;
    $('dossier-pending-label').textContent = essentials.length
      ? essentials.length === 1
        ? '1 validação essencial ainda aberta.'
        : `${essentials.length} validações essenciais ainda abertas.`
      : 'Nenhuma validação essencial está aberta — ainda assim, revise a qualidade das evidências.';

    if (!done.length) {
      $('dossier-summary').textContent = 'Marque os itens já verificados. O resumo destacará as validações essenciais que continuam abertas.';
    } else if (!essentials.length) {
      $('dossier-summary').textContent = 'Todas as validações marcadas como essenciais foram registradas. Isso não aprova o veículo: releia laudos, consultas, custos e o acordo antes de decidir.';
    } else {
      const pending = essentials.slice(0, 8).map(check => check.closest('.check-row').querySelector('b').textContent);
      const remaining = essentials.length - pending.length;
      $('dossier-summary').textContent = `Pendências essenciais: ${pending.join('; ')}${remaining > 0 ? `; e mais ${remaining}` : ''}.`;
    }
    persist();
  }

  function feedback(message) {
    const node = $('dossier-feedback');
    node.textContent = message;
    setTimeout(() => { if (node.textContent === message) node.textContent = ''; }, 5000);
  }

  async function copySummary() {
    const vehicle = $('dossier-vehicle').value.trim() || 'veículo não identificado';
    const city = $('dossier-city').value.trim();
    const price = $('dossier-price').value.trim();
    const done = checks().filter(check => check.checked).length;
    const essentialPending = checks()
      .filter(check => check.dataset.priority === 'essential' && !check.checked)
      .map(check => `- ${check.closest('.check-row').querySelector('b').textContent}`);
    const notes = $('dossier-notes').value.trim();
    const text = [
      `Dossiê de compra — ${vehicle}`,
      city ? `Cidade: ${city}` : '',
      price ? `Preço anunciado: R$ ${price}` : '',
      `Verificações registradas: ${done}/${checks().length}`,
      '',
      'Pendências essenciais:',
      essentialPending.length ? essentialPending.join('\n') : '- Nenhuma pendência essencial marcada como aberta',
      notes ? `\nNotas:\n${notes}` : '',
      '',
      'Gerado no FIPE ou Furada? — este resumo não é laudo nem aprovação do veículo.'
    ].filter(Boolean).join('\n');

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API indisponível');
      await navigator.clipboard.writeText(text);
      feedback('Resumo copiado. Revise o texto antes de compartilhar.');
    } catch (_) {
      feedback('Não foi possível copiar automaticamente. Use a impressão para salvar o resumo.');
    }
  }

  function clearDossier() {
    if (!window.confirm('Limpar todos os campos e verificações salvos neste navegador?')) return;
    fields().forEach(field => {
      if (field.type === 'checkbox') field.checked = false;
      else field.value = '';
    });
    localStorage.removeItem(STORAGE_KEY);
    update();
    feedback('Caderno local limpo.');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('dossier-form')) return;
    restore();
    fields().forEach(field => field.addEventListener(field.type === 'checkbox' ? 'change' : 'input', update));
    $('dossier-print').addEventListener('click', () => window.print());
    $('dossier-copy').addEventListener('click', copySummary);
    $('dossier-reset').addEventListener('click', clearDossier);
    update();
  });
})();
