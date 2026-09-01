(() => {
  'use strict';

  const API_PRIMARY = 'https://parallelum.com.br/fipe/api/v1';
  const API_FALLBACK = 'https://brasilapi.com.br/api/fipe';
  const $ = id => document.getElementById(id);
  let requestVersion = 0;
  let vehicle = { brand: '', brandLabel: '', model: '', modelLabel: '', year: '', yearLabel: '', reference: null };

  const GENERAL_BANKS = [
    { id: 'caixa', name: 'Caixa', legal: 'Caixa Econômica Federal', rate: 1.03, color: '#2f9fe4', note: 'Taxa média BCB do período' },
    { id: 'inter', name: 'Banco Inter', legal: 'Banco Inter', rate: 1.71, color: '#ff7a22', note: 'Operação digital' },
    { id: 'bradesco', name: 'Bradesco', legal: 'Banco Bradesco', rate: 1.76, color: '#e62b55', note: 'Taxa média BCB do período' },
    { id: 'bb', name: 'Banco do Brasil', legal: 'Banco do Brasil', rate: 1.80, color: '#f4d52d', note: 'Taxa média BCB do período' },
    { id: 'santander', name: 'Santander', legal: 'Santander SCFI', rate: 1.80, color: '#ec1c2e', note: 'Taxa média BCB do período' },
    { id: 'c6', name: 'C6 Bank', legal: 'Banco C6', rate: 1.95, color: '#8d8d94', note: 'Taxa média BCB do período' },
    { id: 'porto', name: 'Porto Bank', legal: 'Portoseg CFI', rate: 1.98, color: '#3d84ff', note: 'Taxa média BCB do período' },
    { id: 'itau', name: 'Itaú', legal: 'Itaú Unibanco Holding', rate: 2.07, color: '#ff6b22', note: 'Taxa média BCB do período' },
    { id: 'bv', name: 'Banco BV', legal: 'Banco Votorantim', rate: 2.28, color: '#4b7bff', note: 'Taxa média BCB do período' }
  ];

  const BRAND_BANKS = [
    { match: ['mercedes'], id: 'mercedes', name: 'Mercedes-Benz', legal: 'Banco Mercedes-Benz', rate: 0.76, color: '#b9c3ce' },
    { match: ['bmw', 'mini'], id: 'bmw', name: 'BMW Financeira', legal: 'BMW CFI', rate: 0.94, color: '#4aa3ff' },
    { match: ['renault', 'nissan'], id: 'rci', name: 'Mobilize Financial', legal: 'Banco RCI Brasil', rate: 0.94, color: '#ffda2e' },
    { match: ['chevrolet'], id: 'gm', name: 'Banco GM', legal: 'Banco GM', rate: 1.33, color: '#e2b934' },
    { match: ['hyundai'], id: 'hyundai', name: 'Hyundai Capital', legal: 'Banco Hyundai Capital Brasil', rate: 1.34, color: '#3c70bb' },
    { match: ['fiat', 'jeep', 'peugeot', 'citroën', 'citroen', 'ram'], id: 'stellantis', name: 'Stellantis Financiamentos', legal: 'Stellantis CFI', rate: 1.51, color: '#6f63ff' },
    { match: ['volkswagen', 'audi'], id: 'vw', name: 'Banco Volkswagen', legal: 'Banco Volkswagen', rate: 1.64, color: '#2d78c8' },
    { match: ['toyota', 'lexus'], id: 'toyota', name: 'Banco Toyota', legal: 'Banco Toyota do Brasil', rate: 1.70, color: '#f04444' }
  ];

  const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const parseMoney = value => Number(String(value || '').replace(/\D/g, ''));
  const apiMoney = value => Number(String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  const isZeroKm = value => /^32000(?:-|$)/.test(String(value || ''));

  async function fetchJSON(primaryPath, fallbackPath) {
    async function request(url) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      try {
        const response = await fetch(url, { signal: controller.signal, referrerPolicy: 'strict-origin-when-cross-origin' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      } finally { clearTimeout(timer); }
    }
    try { return await request(API_PRIMARY + primaryPath); }
    catch (_) { return request(API_FALLBACK + fallbackPath); }
  }

  const normalizedItems = value => (Array.isArray(value) ? value : (value.modelos || value.anos || []))
    .map(item => ({ value: String(item.codigo ?? item.valor ?? ''), label: String(item.nome ?? item.modelo ?? '') }))
    .filter(item => item.value && item.label);

  function normalizedYears(value) {
    return normalizedItems(value).map(item => {
      if (!isZeroKm(item.value) && !/^32000\b/.test(item.label)) return item;
      const fuel = item.label.replace(/^32000\s*/i, '').trim();
      return { ...item, label: `0 km (novo)${fuel ? ` · ${fuel}` : ''}` };
    }).sort((a, b) => isZeroKm(a.value) ? -1 : isZeroKm(b.value) ? 1 : b.label.localeCompare(a.label, 'pt-BR', { numeric: true }));
  }

  function replaceOptions(select, placeholder, items = []) {
    select.replaceChildren();
    const initial = document.createElement('option');
    initial.value = '';
    initial.textContent = placeholder;
    select.append(initial);
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.append(option);
    });
  }

  function showError(message) {
    $('finance-error').textContent = message;
    $('finance-error').style.display = 'block';
  }

  function clearError() {
    $('finance-error').textContent = '';
    $('finance-error').style.display = 'none';
  }

  async function loadBrands() {
    try {
      const data = await fetchJSON('/carros/marcas', '/marcas/v1/carros');
      replaceOptions($('finance-brand'), 'Selecione a marca', normalizedItems(data).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')));
    } catch (_) {
      replaceOptions($('finance-brand'), 'Fonte indisponível');
      showError('Não foi possível carregar as marcas agora. Tente novamente em instantes.');
    }
  }

  async function loadModels() {
    const token = ++requestVersion;
    clearError();
    vehicle = { brand: $('finance-brand').value, brandLabel: $('finance-brand').selectedOptions[0]?.textContent || '', model: '', modelLabel: '', year: '', yearLabel: '', reference: null };
    replaceOptions($('finance-year'), 'Selecione o modelo');
    $('finance-year').disabled = true;
    $('finance-model').disabled = true;
    $('finance-submit').disabled = true;
    if (!vehicle.brand) return replaceOptions($('finance-model'), 'Selecione a marca');
    replaceOptions($('finance-model'), 'Carregando modelos…');
    try {
      const data = await fetchJSON(`/carros/marcas/${vehicle.brand}/modelos`, `/veiculos/v1/carros/${vehicle.brand}`);
      if (token !== requestVersion) return;
      replaceOptions($('finance-model'), 'Selecione o modelo', normalizedItems(data).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')));
      $('finance-model').disabled = false;
      $('finance-form-status').textContent = '2 · Escolha modelo e ano';
    } catch (_) { showError('Não foi possível carregar os modelos desta marca.'); }
  }

  async function loadYears() {
    const token = ++requestVersion;
    clearError();
    vehicle.model = $('finance-model').value;
    vehicle.modelLabel = $('finance-model').selectedOptions[0]?.textContent || '';
    vehicle.year = '';
    vehicle.reference = null;
    $('finance-submit').disabled = true;
    $('finance-year').disabled = true;
    if (!vehicle.model) return replaceOptions($('finance-year'), 'Selecione o modelo');
    replaceOptions($('finance-year'), 'Carregando anos…');
    try {
      const data = await fetchJSON(`/carros/marcas/${vehicle.brand}/modelos/${vehicle.model}/anos`, `/anos/v1/carros/${vehicle.brand}/${vehicle.model}`);
      if (token !== requestVersion) return;
      replaceOptions($('finance-year'), 'Selecione o ano/modelo', normalizedYears(data));
      $('finance-year').disabled = false;
    } catch (_) { showError('Não foi possível carregar os anos desta versão.'); }
  }

  async function loadReference() {
    const token = ++requestVersion;
    clearError();
    vehicle.year = $('finance-year').value;
    vehicle.yearLabel = $('finance-year').selectedOptions[0]?.textContent || '';
    vehicle.reference = null;
    $('finance-submit').disabled = true;
    if (!vehicle.year) return;
    $('finance-form-status').textContent = 'Carregando preço FIPE…';
    try {
      const data = await fetchJSON(`/carros/marcas/${vehicle.brand}/modelos/${vehicle.model}/anos/${vehicle.year}`, `/detalhes/v1/carros/${vehicle.brand}/${vehicle.model}/${vehicle.year}`);
      if (token !== requestVersion) return;
      vehicle.reference = data;
      const price = apiMoney(data.Valor ?? data.valor ?? '');
      $('finance-price').value = price ? price.toLocaleString('pt-BR') : '';
      $('finance-form-status').textContent = '3 · Ajuste entrada e prazo';
      $('finance-submit').disabled = !price;
      updatePreview();
    } catch (_) { showError('A fonte não retornou o valor desta versão. Nenhuma parcela foi estimada.'); }
  }

  function selectedTerm() {
    return Number(document.querySelector('input[name="finance-term"]:checked')?.value || 48);
  }

  function modelYear() {
    if (isZeroKm(vehicle.year)) return new Date().getFullYear();
    return Number(String(vehicle.year).match(/^\d{4}/)?.[0]) || new Date().getFullYear();
  }

  function updatePreview() {
    const price = parseMoney($('finance-price').value);
    const percent = Number($('finance-entry').value);
    const entry = Math.round(price * percent / 100);
    $('finance-entry-percent').textContent = `${percent}%`;
    $('finance-entry-money').textContent = money(entry);
    $('finance-principal').textContent = price ? money(price - entry) : '—';
    $('finance-vehicle-label').textContent = vehicle.modelLabel ? `${vehicle.brandLabel} ${vehicle.modelLabel}` : 'Selecione acima';
    const age = Math.max(0, new Date().getFullYear() - modelYear());
    $('finance-age-label').textContent = vehicle.year ? (age === 0 ? '0 km / até 1 ano' : `${age} ${age === 1 ? 'ano' : 'anos'}`) : '—';
  }

  function pmt(principal, monthlyRate, months) {
    const rate = monthlyRate / 100;
    if (!rate) return principal / months;
    const factor = Math.pow(1 + rate, months);
    return principal * rate * factor / (factor - 1);
  }

  function banksForVehicle() {
    const normalized = vehicle.brandLabel.toLocaleLowerCase('pt-BR');
    const matched = BRAND_BANKS.find(bank => bank.match.some(term => normalized.includes(term)));
    const banks = [...GENERAL_BANKS];
    if (matched) banks.push({ ...matched, note: `Financeira ligada à marca ${vehicle.brandLabel}` });
    return banks.sort((a, b) => a.rate - b.rate).slice(0, 8);
  }

  function createBankCard(bank, data, index) {
    const card = document.createElement('article');
    card.className = `finance-bank-card${index === 0 ? ' is-best' : ''}`;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <div class="finance-bank-card__rank">${index === 0 ? 'MENOR PARCELA ESTIMADA' : `OPÇÃO ${String(index + 1).padStart(2, '0')}`}</div>
      <div class="finance-bank-card__main">
        <span class="finance-bank-logo" style="--bank-color:${bank.color}">${bank.name.slice(0, 2).toUpperCase()}</span>
        <div class="finance-bank-name"><h3>${bank.name}</h3><p>${bank.note} · ${bank.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% a.m.</p></div>
        <div class="finance-bank-installment"><b>${money(data.installment)}</b><span>por mês</span></div>
      </div>
      <div class="finance-bank-card__details">
        <div><span>Financiado</span><b>${money(data.principal)}</b></div>
        <div><span>Juros estimados</span><b>${money(data.interest)}</b></div>
        <div><span>Total das parcelas</span><b>${money(data.total)}</b></div>
        <div><span>Prazo</span><b>${data.months} meses</b></div>
      </div>
      <div class="finance-cost-track"><span style="width:${Math.min(100, 38 + (bank.rate - 1) * 38)}%"></span></div>`;
    return card;
  }

  function simulate(event) {
    event.preventDefault();
    clearError();
    const price = parseMoney($('finance-price').value);
    if (!vehicle.reference || !vehicle.year) return showError('Selecione marca, modelo e ano/modelo.');
    if (!price || price < 1000) return showError('Informe o valor do veículo.');
    const entryPercent = Number($('finance-entry').value);
    const entry = price * entryPercent / 100;
    const principal = price - entry;
    const months = selectedTerm();
    const results = banksForVehicle().map(bank => {
      const installment = pmt(principal, bank.rate, months);
      const total = installment * months;
      return { bank, installment, total, interest: total - principal, principal, months };
    }).sort((a, b) => a.installment - b.installment);

    const list = $('finance-bank-list');
    list.replaceChildren();
    results.forEach((result, index) => list.append(createBankCard(result.bank, result, index)));
    const saving = results.at(-1).total - results[0].total;
    $('finance-result-title').textContent = `${vehicle.brandLabel} ${vehicle.modelLabel} · ${vehicle.yearLabel}`;
    $('finance-result-summary').textContent = `${money(price)} · entrada de ${money(entry)} (${entryPercent}%) · ${months} meses`;
    $('finance-saving').textContent = money(saving);
    const age = Math.max(0, new Date().getFullYear() - modelYear());
    const warning = $('finance-age-warning');
    warning.hidden = age <= 10;
    if (age > 10) warning.textContent = `Este veículo tem cerca de ${age} anos. A tabela do Banco Central não informa limite de idade por instituição; confirme elegibilidade antes de interpretar qualquer cenário.`;
    $('finance-result').classList.add('is-visible');
    $('finance-result').focus();
  }

  function formatPrice(event) {
    const digits = event.target.value.replace(/\D/g, '');
    event.target.value = digits ? Number(digits).toLocaleString('pt-BR') : '';
    updatePreview();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('finance-form')) return;
    $('finance-brand').addEventListener('change', loadModels);
    $('finance-model').addEventListener('change', loadYears);
    $('finance-year').addEventListener('change', loadReference);
    $('finance-price').addEventListener('input', formatPrice);
    $('finance-entry').addEventListener('input', updatePreview);
    document.querySelectorAll('input[name="finance-term"]').forEach(input => input.addEventListener('change', updatePreview));
    $('finance-form').addEventListener('submit', simulate);
    updatePreview();
    loadBrands();
  });
})();
