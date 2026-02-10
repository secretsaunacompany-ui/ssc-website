/**
 * Secret Sauna Company - Map Module
 * Leaflet map initialization and location markers
 */
(function() {
    'use strict';

    // ============================================
    // Map State
    // ============================================
    var map = null;
    var markers = {
        commercial: [],
        residential: []
    };

    // ============================================
    // Map Initialization
    // ============================================
    function initMap() {
        if (map) return; // Already initialized

        var commercialLocations = window.SSC.commercialLocations;
        var edmontonLocation = window.SSC.edmontonLocation;
        var residentialLocations = window.SSC.residentialLocations;

        // Initialize map centered on BC
        map = L.map('map').setView([49.2827, -123.1207], 7);

        // Dark theme tile layer (CartoDB Dark Matter - no API key needed!)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Modern map pins (gold + blue)
        var commercialIcon = L.divIcon({
            className: 'map-pin-icon',
            html: '<div class="map-pin map-pin--commercial"><span class="map-pin__core"></span></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -18]
        });

        var residentialIcon = L.divIcon({
            className: 'map-pin-icon',
            html: '<div class="map-pin map-pin--residential"><span class="map-pin__core"></span></div>',
            iconSize: [26, 26],
            iconAnchor: [13, 26],
            popupAnchor: [0, -16]
        });

        // Add commercial markers with enhanced popups
        commercialLocations.forEach(function(loc) {
            var featuresHTML = loc.features.map(function(f) {
                return '<span style="display: inline-block; background: rgba(196, 165, 123, 0.2); padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin: 0.25rem 0.25rem 0 0; color: #c4a57b;">' + f + '</span>';
            }).join('');

            var popupContent = '\n                <div style="font-family: \'Outfit\', sans-serif; min-width: 280px; color: #333;">\n                    ' + (loc.image ? '<img src="' + loc.image + '" alt="' + loc.name + '" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 0.75rem;">' : '') + '\n                    <h3 style="color: #c4a57b; margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 600;">' + loc.name + '</h3>\n                    <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: #666;">' + loc.location + '</p>\n                    <p style="margin: 0 0 0.75rem 0; font-size: 0.9rem; line-height: 1.5; color: #444;">' + loc.description + '</p>\n                    <div style="border-top: 1px solid #e0e0e0; padding-top: 0.75rem; margin-top: 0.75rem;">\n                        <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem;"><strong style="color: #666;">Model:</strong> <span style="color: #c4a57b;">' + loc.model + '</span></p>\n                        <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem;"><strong style="color: #666;">Year Installed:</strong> <span style="color: #666;">' + loc.year + '</span></p>\n                        ' + (featuresHTML ? '<div style="margin-top: 0.5rem;">' + featuresHTML + '</div>' : '') + '\n                    </div>\n                    ' + (loc.link ? '<a href="' + loc.link + '" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 0.75rem; padding: 0.5rem 1rem; background: #c4a57b; color: white; text-decoration: none; border-radius: 4px; font-size: 0.85rem; font-weight: 500;">Visit Website \u2192</a>' : '') + '\n                </div>\n            ';

            var marker = L.marker(loc.coords, { icon: commercialIcon })
                .addTo(map)
                .bindPopup(popupContent, { maxWidth: 320 });
            markers.commercial.push(marker);
        });

        // Add Edmonton commercial marker
        var edmontonFeaturesHTML = edmontonLocation.features.map(function(f) {
            return '<span style="display: inline-block; background: rgba(196, 165, 123, 0.2); padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin: 0.25rem 0.25rem 0 0; color: #c4a57b;">' + f + '</span>';
        }).join('');

        var edmontonPopup = '\n            <div style="font-family: \'Outfit\', sans-serif; min-width: 280px; color: #333;">\n                ' + (edmontonLocation.image ? '<img src="' + edmontonLocation.image + '" alt="' + edmontonLocation.name + '" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 0.75rem;">' : '') + '\n                <h3 style="color: #c4a57b; margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 600;">' + edmontonLocation.name + '</h3>\n                <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: #666;">' + edmontonLocation.location + '</p>\n                <p style="margin: 0 0 0.75rem 0; font-size: 0.9rem; line-height: 1.5; color: #444;">' + edmontonLocation.description + '</p>\n                <div style="border-top: 1px solid #e0e0e0; padding-top: 0.75rem; margin-top: 0.75rem;">\n                    <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem;"><strong style="color: #666;">Model:</strong> <span style="color: #c4a57b;">' + edmontonLocation.model + '</span></p>\n                    <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem;"><strong style="color: #666;">Year Installed:</strong> <span style="color: #666;">' + edmontonLocation.year + '</span></p>\n                    ' + (edmontonFeaturesHTML ? '<div style="margin-top: 0.5rem;">' + edmontonFeaturesHTML + '</div>' : '') + '\n                </div>\n            </div>\n        ';

        var edmontonMarker = L.marker(edmontonLocation.coords, { icon: commercialIcon })
            .addTo(map)
            .bindPopup(edmontonPopup, { maxWidth: 320 });
        markers.commercial.push(edmontonMarker);

        // Add residential markers (privacy-protected, area-level)
        residentialLocations.forEach(function(loc) {
            var popupContent = '\n                <div style="font-family: \'Outfit\', sans-serif; min-width: 250px; color: #333;">\n                    ' + (loc.image ? '<img src="' + loc.image + '" alt="' + loc.name + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 0.75rem;">' : '') + '\n                    <h3 style="color: #4A90E2; margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 600;">Residential Sauna</h3>\n                    <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: #666;">' + loc.name + '</p>\n                    <p style="margin: 0 0 0.25rem 0; font-size: 0.85rem;"><strong style="color: #666;">Model:</strong> <span style="color: #4A90E2;">' + loc.model + '</span></p>\n                    <p style="margin: 0; font-size: 0.85rem;"><strong style="color: #666;">Year Installed:</strong> <span style="color: #666;">' + loc.year + '</span></p>\n                    <p style="margin-top: 0.75rem; font-size: 0.75rem; color: #999; font-style: italic;">Location approximate for privacy</p>\n                </div>\n            ';

            var marker = L.marker(loc.coords, { icon: residentialIcon })
                .addTo(map)
                .bindPopup(popupContent, { maxWidth: 280 });
            markers.residential.push(marker);
        });

        // Fix map display issues
        setTimeout(function() {
            map.invalidateSize();
        }, 250);
    }

    // ============================================
    // Filter Map Markers
    // ============================================
    function filterMapMarkers(filter) {
        if (!map) return;

        // Update button states
        document.querySelectorAll('.map-filter-btn').forEach(function(btn) {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        // Show/hide markers based on filter
        switch(filter) {
            case 'commercial':
                markers.commercial.forEach(function(m) { m.addTo(map); });
                markers.residential.forEach(function(m) { map.removeLayer(m); });
                break;
            case 'residential':
                markers.commercial.forEach(function(m) { map.removeLayer(m); });
                markers.residential.forEach(function(m) { m.addTo(map); });
                break;
            case 'all':
            default:
                markers.commercial.forEach(function(m) { m.addTo(map); });
                markers.residential.forEach(function(m) { m.addTo(map); });
                break;
        }
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.initMap = initMap;
    window.SSC.filterMapMarkers = filterMapMarkers;

    // Global functions
    window.initMap = initMap;
    window.filterMapMarkers = filterMapMarkers;

})();
