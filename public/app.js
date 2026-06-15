const state = {
  page: 'dashboard',
  operator: sessionStorage.getItem('kaan-luum-operator') || '',
  shift: null,
  tickets: [],
  quantities: {},
  historyEvent: 'todos',
  refreshTimer: null,
  installPrompt: null
};

const pageTitles = {
  dashboard: 'Panel de control',
  caja: 'Caja',
  entrada: 'Registrar entrada',
  salida: 'Registrar salida',
  historial: 'Historial',
  reportes: 'Reportes'
};

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0
});

function localDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(path, options = {}) {
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      }
    });
    const payload = await response.json();
    setConnection(true);
    if (!response.ok) {
      throw new Error(payload.error || 'No fue posible completar la operación.');
    }
    return payload;
  } catch (error) {
    if (error instanceof TypeError) {
      setConnection(false);
      throw new Error('Sin conexión. Conéctate a internet para operar el sistema.');
    }
    throw error;
  }
}

function setConnection(online) {
  const dot = document.querySelector('#status-dot');
  const label = document.querySelector('#connection-label');
  dot.className = `status-dot ${online ? 'online' : 'offline'}`;
  label.textContent = online ? 'Base de datos conectada' : 'Servidor sin conexión';
}

function showToast(message, type = 'success') {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.className = `toast ${type === 'error' ? 'error' : ''} show`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.className = 'toast';
  }, 3200);
}

function showFormAlert(id, message, type) {
  const alert = document.querySelector(`#${id}`);
  alert.textContent = message;
  alert.className = `form-alert show ${type}`;
  clearTimeout(alert.hideTimer);
  alert.hideTimer = setTimeout(() => {
    alert.className = 'form-alert';
  }, 4500);
}

function typeBadge(type) {
  return `<span class="badge badge-${escapeHtml(type)}">${escapeHtml(type)}</span>`;
}

function eventBadge(event) {
  return `<span class="badge badge-${event}">${event}</span>`;
}

function timeLabel(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function elapsedLabel(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Entró hace menos de un minuto';
  if (minutes < 60) return `Entró hace ${minutes} min`;
  return `Entró hace ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function emptyRow(columns, title, detail) {
  return `<tr><td colspan="${columns}" class="empty-state"><strong>${title}</strong>${detail}</td></tr>`;
}

function requireSession() {
  if (!state.operator || !state.shift) {
    openSessionModal();
    return false;
  }
  return true;
}

function updateSessionUi() {
  document.querySelector('#operator-name').textContent = state.operator || 'Sin operador';
  document.querySelector('#shift-status').textContent = state.shift
    ? `Turno #${state.shift.id} abierto`
    : 'Turno sin abrir';
  document.querySelector('#cashier-shift-label').textContent = state.shift
    ? `Turno #${state.shift.id} · ${state.operator || state.shift.operador_apertura}`
    : 'Abre un turno para vender';
  document.querySelector('#session-deposit').closest('label')?.removeAttribute('hidden');
  document.querySelector('#session-deposit').hidden = Boolean(state.shift);
  const depositLabel = document.querySelector('label[for="session-deposit"]');
  if (depositLabel) depositLabel.hidden = Boolean(state.shift);
}

function openSessionModal() {
  document.querySelector('#session-modal').hidden = false;
  document.querySelector('#session-operator').value = state.operator;
  setTimeout(() => document.querySelector('#session-operator').focus(), 50);
}

function closeSessionModal() {
  document.querySelector('#session-modal').hidden = true;
}

async function submitSession(event) {
  event.preventDefault();
  const operator = document.querySelector('#session-operator').value.trim();
  if (!operator) {
    showFormAlert('session-alert', 'Escribe el nombre del operador.', 'error');
    return;
  }
  try {
    if (!state.shift) {
      const result = await api('/api/turnos/abrir', {
        method: 'POST',
        body: JSON.stringify({
          operador: operator,
          deposito_inicial: Number(document.querySelector('#session-deposit').value || 0)
        })
      });
      state.shift = result.turno;
    }
    state.operator = operator;
    sessionStorage.setItem('kaan-luum-operator', operator);
    updateSessionUi();
    closeSessionModal();
    showToast(`Operador activo: ${operator}`);
  } catch (error) {
    showFormAlert('session-alert', error.message, 'error');
  }
}

function setPage(page) {
  state.page = page;
  document.querySelectorAll('.page').forEach((element) => {
    element.classList.toggle('active', element.id === `page-${page}`);
  });
  document.querySelectorAll('.nav-item').forEach((element) => {
    element.classList.toggle('active', element.dataset.page === page);
  });
  document.querySelector('#page-title').textContent = pageTitles[page];
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'dashboard') loadDashboard();
  if (page === 'caja') {
    if (!requireSession()) return;
    renderSale();
  }
  if (page === 'entrada') {
    if (!requireSession()) return;
    setTimeout(() => document.querySelector('#entry-folio').focus(), 80);
  }
  if (page === 'salida') {
    if (!requireSession()) return;
    loadInside();
    setTimeout(() => document.querySelector('#exit-folio').focus(), 80);
  }
  if (page === 'historial') loadHistory();
  if (page === 'reportes') loadReports();
}

