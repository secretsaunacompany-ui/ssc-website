// Booking Admin Dashboard - Secret Sauna Company
// Standalone JS for /admin (booking-ops.html)

const OPS_ENDPOINT = '/.netlify/functions/booking-admin';

// ============================================
// State
// ============================================
let selectedDate = new Date();
let monthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let monthSessionsCache = null; // 31-day session data for stats + calendar dots
let dayReservationsCache = null; // reservations for the selected day

// ============================================
// Utilities
// ============================================
function formatDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function statusBadge(status) {
    const labelMap = { open: 'Open', full: 'Full', blocked: 'Blocked', private: 'Private' };
    const label = labelMap[status] || status;
    return `<span class="ops-pill ${status}">${label}</span>`;
}

function withAdminHeaders(headers = {}) {
    return {
        ...headers,
        'X-Admin-Token': getAdminToken()
    };
}

// ============================================
// API
// ============================================
async function requestJson(url, options = {}, errorMessage = 'Request failed') {
    const response = await fetch(url, options);
    if (!response.ok) {
        if (response.status === 401) {
            showSessionExpired();
        }
        const errorText = await response.text();
        console.error('Request error:', errorText);
        throw new Error(errorMessage);
    }
    return await response.json();
}

async function fetchSessions(date, days = 1) {
    const params = new URLSearchParams({ action: 'sessions', date, days: String(days) });
    return await requestJson(
        `${OPS_ENDPOINT}?${params.toString()}`,
        { headers: withAdminHeaders() },
        'Unable to load booking sessions'
    );
}

async function fetchReservations(date) {
    const params = new URLSearchParams({ action: 'reservations', date });
    return await requestJson(
        `${OPS_ENDPOINT}?${params.toString()}`,
        { headers: withAdminHeaders() },
        'Unable to load reservations'
    );
}

async function postAction(payload) {
    return await requestJson(
        OPS_ENDPOINT,
        {
            method: 'POST',
            headers: withAdminHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        },
        'Unable to update slot'
    );
}

function showSessionExpired() {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = 'Session expired. Please log in again.';
            errorEl.classList.add('visible');
        }
    }
}

// ============================================
// Month data (single 31-day fetch for stats + calendar dots)
// ============================================
async function fetchMonthSessions() {
    const firstOfMonth = formatDateKey(monthDate);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    try {
        const payload = await fetchSessions(firstOfMonth, daysInMonth);
        monthSessionsCache = payload.sessions || [];
    } catch (error) {
        console.error('Failed to fetch month sessions:', error);
        monthSessionsCache = [];
    }
    renderStatsBar();
    renderCalendar();
}

// ============================================
// Stats bar
// ============================================
function renderStatsBar() {
    const statsBar = document.getElementById('statsBar');
    if (!statsBar || !monthSessionsCache) return;

    const todayKey = formatDateKey(new Date());
    const now = new Date();

    // Compute 7-day window from today
    const sevenDayKeys = new Set();
    for (let i = 0; i < 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        sevenDayKeys.add(formatDateKey(d));
    }

    // Weekend keys (Fri, Sat, Sun) in the next 7 days
    const weekendKeys = new Set();
    for (let i = 0; i < 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        const day = d.getDay();
        if (day === 0 || day === 5 || day === 6) weekendKeys.add(formatDateKey(d));
    }

    let todayBookings = 0;
    let weekendBookings = 0;
    let sevenDayBookings = 0;
    let blockedSlots = 0;

    monthSessionsCache.forEach(slot => {
        const booked = slot.booked_social + (slot.has_private ? 1 : 0);
        if (slot.date === todayKey) todayBookings += booked;
        if (weekendKeys.has(slot.date)) weekendBookings += booked;
        if (sevenDayKeys.has(slot.date)) sevenDayBookings += booked;
        if (slot.is_blocked) blockedSlots++;
    });

    statsBar.innerHTML = `
        <div class="stat-card"><span class="stat-label">Today</span><div class="stat-value">${todayBookings}</div></div>
        <div class="stat-card"><span class="stat-label">Weekend</span><div class="stat-value">${weekendBookings}</div></div>
        <div class="stat-card"><span class="stat-label">7-Day</span><div class="stat-value">${sevenDayBookings}</div></div>
        <div class="stat-card"><span class="stat-label">Blocked</span><div class="stat-value">${blockedSlots}</div></div>
    `;
}

