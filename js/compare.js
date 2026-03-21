/**
 * Secret Sauna Company - Comparison Table Module
 * Builds a side-by-side model comparison table from saunaModels data
 */
(function() {
    'use strict';

    const formatCurrency = window.SSC.formatCurrency;

    function buildComparisonTable() {
        const container = document.getElementById('compareTable');
        if (!container) return;

        const models = window.SSC.saunaModels;
        const keys = ['s2', 's4', 's6', 's8', 'sc'];

        const rows = [
            { label: 'Size', key: 'size' },
            { label: 'Capacity', key: 'capacity' },
            { label: 'Base Price', key: 'basePrice', format: 'currency' },
            { label: 'Heater', key: 'heater' },
            { label: 'Interior Upgrade', key: 'interiorUpgrade', format: 'currency', prefix: '+' }
        ];

        let html = '<div class="compare-scroll"><table class="compare-table">';

        // Header row
        html += '<thead><tr><th class="compare-table__label-col">Spec</th>';
        keys.forEach(function(key) {
            var model = models[key];
            var name = key.toUpperCase();
            var popular = key === 's4' ? '<span class="compare-badge">Most Popular</span>' : '';
            var colClass = key === 's4' ? ' class="compare-table__highlight"' : '';
            html += '<th' + colClass + '>' + name + popular + '</th>';
        });
        html += '</tr></thead>';

        // Body rows
        html += '<tbody>';
        rows.forEach(function(row) {
            html += '<tr>';
            html += '<td class="compare-table__label-col">' + row.label + '</td>';
            keys.forEach(function(key) {
                var model = models[key];
                var value = model[row.key];
                var colClass = key === 's4' ? ' class="compare-table__highlight"' : '';

                if (row.format === 'currency') {
                    value = (row.prefix || '') + formatCurrency(value);
                }

                html += '<td' + colClass + '>' + value + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';

        container.innerHTML = html;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildComparisonTable);
    } else {
        buildComparisonTable();
    }

    // Export
    window.SSC = window.SSC || {};
    window.SSC.buildComparisonTable = buildComparisonTable;

})();