async function loadDashboard() {
  try {
    const data = await api('/api/dashboard');
    document.querySelector('#dash-inside').textContent = data.adentro;
    document.querySelector('#dash-entries').textContent = data.entradas_hoy;
    document.querySelector('#dash-exits').textContent = data.salidas_hoy;
    document.querySelector('#dash-max').textContent = data.aforo_max;
    document.querySelector('#dash-revenue').textContent = money.format(data.ingresos_hoy);
    document.querySelector('#dash-percentage').textContent = `${data.porcentaje_aforo}%`;
    document.querySelector('#type-adult').textContent = data.tipos.adulto;
    document.querySelector('#type-child').textContent = data.tipos.niño;
    document.querySelector('#type-local').textContent = data.tipos.local;

    const bar = document.querySelector('#dash-capacity-bar');
    bar.style.width = `${Math.min(100, data.porcentaje_aforo)}%`;
    bar.className = data.porcentaje_aforo >= 90
      ? 'danger'
      : data.porcentaje_aforo >= 70 ? 'warning' : '';
    document.querySelector('#dash-capacity-label').textContent =
      data.porcentaje_aforo >= 90 ? 'Aforo casi completo'
        : data.porcentaje_aforo >= 70 ? 'Aforo elevado' : 'Aforo tranquilo';

    document.querySelector('#dash-recent').innerHTML = data.ultimos.length
      ? data.ultimos.map((record) => `
        <tr>
          <td><span class="folio">${escapeHtml(record.folio)}</span></td>
          <td>${typeBadge(record.tipo)}</td>
          <td>${eventBadge(record.evento)}</td>
          <td>${timeLabel(record.timestamp)}</td>
        </tr>`).join('')
      : emptyRow(4, 'Aún no hay accesos', 'Vende tickets en Caja y escanéalos en Entrada.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function saleSelection() {
  return state.tickets
    .map((ticket) => ({ ticket, quantity: Number(state.quantities[ticket.id]) || 0 }))
    .filter((item) => item.quantity > 0);
}

function renderSale() {
  document.querySelector('#sale-ticket-list').innerHTML = state.tickets.map((ticket) => `
    <article class="sale-ticket" style="--wristband-color:${escapeHtml(ticket.color_brazalete)}">
      <div>
        <span class="ticket-color">${escapeHtml(ticket.color_brazalete)}</span>
        <strong>${escapeHtml(ticket.nombre)}</strong>
        <small>${money.format(ticket.precio)} por persona</small>
      </div>
      <div class="quantity-control">
        <button type="button" data-quantity="${ticket.id}" data-change="-1">−</button>
        <input aria-label="Cantidad de ${escapeHtml(ticket.nombre)}" data-ticket-quantity="${ticket.id}"
          type="number" min="0" max="50" value="${state.quantities[ticket.id] || 0}">
        <button type="button" data-quantity="${ticket.id}" data-change="1">+</button>
      </div>
    </article>`).join('');
  updateSaleSummary();
}

function updateSaleSummary() {
  const selected = saleSelection();
  const count = selected.reduce((sum, item) => sum + item.quantity, 0);
  const total = selected.reduce(
    (sum, item) => sum + item.ticket.precio * item.quantity,
    0
  );
  document.querySelector('#sale-visitor-count').textContent = count;
  document.querySelector('#sale-button-total').textContent = money.format(total);
  document.querySelector('#sale-total').textContent = money.format(total);
  document.querySelector('#sale-summary-lines').innerHTML = selected.length
    ? selected.map(({ ticket, quantity }) => `
      <div class="ticket-line">
        <span>${quantity} × ${escapeHtml(ticket.nombre)}</span>
        <strong>${money.format(ticket.precio * quantity)}</strong>
      </div>`).join('')
    : '<p class="ticket-note">Selecciona la cantidad de visitantes.</p>';
}

function changeQuantity(ticketId, change) {
  state.quantities[ticketId] = Math.max(
    0,
    Math.min(50, (Number(state.quantities[ticketId]) || 0) + change)
  );
  renderSale();
}

async function submitSale(event) {
  event.preventDefault();
  if (!requireSession()) return;
  const selected = saleSelection();
  if (!selected.length) {
    showFormAlert('sale-alert', 'Agrega al menos un visitante.', 'error');
    return;
  }
  const button = event.currentTarget.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const result = await api('/api/ventas', {
      method: 'POST',
      body: JSON.stringify({
        operador: state.operator,
        metodo_pago: document.querySelector('#sale-payment-method').value,
        items: selected.map(({ ticket, quantity }) => ({
          ticket_id: ticket.id,
          cantidad: quantity
        }))
      })
    });
    document.querySelector('#sale-result').innerHTML = `
      <strong>Venta #${result.venta.id} registrada</strong>
      <span>Entrega estos brazaletes:</span>
      <div class="generated-folios">
        ${result.brazaletes.map((item) => `<b>${escapeHtml(item.folio)}</b>`).join('')}
      </div>`;
    state.quantities = {};
    renderSale();
    showToast(`${result.brazaletes.length} brazaletes generados`);
    loadDashboard();
  } catch (error) {
    showFormAlert('sale-alert', error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function submitEntry(event) {
  event.preventDefault();
  if (!requireSession()) return;
  const input = document.querySelector('#entry-folio');
  const folio = input.value.trim();
  if (!folio) {
    showFormAlert('entry-alert', 'Escanea o escribe un folio.', 'error');
    input.focus();
    return;
  }
  try {
    const result = await api('/api/entrada', {
      method: 'POST',
      body: JSON.stringify({ folio, operador: state.operator })
    });
    showFormAlert(
      'entry-alert',
      `${result.folio} validado. Estado: adentro.`,
      'success'
    );
    input.value = '';
    loadDashboard();
  } catch (error) {
    showFormAlert('entry-alert', error.message, 'error');
  } finally {
    input.focus();
  }
}

async function submitExit(event, quickFolio) {
  if (event) event.preventDefault();
  if (!requireSession()) return;
  const input = document.querySelector('#exit-folio');
  const folio = quickFolio || input.value.trim();
  if (!folio) {
    showFormAlert('exit-alert', 'Escanea o escribe el folio de salida.', 'error');
    return;
  }
  try {
    const result = await api('/api/salida', {
      method: 'POST',
      body: JSON.stringify({ folio, operador: state.operator })
    });
    showFormAlert(
      'exit-alert',
      `Salida registrada: ${result.folio}. Visita de ${result.duracion_minutos} min.`,
      'success'
    );
    input.value = '';
    await Promise.all([loadInside(), loadDashboard()]);
  } catch (error) {
    showFormAlert('exit-alert', error.message, 'error');
  } finally {
    input.focus();
  }
}

async function loadInside() {
  try {
    const visitors = await api('/api/adentro-pos');
    document.querySelector('#exit-inside-count').textContent = visitors.length;
    document.querySelector('#inside-list').innerHTML = visitors.length
      ? visitors.map((visitor) => `
        <article class="inside-item">
          <div>
            <h3>${escapeHtml(visitor.folio)}</h3>
            <p>${typeBadge(visitor.tipo)} &nbsp; ${elapsedLabel(visitor.entrada_timestamp)}</p>
          </div>
          <button class="quick-exit" data-quick-exit="${escapeHtml(visitor.folio)}">Dar salida</button>
        </article>`).join('')
      : '<div class="empty-state"><strong>El cenote está vacío</strong>No hay brazaletes adentro.</div>';
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadHistory() {
  const query = new URLSearchParams({
    fecha: document.querySelector('#history-date').value || localDate(),
    evento: state.historyEvent,
    tipo: document.querySelector('#history-type').value,
    folio: document.querySelector('#history-folio').value.trim()
  });
  try {
    const records = await api(`/api/historial?${query}`);
    document.querySelector('#history-body').innerHTML = records.length
      ? records.map((record) => `
        <tr>
          <td><span class="folio">${escapeHtml(record.folio)}</span></td>
          <td>${typeBadge(record.tipo)}</td>
          <td>${eventBadge(record.evento)}</td>
          <td>${timeLabel(record.timestamp)}</td>
          <td>${record.duracion_minutos === null ? '—' : `${record.duracion_minutos} min`}</td>
        </tr>`).join('')
      : emptyRow(5, 'Sin registros legacy', 'Los movimientos nuevos se integrarán aquí en la Entrega 4.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadReports() {
  const date = document.querySelector('#report-date').value || localDate();
  document.querySelector('#download-csv').href = `/api/exportar?fecha=${encodeURIComponent(date)}`;
  try {
    const report = await api(`/api/reportes?fecha=${encodeURIComponent(date)}`);
    document.querySelector('#report-entries').textContent = report.total_entradas;
    document.querySelector('#report-exits').textContent = report.total_salidas;
    document.querySelector('#report-inside').textContent = report.adentro_actual;
    document.querySelector('#report-capacity').textContent =
      `${Math.round((report.adentro_actual / 50) * 100)}%`;
    renderHourChart(report.por_hora);
    document.querySelector('#report-types').innerHTML =
      Object.entries(report.por_tipo).map(([type, values]) => `
        <tr>
          <td>${typeBadge(type)}</td>
          <td>${values.entradas}</td>
          <td>${values.salidas}</td>
          <td><strong>${values.adentro}</strong></td>
        </tr>`).join('');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderHourChart(hourData) {
  const hours = Array.from({ length: 12 }, (_, index) => index + 8);
  const max = Math.max(1, ...hours.map((hour) => hourData[String(hour)] || 0));
  document.querySelector('#hour-chart').innerHTML = hours.map((hour) => {
    const value = hourData[String(hour)] || 0;
    return `<div class="bar-column">
      <span class="bar-value">${value || ''}</span>
      <span class="bar" style="height:${Math.max(3, Math.round((value / max) * 145))}px"></span>
      <span class="bar-label">${hour}h</span>
    </div>`;
  }).join('');
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
  document.querySelector('#pwa-install-close').addEventListener('click', () => {
    document.querySelector('#pwa-install-banner').hidden = true;
  });
  document.querySelector('#pwa-install-action').addEventListener('click', async () => {
    if (state.installPrompt) {
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
    } else {
      showToast('En Safari: Compartir → Agregar a pantalla de inicio.');
    }
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    document.querySelector('#pwa-install-banner').hidden = false;
  });
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => setPage(button.dataset.page));
  });
  document.querySelectorAll('[data-go]').forEach((button) => {
    button.addEventListener('click', () => setPage(button.dataset.go));
  });
  document.querySelector('#change-operator').addEventListener('click', openSessionModal);
  document.querySelector('#open-shift-form').addEventListener('submit', submitSession);
  document.querySelector('#sale-form').addEventListener('submit', submitSale);
  document.querySelector('#sale-ticket-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-quantity]');
    if (button) changeQuantity(button.dataset.quantity, Number(button.dataset.change));
  });
  document.querySelector('#sale-ticket-list').addEventListener('change', (event) => {
    if (!event.target.matches('[data-ticket-quantity]')) return;
    state.quantities[event.target.dataset.ticketQuantity] =
      Math.max(0, Math.min(50, Number(event.target.value) || 0));
    updateSaleSummary();
  });
  document.querySelector('#entry-form').addEventListener('submit', submitEntry);
  document.querySelector('#exit-form').addEventListener('submit', submitExit);
  document.querySelector('#inside-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-quick-exit]');
    if (button) submitExit(null, button.dataset.quickExit);
  });
  document.querySelector('#refresh-inside').addEventListener('click', loadInside);
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.historyEvent = tab.dataset.event;
      document.querySelectorAll('.tab').forEach((item) => {
        item.classList.toggle('active', item === tab);
      });
      loadHistory();
    });
  });
  document.querySelector('#history-type').addEventListener('change', loadHistory);
  document.querySelector('#history-date').addEventListener('change', loadHistory);
  document.querySelector('#history-folio').addEventListener('input', () => {
    clearTimeout(bindEvents.searchTimer);
    bindEvents.searchTimer = setTimeout(loadHistory, 180);
  });
  document.querySelector('#report-date').addEventListener('change', loadReports);
  window.addEventListener('online', () => setConnection(true));
  window.addEventListener('offline', () => setConnection(false));
}

async function initialize() {
  const today = localDate();
  document.querySelector('#history-date').value = today;
  document.querySelector('#report-date').value = today;
  bindEvents();
  setupPwa();

  try {
    const [shiftResult, ticketResult] = await Promise.all([
      api('/api/turnos/activo'),
      api('/api/tickets')
    ]);
    state.shift = shiftResult.turno;
    state.tickets = ticketResult.tickets;
    renderSale();
    updateSessionUi();
    if (!state.operator || !state.shift) openSessionModal();
  } catch (error) {
    showToast(error.message, 'error');
  }

  await loadDashboard();
  state.refreshTimer = setInterval(() => {
    if (state.page === 'dashboard') loadDashboard();
    if (state.page === 'salida') loadInside();
  }, 15000);
}

initialize();