// ============================================
// Calendar
// ============================================
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('monthLabel');
    if (!grid || !label) return;

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    label.textContent = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Build day-status map from month cache
    const dayStatus = new Map();
    if (monthSessionsCache) {
        monthSessionsCache.forEach(slot => {
            const existing = dayStatus.get(slot.date) || { hasBookings: false, hasBlocked: false };
            if (slot.booked_social > 0 || slot.has_private) existing.hasBookings = true;
            if (slot.is_blocked) existing.hasBlocked = true;
            dayStatus.set(slot.date, existing);
        });
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = dayNames.map(d => `<div class="calendar-day muted">${d}</div>`).join('');

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day muted"></div>`;
    }

    const todayKey = formatDateKey(new Date());
    const selectedKey = formatDateKey(selectedDate);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = formatDateKey(date);
        const isToday = dateKey === todayKey;
        const isSelected = dateKey === selectedKey;
        const classes = ['calendar-day'];
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');

        const status = dayStatus.get(dateKey);
        let dot = '';
        if (status?.hasBlocked) dot = '<span class="dot blocked"></span>';
        else if (status?.hasBookings) dot = '<span class="dot booked"></span>';

        html += `<button class="${classes.join(' ')}" type="button" data-date="${dateKey}">${day}${dot}</button>`;
    }

    grid.innerHTML = html;
}

// ============================================
// Day detail (slot cards + reservations)
// ============================================
async function loadDayDetail(dateKey) {
    const dateDisplay = document.getElementById('dateDisplay');
    const slotCards = document.getElementById('slotCards');
    const daySummary = document.getElementById('daySummary');

    if (dateDisplay) dateDisplay.textContent = formatDateDisplay(new Date(dateKey + 'T00:00:00'));
    if (slotCards) slotCards.innerHTML = '<div class="loading-text">Loading...</div>';

    try {
        const [sessionPayload, reservationPayload] = await Promise.all([
            fetchSessions(dateKey),
            fetchReservations(dateKey)
        ]);

        const sessions = sessionPayload.sessions || [];
        dayReservationsCache = reservationPayload.reservations || [];

        // Day summary
        if (daySummary) {
            const totals = sessions.reduce((acc, s) => {
                acc.total++;
                if (s.status === 'blocked') acc.blocked++;
                if (s.status === 'full') acc.full++;
                if (s.status === 'private') acc.priv++;
                if (s.status === 'open') acc.open++;
                return acc;
            }, { total: 0, blocked: 0, full: 0, priv: 0, open: 0 });
            daySummary.textContent = `${totals.open} open \u00b7 ${totals.full} full \u00b7 ${totals.priv} private \u00b7 ${totals.blocked} blocked`;
        }

        // Block day button state
        const blockDayBtn = document.getElementById('blockDayBtn');
        if (blockDayBtn) {
            const allBlocked = sessions.length > 0 && sessions.every(s => s.is_blocked);
            blockDayBtn.textContent = allBlocked ? 'Unblock Day' : 'Block Day';
            blockDayBtn.dataset.blocked = allBlocked ? 'true' : 'false';
        }

        renderSlotCards(sessions, dayReservationsCache);
    } catch (error) {
        console.error('Load day detail error:', error);
        if (slotCards) slotCards.innerHTML = '<div class="loading-text">Unable to load booking data.</div>';
    }
}

