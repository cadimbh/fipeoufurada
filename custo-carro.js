(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const distance = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

  const moneyFields = [
    'insurance-year',
    'taxes-year',
    'maintenance-year',
    'parking-month',
    'financing-month',
    'other-month',
    'depreciation-year'
  ];

  function readNumber(id) {
    const input = byId(id);
    const raw = input.value.trim();
    if (!raw) return null;
    const parsed = Number(raw.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function clearInvalidState() {
    ['km-year', 'fuel-price', 'consumption', ...moneyFields].forEach(id => {
      byId(id).removeAttribute('aria-invalid');
    });
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

  function calculate(event) {
    event.preventDefault();
    clearInvalidState();
    hideError();

    const kmYear = readNumber('km-year');
    if (kmYear === null || !Number.isFinite(kmYear) || kmYear <= 0) {
      showError('Informe uma quilometragem anual maior que zero.', 'km-year');
      return;
    }

    const fuelPrice = readNumber('fuel-price');
    const consumption = readNumber('consumption');
    const hasFuelPrice = fuelPrice !== null;
    const hasConsumption = consumption !== null;

    if (hasFuelPrice !== hasConsumption) {
      const missingField = hasFuelPrice ? 'consumption' : 'fuel-price';
      showError('Para incluir combustível, informe o preço por litro e o consumo médio juntos.', missingField);
      return;
    }
    if (hasFuelPrice && (!Number.isFinite(fuelPrice) || fuelPrice <= 0)) {
      showError('Informe um preço de combustível maior que zero ou deixe preço e consumo vazios.', 'fuel-price');
      return;
    }
    if (hasConsumption && (!Number.isFinite(consumption) || consumption <= 0)) {
      showError('Informe um consumo médio maior que zero ou deixe preço e consumo vazios.', 'consumption');
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

    const fuelIncluded = hasFuelPrice && hasConsumption;
    const fuelAnnual = fuelIncluded ? (kmYear / consumption) * fuelPrice : 0;
    const insuranceAnnual = values['insurance-year'] ?? 0;
    const taxesAnnual = values['taxes-year'] ?? 0;
    const maintenanceAnnual = values['maintenance-year'] ?? 0;
    const parkingAnnual = (values['parking-month'] ?? 0) * 12;
    const financingAnnual = (values['financing-month'] ?? 0) * 12;
    const otherAnnual = (values['other-month'] ?? 0) * 12;
    const depreciationAnnual = values['depreciation-year'] ?? 0;

    const annualTotal = fuelAnnual + insuranceAnnual + taxesAnnual + maintenanceAnnual + parkingAnnual + financingAnnual + otherAnnual + depreciationAnnual;
    if (!Number.isFinite(annualTotal) || annualTotal <= 0) {
      showError('Informe ao menos um custo maior que zero para calcular o cenário.', fuelIncluded ? 'fuel-price' : 'insurance-year');
      return;
    }

    const monthlyTotal = annualTotal / 12;
    const perKmTotal = annualTotal / kmYear;

    byId('annual-total').textContent = currency.format(annualTotal);
    byId('monthly-total').textContent = currency.format(monthlyTotal);
    byId('per-km-total').textContent = `${currency.format(perKmTotal)}/km`;
    byId('table-annual-total').textContent = currency.format(annualTotal);
    byId('table-monthly-total').textContent = currency.format(monthlyTotal);
    byId('result-context').textContent = `${distance.format(kmYear)} km/ano`;

    annualRow('fuel', fuelAnnual, fuelIncluded);
    annualRow('insurance', insuranceAnnual, values['insurance-year'] !== null);
    annualRow('taxes', taxesAnnual, values['taxes-year'] !== null);
    annualRow('maintenance', maintenanceAnnual, values['maintenance-year'] !== null);
    annualRow('parking', parkingAnnual, values['parking-month'] !== null);
    annualRow('financing', financingAnnual, values['financing-month'] !== null);
    annualRow('other', otherAnnual, values['other-month'] !== null);
    annualRow('depreciation', depreciationAnnual, values['depreciation-year'] !== null);

    let note = 'O total usa somente os valores informados e anualiza os campos mensais multiplicando-os por 12.';
    if (financingAnnual > 0 && depreciationAnnual > 0) {
      note += ' Como você incluiu parcela e depreciação, o cenário combina saída de caixa com perda estimada de valor; interprete essa soma com esse limite em mente.';
    } else if (financingAnnual > 0) {
      note += ' A parcela representa saída de caixa e inclui principal, juros e outras cobranças sem separá-los.';
    } else if (depreciationAnnual > 0) {
      note += ' A depreciação é uma hipótese econômica e não um pagamento mensal.';
    }
    byId('result-note').textContent = note;

    const result = byId('cost-result');
    result.classList.add('is-visible');
    result.focus();
  }

  function invalidatePreviousResult() {
    hideError();
    clearInvalidState();
    byId('cost-result').classList.remove('is-visible');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = byId('cost-form');
    if (!form) return;
    form.addEventListener('submit', calculate);
    form.addEventListener('input', invalidatePreviousResult);
    form.addEventListener('reset', () => {
      window.requestAnimationFrame(invalidatePreviousResult);
      byId('km-year').focus();
    });
  });
})();
