(() => {
  'use strict';

  const API_PRIMARY = 'https://parallelum.com.br/fipe/api/v1';
  const API_FALLBACK = 'https://brasilapi.com.br/api/fipe';
  const $ = id => document.getElementById(id);
  let selection = { brand: '', model: '', year: '', reference: null };
  let requestVersion = 0;

  const money = value => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  });

  const numberFromInput = value => Number(String(value || '').replace(/\D/g, ''));

  const brlFromAPI = value => Number(
    String(value || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function showError(message) {
    const box = $('fipe-error');
    if (!box) return;
    box.textContent = message;
    box.style.display = 'block';
    box.focus();
  }

  function clearError() {
    const box = $('fipe-error');
    if (!box) return;
    box.textContent = '';
    box.style.display = 'none';
  }

  function setBusy(progress) {
    const bar = $('fipe-loading');
    const fill = $('fipe-loading-fill');
    if (!bar || !fill) return;
    if (!progress) {
      bar.style.display = 'none';
      fill.style.width = '0%';
      return;
    }
    bar.style.display = 'block';
    fill.style.width = `${progress}%`;
  }

  async function fetchJSON(primaryPath, fallbackPath) {
    async function request(url) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      try {
        const response = await fetch(url, { signal: controller.signal, referrerPolicy: 'strict-origin-when-cross-origin' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } finally {
        clearTimeout(timer);
      }
    }

    try {
      return await request(API_PRIMARY + primaryPath);
    } catch (_) {
      return request(API_FALLBACK + fallbackPath);
    }
  }

  const normalizedItems = value => (Array.isArray(value) ? value : (value.modelos || value.anos || []))
    .map(item => ({
      value: String(item.codigo ?? item.valor ?? ''),
      label: String(item.nome ?? item.modelo ?? '')
    }))
    .filter(item => item.value && item.label);

  const isZeroKmCode = value => /^32000(?:-|$)/.test(String(value || ''));

  function normalizedYears(value) {
    return normalizedItems(value)
      .map(item => {
        if (!isZeroKmCode(item.value) && !/^32000\b/.test(item.label)) return item;
        const fuel = item.label.replace(/^32000\s*/i, '').trim();
        return { ...item, label: `0 km (novo)${fuel ? ` · ${fuel}` : ''}` };
      })
      .sort((a, b) => {
        if (isZeroKmCode(a.value)) return -1;
        if (isZeroKmCode(b.value)) return 1;
        return b.label.localeCompare(a.label, 'pt-BR', { numeric: true });
      });
  }

  function referenceYear(year, fuel) {
    if (Number(year) === 32000 || isZeroKmCode(year)) return `0 km (novo)${fuel ? ` · ${fuel}` : ''}`;
    return String(year || 'Ano não informado');
  }

  function clearResult() {
    $('fipe-result')?.classList.remove('is-visible');
  }

  function replaceOptions(select, placeholder, items = []) {
    select.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    select.append(first);
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.append(option);
    }
  }

  async function loadBrands() {
    const select = $('fipe-brand');
    if (!select) return;
    replaceOptions(select, 'Carregando marcas…');
    try {
      const data = await fetchJSON('/carros/marcas', '/marcas/v1/carros');
      const items = normalizedItems(data).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      replaceOptions(select, 'Selecione a marca', items);
    } catch (_) {
      replaceOptions(select, 'Não foi possível carregar');
      showError('A fonte de referência não respondeu. Tente novamente em alguns instantes ou consulte diretamente o portal oficial da FIPE.');
    }
  }

  async function loadModels() {
    const token = ++requestVersion;
    clearError();
    clearResult();
    setBusy(0);
    selection.brand = $('fipe-brand').value;
    selection.model = '';
    selection.year = '';
    selection.reference = null;
    const model = $('fipe-model');
    const year = $('fipe-year');
    const submit = $('fipe-submit');
    replaceOptions(year, 'Selecione primeiro o modelo');
    year.disabled = true;
    submit.disabled = true;
    if (!selection.brand) {
      replaceOptions(model, 'Selecione primeiro a marca');
      model.disabled = true;
      return;
    }
    model.disabled = true;
    replaceOptions(model, 'Carregando modelos…');
    try {
      const data = await fetchJSON(`/carros/marcas/${selection.brand}/modelos`, `/veiculos/v1/carros/${selection.brand}`);
      if (token !== requestVersion) return;
      const items = normalizedItems(data).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      replaceOptions(model, 'Selecione o modelo', items);
      model.disabled = false;
    } catch (_) {
      if (token !== requestVersion) return;
      replaceOptions(model, 'Erro ao carregar modelos');
      showError('Não conseguimos carregar os modelos agora. Nenhum resultado foi estimado.');
    }
  }

  async function loadYears() {
    const token = ++requestVersion;
    clearError();
    clearResult();
    setBusy(0);
    selection.model = $('fipe-model').value;
    selection.year = '';
    selection.reference = null;
    const year = $('fipe-year');
    $('fipe-submit').disabled = true;
    if (!selection.model) {
      replaceOptions(year, 'Selecione primeiro o modelo');
      year.disabled = true;
      return;
    }
    year.disabled = true;
    replaceOptions(year, 'Carregando versões e anos…');
    try {
      const data = await fetchJSON(
        `/carros/marcas/${selection.brand}/modelos/${selection.model}/anos`,
        `/anos/v1/carros/${selection.brand}/${selection.model}`
      );
      if (token !== requestVersion) return;
      const items = normalizedYears(data);
      replaceOptions(year, 'Selecione o ano/modelo', items);
      year.disabled = false;
    } catch (_) {
      if (token !== requestVersion) return;
      replaceOptions(year, 'Erro ao carregar anos');
      showError('Não conseguimos carregar os anos disponíveis para essa versão.');
    }
  }

  async function loadReference() {
    const token = ++requestVersion;
    clearError();
    clearResult();
    selection.year = $('fipe-year').value;
    selection.reference = null;
    $('fipe-submit').disabled = true;
    if (!selection.year) return;
    setBusy(45);
    try {
      const data = await fetchJSON(
        `/carros/marcas/${selection.brand}/modelos/${selection.model}/anos/${selection.year}`,
        `/detalhes/v1/carros/${selection.brand}/${selection.model}/${selection.year}`
      );
      if (token !== requestVersion) return;
      selection.reference = {
        price: data.Valor ?? data.valor ?? '',
        brand: data.Marca ?? data.marca ?? '',
        model: data.Modelo ?? data.modelo ?? '',
        year: referenceYear(data.AnoModelo ?? data.anoModelo ?? '', data.Combustivel ?? data.combustivel ?? ''),
        month: data.MesReferencia ?? data.mesReferencia ?? '',
        code: data.CodigoFipe ?? data.codigoFipe ?? ''
      };
      setBusy(100);
      $('fipe-submit').disabled = false;
      setTimeout(() => setBusy(0), 350);
    } catch (_) {
      if (token !== requestVersion) return;
      setBusy(0);
      showError('A consulta de referência falhou. O botão continuará desativado para evitar um resultado incompleto.');
    }
  }

  function renderResult(event) {
    event.preventDefault();
    clearError();
    if (!selection.reference) return showError('Selecione marca, modelo e ano/modelo antes de comparar.');
    const asked = numberFromInput($('fipe-asked').value);
    const mileage = numberFromInput($('fipe-mileage').value);
    const reference = brlFromAPI(selection.reference.price);
    if (!asked || asked < 1000) return showError('Informe um preço de anúncio válido.');
    if (!mileage && !isZeroKmCode(selection.year)) return showError('Informe a quilometragem anunciada.');
    if (!reference) return showError('A fonte não retornou um valor de referência válido.');

    const difference = asked - reference;
    const percentage = (difference / reference) * 100;
    const direction = difference === 0 ? 'igual à' : difference > 0 ? 'acima da' : 'abaixo da';
    const modelYear = Number(String(selection.year).match(/^\d{4}/)?.[0]);
    const age = isZeroKmCode(selection.year) ? 0 : Math.max(1, new Date().getFullYear() - modelYear);
    const annualMileage = age ? Math.round(mileage / age) : mileage;
    let mileageLabel = isZeroKmCode(selection.year) ? '0 km declarado' : `${annualMileage.toLocaleString('pt-BR')} km/ano`;
    let mileageNote = 'A FIPE não corrige o valor pela quilometragem. Confirme hodômetro, histórico e desgaste físico.';
    if (!isZeroKmCode(selection.year)) {
      if (annualMileage < 8000) mileageNote = 'Uso anual baixo declarado. Exija histórico que sustente a quilometragem e não aceite ágio apenas por esse dado.';
      else if (annualMileage <= 18000) mileageNote = 'Uso anual dentro da faixa editorial de triagem. Estado, manutenção e histórico continuam decisivos.';
      else if (annualMileage <= 28000) mileageNote = 'Uso anual elevado. Inspeção, manutenção e itens de desgaste merecem atenção reforçada.';
      else mileageNote = 'Uso anual intenso. Investigue finalidade anterior, manutenção e desgaste antes de interpretar o desconto.';
    }
    const priceAction = difference > 0
      ? 'Peça evidências que expliquem o valor: conservação, garantia, manutenção, opcionais e baixa oferta local.'
      : difference < 0
        ? 'Investigue por que o preço está menor: versão, débitos, histórico, condição mecânica, sinistro, leilão e identidade do vendedor.'
        : 'Mesmo preço da referência não significa exemplar aprovado. Histórico, condição e custos imediatos continuam sem verificação.';
    const action = `${priceAction} ${mileageNote}`;

    setText('result-vehicle', `${selection.reference.brand} ${selection.reference.model} · ${selection.reference.year}`);
    setText('result-reference', money(reference));
    setText('result-asked', money(asked));
    setText('result-difference', `${difference > 0 ? '+' : difference < 0 ? '−' : ''}${money(Math.abs(difference))}`);
    setText('result-mileage', mileageLabel);
    setText('result-percentage', `${Math.abs(percentage).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% ${direction} referência`);
    setText('result-month', selection.reference.month || 'mês não informado pela fonte');
    setText('result-code', selection.reference.code || 'não informado');
    setText('result-action', action);
    const panel = $('fipe-result');
    panel.classList.add('is-visible');
    panel.focus();
  }

  function formatCurrencyInput(event) {
    const digits = event.target.value.replace(/\D/g, '');
    event.target.value = digits ? Number(digits).toLocaleString('pt-BR') : '';
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('fipe-form');
    if (!form) return;
    $('fipe-brand').addEventListener('change', loadModels);
    $('fipe-model').addEventListener('change', loadYears);
    $('fipe-year').addEventListener('change', loadReference);
    $('fipe-asked').addEventListener('input', formatCurrencyInput);
    $('fipe-mileage').addEventListener('input', formatCurrencyInput);
    form.addEventListener('submit', renderResult);
    loadBrands();
  });
})();
