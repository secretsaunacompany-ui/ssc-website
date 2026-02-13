/**
 * Analytics Dashboard JavaScript - Netlify Edition
 * Handles data fetching from Netlify Functions, chart rendering, and real-time updates
 */

const API_ENDPOINT = '/.netlify/functions/analytics';
const OPS_ENDPOINT = '/.netlify/functions/booking-admin';
const OPS_SESSION_KEY = 'ssc_admin_session';

// Staff Schedule - Google Apps Script endpoint (deploy your apps-script.js and paste URL here)
// Leave as empty string until deployed, widget will show setup instructions
const STAFF_SCHEDULE_URL = 'https://script.google.com/macros/s/AKfycbzL28w0AzCENd7N8zv1j2kazbMSwGGAy0iAiDN3FBqtlFXoJGM8binKdpWekO7QJQ0vBw/exec';
let currentDays = 30;
let charts = {};
let refreshInterval;

// Chart color scheme
const colors = {
    primary: '#d4a574',
    secondary: '#e8e8e8',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
    background: '#1a1a1a',
    border: '#2a2a2a'
};

const chartColors = [
    '#d4a574', '#4ade80', '#fbbf24', '#60a5fa', '#f87171',
    '#a78bfa', '#fb923c', '#22d3ee', '#fb7185', '#a3e635'
];

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format duration (seconds to readable format)
function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// Fetch data from Netlify Function
async function fetchData(action, params = {}) {
    try {
        const queryString = new URLSearchParams({ ...params, action }).toString();
        const response = await fetch(`${API_ENDPOINT}?${queryString}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

async function requestJson(url, options = {}, errorMessage = 'Request failed') {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Request error:', errorText);
        throw new Error(errorMessage);
    }
    return await response.json();
}

function withAdminHeaders(headers = {}) {
    return {
        ...headers,
        'X-Admin-Token': getAdminToken()
    };
}

// ============================================
// Booking Ops
// ============================================
function getAdminToken() {
    try {
        const session = JSON.parse(sessionStorage.getItem(OPS_SESSION_KEY));
        if (!session || Date.now() > session.expiry) {
            sessionStorage.removeItem(OPS_SESSION_KEY);
            return '';
        }
        return session.token || '';
    } catch {
        return '';
    }
}

// Booking Ops panel moved to /admin (booking-ops.html + booking-ops.js)
// getAdminToken() and withAdminHeaders() retained above for staffing widget

// ============================================
// Staffing Coverage Widget
// ============================================

async function fetchStaffSchedule() {
    if (!STAFF_SCHEDULE_URL) {
        return { success: false, schedule: [], notConfigured: true };
    }

    try {
        const response = await fetch(`${STAFF_SCHEDULE_URL}?action=schedule&days=21`);
        if (!response.ok) throw new Error('Failed to fetch staff schedule');
        return await response.json();
    } catch (error) {
        console.error('Staff schedule fetch error:', error);
        return { success: false, schedule: [], error: error.message };
    }
}

async function fetchBookingCountsForStaffing() {
    // Get booking counts for next 3 weeks to match staff schedule
    const bookings = {};
    const today = new Date();

    for (let i = 0; i < 21; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().slice(0, 10);

        try {
            const params = new URLSearchParams({ action: 'sessions', date: dateKey });
            const response = await fetch(`${OPS_ENDPOINT}?${params.toString()}`, {
                headers: withAdminHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                const sessions = data.sessions || [];
                const bookedCount = sessions.reduce((sum, s) => sum + (s.booked_social || 0), 0);
                const hasPrivate = sessions.some(s => s.has_private);
                bookings[dateKey] = { count: bookedCount, hasPrivate };
            }
        } catch (e) {
            // Skip days we can't fetch
        }
    }

    return bookings;
}

function renderStaffingWidget(scheduleData, bookings) {
    const grid = document.getElementById('staffingGrid');
    const alerts = document.getElementById('staffingAlerts');
    if (!grid) return;

    // Handle not configured state
    if (scheduleData.notConfigured) {
        grid.innerHTML = `
            <div class="staffing-empty">
                <p>Staff schedule not configured.</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem;">
                    Deploy the Apps Script and add the URL to<br>
                    <code>STAFF_SCHEDULE_URL</code> in analytics-dashboard-netlify.js
                </p>
            </div>
        `;
        if (alerts) alerts.innerHTML = '';
        return;
    }

    // Handle error state
    if (!scheduleData.success || !scheduleData.schedule) {
        grid.innerHTML = `
            <div class="staffing-error">
                Unable to load staff schedule. Check console for details.
            </div>
        `;
        if (alerts) alerts.innerHTML = '';
        return;
    }

    const schedule = scheduleData.schedule;

    // Merge with bookings and calculate attention needed
    const mergedData = schedule.map(day => {
        const booking = bookings[day.date] || { count: 0, hasPrivate: false };
        const hasBookings = booking.count > 0 || booking.hasPrivate;
        const isUnstaffed = day.status === 'Unstaffed' || day.status === 'Partial';
        return {
            ...day,
            bookings: booking.count,
            hasPrivate: booking.hasPrivate,
            hasBookings,
            needsAttention: hasBookings && isUnstaffed
        };
    });

    // Render alerts
    const attentionDays = mergedData.filter(d => d.needsAttention);
    if (alerts) {
        if (attentionDays.length > 0) {
            alerts.innerHTML = `
                <div class="staffing-alerts">
                    <div class="staffing-alert-icon">⚠</div>
                    <div class="staffing-alert-text">
                        <strong>${attentionDays.length} day${attentionDays.length > 1 ? 's' : ''} need staffing</strong>
                        <span class="staffing-alert-detail">
                            ${attentionDays.map(a => `${a.day} ${a.date.slice(5)}`).join(', ')}
                        </span>
                    </div>
                </div>
            `;
        } else {
            alerts.innerHTML = '';
        }
    }

    // Render day cards
    if (mergedData.length === 0) {
        grid.innerHTML = `<div class="staffing-empty">No upcoming shifts scheduled.</div>`;
        return;
    }

    const todayKey = new Date().toISOString().slice(0, 10);

    grid.innerHTML = mergedData.map(day => {
        const isToday = day.date === todayKey;
        const cardClass = day.needsAttention ? 'attention' : day.status === 'Staffed' ? 'good' : '';

        return `
            <div class="staffing-day ${cardClass} ${isToday ? 'today' : ''}">
                <div class="staffing-day-header">
                    <span class="staffing-day-name">${day.day}</span>
                    <span class="staffing-day-date">${day.date.slice(5)}</span>
                </div>
                <div class="staffing-bookings">
                    ${day.hasPrivate ? '🔒 Private' : day.bookings > 0 ? `${day.bookings} booking${day.bookings !== 1 ? 's' : ''}` : 'No bookings'}
                </div>
                <div class="staffing-shifts">
                    <div class="staffing-shift ${day.shiftA ? 'filled' : 'empty'}">
                        <span class="shift-label">A</span>
                        <span class="shift-name">${day.shiftA || '—'}</span>
                    </div>
                    <div class="staffing-shift ${day.shiftB ? 'filled' : 'empty'}">
                        <span class="shift-label">B</span>
                        <span class="shift-name">${day.shiftB || '—'}</span>
                    </div>
                </div>
                ${day.notes ? `<div class="staffing-notes">${day.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

async function loadStaffingWidget() {
    const grid = document.getElementById('staffingGrid');
    if (!grid) return;

    grid.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

    try {
        const [scheduleData, bookings] = await Promise.all([
            fetchStaffSchedule(),
            fetchBookingCountsForStaffing()
        ]);

        renderStaffingWidget(scheduleData, bookings);
    } catch (error) {
        console.error('Staffing widget error:', error);
        grid.innerHTML = `
            <div class="staffing-error">
                Unable to load staffing data. Check console for details.
            </div>
        `;
    }
}

function initStaffingWidget() {
    const refreshBtn = document.getElementById('staffingRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadStaffingWidget);
    }

    loadStaffingWidget();
}

// Update overview stats
async function updateOverview() {
    try {
        const data = await fetchData('overview', { days: currentDays });

        document.getElementById('statPageViews').textContent = formatNumber(data.totalPageViews);
        document.getElementById('statUniqueVisitors').textContent = formatNumber(data.uniqueVisitors);
        document.getElementById('statAvgDuration').textContent = formatDuration(data.avgSessionDuration);
        document.getElementById('statBounceRate').textContent = `${data.bounceRate}%`;

        // Clear loading text
        document.querySelectorAll('.stat-change').forEach(el => {
            el.textContent = '';
        });
    } catch (error) {
        console.error('Error updating overview:', error);
        showError('Failed to load overview statistics');
    }
}

// Update real-time visitors
async function updateRealtime() {
    try {
        const data = await fetchData('realtime');
        document.getElementById('realtimeCount').textContent = data.count;
    } catch (error) {
        console.error('Error updating realtime:', error);
    }
}

// Create or update traffic chart
async function updateTrafficChart() {
    try {
        const data = await fetchData('traffic', { days: currentDays });

        const labels = data.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const pageViews = data.map(d => d.page_views);
        const uniqueVisitors = data.map(d => d.unique_visitors);

        const ctx = document.getElementById('trafficChart').getContext('2d');

        if (charts.traffic) {
            charts.traffic.data.labels = labels;
            charts.traffic.data.datasets[0].data = pageViews;
            charts.traffic.data.datasets[1].data = uniqueVisitors;
            charts.traffic.update();
        } else {
            charts.traffic = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Page Views',
                            data: pageViews,
                            borderColor: colors.primary,
                            backgroundColor: colors.primary + '20',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Unique Visitors',
                            data: uniqueVisitors,
                            borderColor: colors.success,
                            backgroundColor: colors.success + '20',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: colors.secondary }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: colors.background,
                            titleColor: colors.secondary,
                            bodyColor: colors.secondary,
                            borderColor: colors.border,
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: colors.secondary },
                            grid: { color: colors.border }
                        },
                        x: {
                            ticks: { color: colors.secondary },
                            grid: { color: colors.border }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error updating traffic chart:', error);
    }
}

// Create or update referrers chart
async function updateReferrersChart() {
    try {
        const data = await fetchData('referrers', { days: currentDays, limit: 10 });

        const labels = data.map(d => d.source);
        const values = data.map(d => d.visits);

        const ctx = document.getElementById('referrersChart').getContext('2d');

        if (charts.referrers) {
            charts.referrers.data.labels = labels;
            charts.referrers.data.datasets[0].data = values;
            charts.referrers.update();
        } else {
            charts.referrers = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: chartColors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: colors.secondary, padding: 15 }
                        },
                        tooltip: {
                            backgroundColor: colors.background,
                            titleColor: colors.secondary,
                            bodyColor: colors.secondary,
                            borderColor: colors.border,
                            borderWidth: 1
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error updating referrers chart:', error);
    }
}

// Create or update devices chart
async function updateDevicesChart() {
    try {
        const data = await fetchData('devices', { days: currentDays });

        const labels = data.map(d => d.device_type);
        const values = data.map(d => d.sessions);

        const ctx = document.getElementById('devicesChart').getContext('2d');

        if (charts.devices) {
            charts.devices.data.labels = labels;
            charts.devices.data.datasets[0].data = values;
            charts.devices.update();
        } else {
            charts.devices = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: chartColors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: colors.secondary, padding: 15 }
                        },
                        tooltip: {
                            backgroundColor: colors.background,
                            titleColor: colors.secondary,
                            bodyColor: colors.secondary,
                            borderColor: colors.border,
                            borderWidth: 1
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error updating devices chart:', error);
    }
}

// Create or update browsers chart
async function updateBrowsersChart() {
    try {
        const data = await fetchData('browsers', { days: currentDays });

        const labels = data.map(d => d.browser);
        const values = data.map(d => d.sessions);

        const ctx = document.getElementById('browsersChart').getContext('2d');

        if (charts.browsers) {
            charts.browsers.data.labels = labels;
            charts.browsers.data.datasets[0].data = values;
            charts.browsers.update();
        } else {
            charts.browsers = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Sessions',
                        data: values,
                        backgroundColor: colors.primary,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: colors.background,
                            titleColor: colors.secondary,
                            bodyColor: colors.secondary,
                            borderColor: colors.border,
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: colors.secondary },
                            grid: { color: colors.border }
                        },
                        x: {
                            ticks: { color: colors.secondary },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error updating browsers chart:', error);
    }
}

// Create or update OS chart
async function updateOSChart() {
    try {
        const data = await fetchData('os', { days: currentDays });

        const labels = data.map(d => d.os);
        const values = data.map(d => d.sessions);

        const ctx = document.getElementById('osChart').getContext('2d');

        if (charts.os) {
            charts.os.data.labels = labels;
            charts.os.data.datasets[0].data = values;
            charts.os.update();
        } else {
            charts.os = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Sessions',
                        data: values,
                        backgroundColor: colors.success,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: colors.background,
                            titleColor: colors.secondary,
                            bodyColor: colors.secondary,
                            borderColor: colors.border,
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { color: colors.secondary },
                            grid: { color: colors.border }
                        },
                        y: {
                            ticks: { color: colors.secondary },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error updating OS chart:', error);
    }
}

// Update top pages table
async function updateTopPages() {
    try {
        const data = await fetchData('pages', { days: currentDays, limit: 10 });

        const tbody = document.querySelector('#topPagesTable tbody');

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <p>No page data available yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map((page, index) => `
            <tr>
                <td>
                    <div style="font-weight: 600; margin-bottom: 0.2rem;">${page.page_title || 'Untitled'}</div>
                    <div style="font-size: 0.85rem; color: #888;">${page.page_url}</div>
                </td>
                <td><span class="metric-badge">${formatNumber(page.views)}</span></td>
                <td><span class="metric-badge">${formatNumber(page.unique_visitors)}</span></td>
                <td>-</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error updating top pages:', error);
    }
}

// Show error message
function showError(message) {
    const container = document.querySelector('.dashboard-main .container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = `
        <strong>Error:</strong> ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: inherit; cursor: pointer;">✕</button>
    `;
    container.insertBefore(errorDiv, container.firstChild);
}

// Update all dashboard data
async function updateDashboard() {
    await Promise.all([
        updateOverview(),
        updateTrafficChart(),
        updateReferrersChart(),
        updateDevicesChart(),
        updateBrowsersChart(),
        updateOSChart(),
        updateTopPages()
    ]);
}

// Initialize dashboard
function init() {
    // Set up time range buttons
    document.querySelectorAll('.time-range-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDays = parseInt(this.dataset.days);
            updateDashboard();
        });
    });

    initStaffingWidget();

    // Initial load
    updateDashboard();
    updateRealtime();

    // Set up refresh intervals
    refreshInterval = setInterval(updateRealtime, 30000); // Update realtime every 30 seconds
    setInterval(updateDashboard, 300000); // Update dashboard every 5 minutes
}

// Start when DOM is ready - only if authenticated
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Only auto-init if session is valid (checked by login overlay)
        if (typeof isSessionValid === 'function' && isSessionValid()) {
            init();
        }
    });
} else {
    if (typeof isSessionValid === 'function' && isSessionValid()) {
        init();
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
});
