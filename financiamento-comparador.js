(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const value = id => Number(String($(id).value || '').replace(/\D/g, ''));
  const decimal = id => Number(String($(id).value || '').replace(',', '.'));
  const money = number => Number(number || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  function proposal(prefix, entry) {
    const installment = value(`${prefix}-installment`);
    const months = Number($(`${prefix}-months`).value);
    const fees = value(`${prefix}-fees`);
    const cet = decimal(`${prefix}-cet`);
    const total = entry + installment * months + fees;
    return { installment, months, fees, cet, total };
  }

  function detail(data, vehiclePrice) {
    const extra = data.total - vehiclePrice;
    const cet = data.cet ? ` · CET informado: ${data.cet.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.a.` : ' · CET não registrado';
    return `${data.months} parcelas de ${money(data.installment)} · acréscimo nominal de ${money(extra)}${cet}`;
  }

  function showError(message) {
    const box = $('finance-error');
    box.textContent = message;
    box.style.display = 'block';
  }

  function calculate(event) {
    event.preventDefault();
    $('finance-error').style.display = 'none';
    const vehiclePrice = value('vehicle-price');
    const entry = value('down-payment');
    const a = proposal('a', entry);
    const b = proposal('b', entry);
    if (!vehiclePrice || vehiclePrice < 1000) return showError('Informe o preço negociado do carro.');
    if (entry < 0 || entry >= vehiclePrice) return showError('A entrada precisa ser menor que o preço do carro.');
    if (!a.installment || !a.months || !b.installment || !b.months) return showError('Preencha parcela e prazo das duas propostas.');

    const financed = vehiclePrice - entry;
    const difference = Math.abs(a.total - b.total);
    const lower = a.total === b.total ? 'As duas somas são iguais' : a.total < b.total ? 'A proposta A tem menor desembolso nominal' : 'A proposta B tem menor desembolso nominal';
    $('a-total').textContent = money(a.total);
    $('b-total').textContent = money(b.total);
    $('financed-value').textContent = money(financed);
    $('a-detail').textContent = detail(a, vehiclePrice);
    $('b-detail').textContent = detail(b, vehiclePrice);
    $('finance-difference').textContent = a.total === b.total ? 'Totais iguais' : `${money(difference)} de diferença`;
    $('finance-note').textContent = `${lower}. Isso não torna a proposta adequada automaticamente: confira CET, composição das cobranças, condição de antecipação e impacto da parcela no orçamento.`;
    const panel = $('finance-result');
    panel.classList.add('is-visible');
    panel.focus();
  }

  function formatMoney(event) {
    const digits = event.target.value.replace(/\D/g, '');
    event.target.value = digits ? Number(digits).toLocaleString('pt-BR') : '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('finance-form');
    if (!form) return;
    ['vehicle-price','down-payment','a-installment','a-fees','b-installment','b-fees'].forEach(id => $(id).addEventListener('input', formatMoney));
    form.addEventListener('submit', calculate);
  });
})();