function renderSlotCards(sessions, reservations) {
    const container = document.getElementById('slotCards');
    if (!container) return;

    if (!sessions.length) {
        container.innerHTML = '<div class="loading-text">No slots available.</div>';
        return;
    }

    container.innerHTML = sessions.map(slot => {
        const bookedLabel = slot.has_private ? 'Private' : `${slot.booked_social}/${slot.capacity_social}`;
        const blockLabel = slot.is_blocked ? 'Unblock' : 'Block';
        const clearDisabled = slot.has_private || slot.booked_social > 0 ? '' : 'disabled';

        // Get reservations for this slot
        const slotReservations = reservations.filter(r => r.start_time === slot.start);
        const hasReservations = slotReservations.length > 0;

        const reservationRows = slotReservations.length > 0
            ? slotReservations.map(r => `
                <div class="reservation-row">
                    <div class="reservation-info">
                        <span class="name">${escapeHtml(r.name || 'Unknown')}</span>
                        <span class="meta">${escapeHtml(r.email || '')} &middot; ${r.guests || 1} guest${(r.guests || 1) > 1 ? 's' : ''} &middot; ${r.booking_type || 'social'}</span>
                    </div>
                    <button class="btn btn-danger btn-sm cancel-reservation-btn" type="button" data-id="${r.id}">Cancel</button>
                </div>
            `).join('')
            : '<div class="no-reservations">No reservations for this slot.</div>';

        return `
            <div class="slot-card" data-date="${slot.date}" data-start="${slot.start}" data-end="${slot.end}">
                <div class="slot-card-header">
                    <span class="slot-time">${slot.start} - ${slot.end}</span>
                    <div class="slot-info">
                        <span>${bookedLabel}</span>
                        ${statusBadge(slot.status)}
                    </div>
                </div>
                <div class="slot-actions">
                    <div class="capacity-inline">
                        <input type="number" class="capacity-input" min="0" value="${slot.capacity_social}">
                        <button class="btn btn-outline btn-sm save-btn" type="button">Save</button>
                    </div>
                    <button class="btn btn-sm block-btn" type="button" data-blocked="${slot.is_blocked ? 'true' : 'false'}">${blockLabel}</button>
                    <button class="btn btn-outline btn-sm clear-btn" type="button" ${clearDisabled}>Clear</button>
                    <button class="btn btn-outline btn-sm details-btn" type="button">${hasReservations ? `Details (${slotReservations.length})` : 'Details'}</button>
                </div>
                <div class="reservations-detail">
                    <h4>Reservations</h4>
                    ${reservationRows}
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// CSV Export
// ============================================
async function exportCSV() {
    try {
        const payload = await fetchReservations(formatDateKey(selectedDate));
        const rows = payload.reservations || [];
        if (rows.length === 0) {
            alert('No reservations to export for this date.');
            return;
        }
        const header = ['date', 'start_time', 'end_time', 'booking_type', 'guests', 'name', 'email', 'notes', 'created_at'];
        const csvRows = [header.join(',')];
        rows.forEach(row => {
            const values = header.map(key => {
                const value = row[key] ?? '';
                const escaped = String(value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bookings_${formatDateKey(selectedDate)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export error:', error);
    }
}

// ============================================
// Event handlers
// ============================================
function initAdmin() {
    const refreshBtn = document.getElementById('refreshBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    const calendarGrid = document.getElementById('calendarGrid');
    const blockDayBtn = document.getElementById('blockDayBtn');
    const resetSlotsBtn = document.getElementById('resetSlotsBtn');
    const exportBtn = document.getElementById('exportBtn');
    const slotCards = document.getElementById('slotCards');

    // Refresh
    refreshBtn?.addEventListener('click', () => {
        fetchMonthSessions();
        loadDayDetail(formatDateKey(selectedDate));
    });

    // Logout
    logoutBtn?.addEventListener('click', () => {
        sessionStorage.removeItem(SESSION_KEY);
        document.getElementById('loginOverlay').classList.remove('hidden');
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = 'Incorrect password. Please try again.';
            errorEl.classList.remove('visible');
        }
    });

    // Month navigation
    prevMonth?.addEventListener('click', () => {
        monthDate.setMonth(monthDate.getMonth() - 1);
        fetchMonthSessions();
    });

    nextMonth?.addEventListener('click', () => {
        monthDate.setMonth(monthDate.getMonth() + 1);
        fetchMonthSessions();
    });

    // Calendar date selection
    calendarGrid?.addEventListener('click', (event) => {
        const target = event.target.closest('[data-date]');
        if (!target?.dataset?.date) return;
        selectedDate = new Date(`${target.dataset.date}T00:00:00`);
        renderCalendar();
        loadDayDetail(formatDateKey(selectedDate));
    });

    // Block/Unblock Day
    blockDayBtn?.addEventListener('click', async () => {
        const isBlocked = blockDayBtn.dataset.blocked === 'true';
        if (!isBlocked && !confirm('Block all slots for this day? No public bookings will be available.')) return;
        try {
            await postAction({
                action: isBlocked ? 'unblock_day' : 'block_day',
                date: formatDateKey(selectedDate)
            });
            await loadDayDetail(formatDateKey(selectedDate));
            await fetchMonthSessions();
        } catch (error) {
            console.error('Block day error:', error);
        }
    });

    // Reset Slots
    resetSlotsBtn?.addEventListener('click', async () => {
        if (!confirm('This resets capacity and unblocks all slots but does not remove existing bookings. Continue?')) return;
        try {
            await postAction({
                action: 'reset_day',
                date: formatDateKey(selectedDate)
            });
            await loadDayDetail(formatDateKey(selectedDate));
            await fetchMonthSessions();
        } catch (error) {
            console.error('Reset slots error:', error);
        }
    });

    // Export CSV
    exportBtn?.addEventListener('click', exportCSV);

    // Slot card actions (delegated)
    slotCards?.addEventListener('click', async (event) => {
        const target = event.target;
        const card = target.closest('.slot-card');
        if (!card) return;

        const date = card.dataset.date;
        const start = card.dataset.start;
        const end = card.dataset.end;
        const capacityInput = card.querySelector('.capacity-input');

        // Save capacity
        if (target.classList.contains('save-btn')) {
            const capacity = parseInt(capacityInput.value || '12', 10);
            const blockBtn = card.querySelector('.block-btn');
            const isBlocked = blockBtn?.dataset.blocked === 'true';
            try {
                await postAction({
                    action: 'update_slot',
                    date,
                    start_time: start,
                    end_time: end,
                    capacity_social: capacity,
                    is_blocked: isBlocked
                });
                await loadDayDetail(formatDateKey(selectedDate));
                await fetchMonthSessions();
            } catch (error) {
                console.error('Save error:', error);
            }
        }

        // Block/Unblock slot
        if (target.classList.contains('block-btn')) {
            const isBlocked = target.dataset.blocked === 'true';
            try {
                await postAction({
                    action: 'update_slot',
                    date,
                    start_time: start,
                    end_time: end,
                    capacity_social: parseInt(capacityInput.value || '12', 10),
                    is_blocked: !isBlocked
                });
                await loadDayDetail(formatDateKey(selectedDate));
                await fetchMonthSessions();
            } catch (error) {
                console.error('Block slot error:', error);
            }
        }

        // Clear slot
        if (target.classList.contains('clear-btn')) {
            if (!confirm('Clear all reservations for this slot?')) return;
            try {
                await postAction({
                    action: 'clear_slot',
                    date,
                    start_time: start
                });
                await loadDayDetail(formatDateKey(selectedDate));
                await fetchMonthSessions();
            } catch (error) {
                console.error('Clear slot error:', error);
            }
        }

        // Toggle details
        if (target.classList.contains('details-btn')) {
            const detail = card.querySelector('.reservations-detail');
            if (detail) detail.classList.toggle('expanded');
        }

        // Cancel reservation
        if (target.classList.contains('cancel-reservation-btn')) {
            const reservationId = target.dataset.id;
            if (!confirm('Cancel this reservation? This cannot be undone.')) return;
            try {
                await postAction({
                    action: 'cancel_reservation',
                    reservation_id: reservationId
                });
                await loadDayDetail(formatDateKey(selectedDate));
                await fetchMonthSessions();
            } catch (error) {
                console.error('Cancel reservation error:', error);
            }
        }
    });

    // Initial load
    fetchMonthSessions();
    loadDayDetail(formatDateKey(selectedDate));
}

// ============================================
// Bootstrap
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (isSessionValid()) {
        initAdmin();
    }
});
