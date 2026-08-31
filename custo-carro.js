(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const distance = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

  const profiles = {
    light: { label: 'Uso leve', kmMonth: 500, fuelPrice: 6.2, consumption: 13, insurance: .04, taxes: .03, maintenance: .025, depreciation: .08, parking: 40, other: 60 },
    daily: { label: 'Dia a dia', kmMonth: 1000, fuelPrice: 6.2, consumption: 10.5, insurance: .05, taxes: .04, maintenance: .035, depreciation: .10, parking: 150, other: 100 },
    heavy: { label: 'Uso intenso', kmMonth: 1800, fuelPrice: 6.2, consumption: 8.5, insurance: .06, taxes: .04, maintenance: .05, depreciation: .12, parking: 280, other: 180 }
  };

  const moneyFields = ['insurance-year', 'taxes-year', 'maintenance-year', 'parking-month', 'financing-month', 'other-month', 'depreciation-year'];
  const categories = [
    ['Combustível', 'fuel'], ['Seguro', 'insurance'], ['Tributos', 'taxes'], ['Manutenção', 'maintenance'],
    ['Estacionamento', 'parking'], ['Financiamento', 'financing'], ['Outros', 'other'], ['Depreciação', 'depreciation']
  ];
  let applyingPreset = false;

  function readNumber(id) {
    const input = byId(id);
    const raw = input?.value.trim() || '';
    if (!raw) return null;
    const parsed = Number(raw.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function writeNumber(id, value, decimals = 0) {
    const field = byId(id);
    if (field) field.value = Number(value).toFixed(decimals).replace(/\.0+$/, '');
  }

  function selectedProfile() {
    return document.querySelector('input[name="cost-profile"]:checked')?.value || 'daily';
  }

  function applyProfile({ keepVehicle = true } = {}) {
    applyingPreset = true;
    const profile = profiles[selectedProfile()];
    const vehicleValue = readNumber('vehicle-value');
    writeNumber('km-month', profile.kmMonth);
    writeNumber('fuel-price', profile.fuelPrice, 2);
    writeNumber('consumption', profile.consumption, 1);
    writeNumber('parking-month', profile.parking);
    writeNumber('other-month', profile.other);
    if (!keepVehicle) byId('vehicle-value').value = '';
    if (vehicleValue && vehicleValue > 0) applyValueAssumptions(vehicleValue, profile);
    else ['insurance-year', 'taxes-year', 'maintenance-year', 'depreciation-year'].forEach(id => { byId(id).value = ''; });
    byId('financing-month').value = '';
    applyingPreset = false;
    invalidatePreviousResult();
  }

  function applyValueAssumptions(value, profile = profiles[selectedProfile()]) {
    writeNumber('insurance-year', value * profile.insurance);
    writeNumber('taxes-year', value * profile.taxes);
    writeNumber('maintenance-year', value * profile.maintenance);
    writeNumber('depreciation-year', value * profile.depreciation);
  }

  function clearInvalidState() {
    ['vehicle-value', 'km-month', 'fuel-price', 'consumption', ...moneyFields].forEach(id => byId(id)?.removeAttribute('aria-invalid'));
  }

  function showError(message, fieldId) {
    const error = byId('cost-error');
    error.textContent = message;
    error.style.display = 'block';
    byId('cost-result').classList.remove('is-visible');
    if (fieldId) {
      const field = byId(fieldId);
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }

  function hideError() {
    const error = byId('cost-error');
    error.textContent = '';
    error.style.display = 'none';
  }

  function annualRow(prefix, annualValue, included) {
    byId(`${prefix}-annual`).textContent = included ? currency.format(annualValue) : 'Não incluído';
    byId(`${prefix}-monthly`).textContent = included ? currency.format(annualValue / 12) : '—';
  }

  function renderBars(values, total) {
    const host = byId('cost-bars');
    host.replaceChildren();
    categories.forEach(([label, key]) => {
      const value = values[key] || 0;
      if (value <= 0) return;
      const row = document.createElement('div');
      row.className = 'cost-bar';
      const name = document.createElement('span');
      name.className = 'cost-bar__label';
      name.textContent = label;
      const track = document.createElement('span');
      track.className = 'cost-bar__track';
      const fill = document.createElement('span');
      fill.className = 'cost-bar__fill';
      fill.style.width = `${Math.max(3, (value / total) * 100)}%`;
      track.append(fill);
      const amount = document.createElement('b');
      amount.className = 'cost-bar__value';
      amount.textContent = `${currency.format(value / 12)}/mês`;
      row.append(name, track, amount);
      host.append(row);
    });
  }

  function calculate(event) {
    event.preventDefault();
    clearInvalidState();
    hideError();

    const vehicleValue = readNumber('vehicle-value');
    if (!Number.isFinite(vehicleValue) || vehicleValue < 1000) {
      showError('Informe o valor aproximado do carro, a partir de R$ 1.000.', 'vehicle-value');
      return;
    }
    const kmMonth = readNumber('km-month');
    if (!Number.isFinite(kmMonth) || kmMonth <= 0) {
      showError('Informe quantos quilômetros você espera rodar por mês.', 'km-month');
      return;
    }
    const kmYear = kmMonth * 12;
    byId('km-year').value = String(kmYear);
    const fuelPrice = readNumber('fuel-price');
    const consumption = readNumber('consumption');
    if (!Number.isFinite(fuelPrice) || fuelPrice <= 0) {
      showError('Informe um preço de combustível maior que zero.', 'fuel-price');
      return;
    }
    if (!Number.isFinite(consumption) || consumption <= 0) {
      showError('Informe um consumo médio maior que zero.', 'consumption');
      return;
    }

    const values = {};
    for (const id of moneyFields) {
      const parsed = readNumber(id);
      if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
        showError('Use somente valores iguais ou maiores que zero.', id);
        return;
      }
      values[id] = parsed;
    }

    const annual = {
      fuel: (kmYear / consumption) * fuelPrice,
      insurance: values['insurance-year'] ?? 0,
      taxes: values['taxes-year'] ?? 0,
      maintenance: values['maintenance-year'] ?? 0,
      parking: (values['parking-month'] ?? 0) * 12,
      financing: (values['financing-month'] ?? 0) * 12,
      other: (values['other-month'] ?? 0) * 12,
      depreciation: values['depreciation-year'] ?? 0
    };
    const annualTotal = Object.values(annual).reduce((sum, value) => sum + value, 0);
    const monthlyTotal = annualTotal / 12;
    const perKmTotal = annualTotal / kmYear;

    byId('annual-total').textContent = currency.format(annualTotal);
    byId('monthly-total').textContent = currency.format(monthlyTotal);
    byId('per-km-total').textContent = `${currency.format(perKmTotal)}/km`;
    byId('table-annual-total').textContent = currency.format(annualTotal);
    byId('table-monthly-total').textContent = currency.format(monthlyTotal);
    byId('result-context').textContent = `${distance.format(kmMonth)} km/mês`;
    byId('profile-result').textContent = profiles[selectedProfile()].label;

    annualRow('fuel', annual.fuel, true);
    annualRow('insurance', annual.insurance, values['insurance-year'] !== null);
    annualRow('taxes', annual.taxes, values['taxes-year'] !== null);
    annualRow('maintenance', annual.maintenance, values['maintenance-year'] !== null);
    annualRow('parking', annual.parking, values['parking-month'] !== null);
    annualRow('financing', annual.financing, values['financing-month'] !== null);
    annualRow('other', annual.other, values['other-month'] !== null);
    annualRow('depreciation', annual.depreciation, values['depreciation-year'] !== null);
    renderBars(annual, annualTotal);

    const profile = profiles[selectedProfile()];
    let note = `O perfil ${profile.label.toLowerCase()} aplicou hipóteses iniciais de ${(profile.insurance * 100).toFixed(1).replace('.', ',')}% para seguro, ${(profile.taxes * 100).toFixed(1).replace('.', ',')}% para tributos, ${(profile.maintenance * 100).toFixed(1).replace('.', ',')}% para manutenção e ${(profile.depreciation * 100).toFixed(0)}% para depreciação anual sobre o valor informado.`;
    if (annual.financing > 0) note += ' A parcela foi somada como saída de caixa integral; consulte o CET para avaliar o contrato.';
    note += ' Abra “Personalizar estimativas” para substituir qualquer hipótese por uma cotação real.';
    byId('result-note').textContent = note;

    const result = byId('cost-result');
    result.classList.add('is-visible');
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function invalidatePreviousResult() {
    if (applyingPreset) return;
    hideError();
    clearInvalidState();
    byId('cost-result').classList.remove('is-visible');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = byId('cost-form');
    if (!form) return;
    applyProfile({ keepVehicle: true });
    document.querySelectorAll('input[name="cost-profile"]').forEach(input => input.addEventListener('change', () => applyProfile({ keepVehicle: true })));
    byId('vehicle-value').addEventListener('input', () => {
      const value = readNumber('vehicle-value');
      if (Number.isFinite(value) && value > 0) applyValueAssumptions(value);
    });
    form.addEventListener('submit', calculate);
    form.addEventListener('input', invalidatePreviousResult);
    form.addEventListener('reset', () => {
      window.requestAnimationFrame(() => {
        byId('profile-daily').checked = true;
        applyProfile({ keepVehicle: false });
        byId('vehicle-value').focus();
      });
    });
  });
})();
