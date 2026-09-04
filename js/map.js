/**
 * Secret Sauna Company - Map Module
 * Leaflet map initialization and location markers
 */
(function() {
    'use strict';

    // ============================================
    // Map State
    // ============================================
    let map = null;
    const markers = {
        commercial: [],
        residential: []
    };

    // ============================================
    // Map Initialization
    // ============================================
    function initMap() {
        if (map) return; // Already initialized

        const commercialLocations = window.SSC.commercialLocations;
        const edmontonLocation = window.SSC.edmontonLocation;
        const residentialLocations = window.SSC.residentialLocations;

        // Initialize map centered on BC
        map = L.map('map').setView([49.2827, -123.1207], 7);

        // Dark theme tile layer (CARTO Dark Matter).
        //
        // THE KEY IS REQUIRED AS OF LATE AUGUST 2026 and its absence does not
        // look like a failure. CARTO began enforcing keys on
        // basemaps.cartocdn.com; an unkeyed request still returns HTTP 200 with
        // a perfectly valid PNG, so nothing errors, nothing logs, and no
        // monitor fires -- but every tile has "API KEY REQUIRED" stamped
        // diagonally across it. The map read as broken on the page that invites
        // people to visit the sauna, and it did so silently. Verified against
        // dark_all at 1x and 2x before this went in.
        //
        // The key is not a secret: tile keys ship in client JavaScript by
        // design, are scoped to a domain, and CARTO's own instructions put it
        // in the URL. Free tier, no account, 5M tile requests a month.
        // Requested 2026-09-04; replace by requesting another at
        // carto.com/basemaps/apikey if it is ever rotated.
        //
        // The `{r}` token is Leaflet's retina suffix, so this fetches the @2x
        // tiles on high-DPI screens -- both variants are keyed the same way.
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_2ws2_1_6be85e1e9a200b6a49f6b890', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Modern map pins (gold + blue)
        const commercialIcon = L.divIcon({
            className: 'map-pin-icon',
            html: '<div class="map-pin map-pin--commercial"><span class="map-pin__core"></span></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -18]
        });

        const residentialIcon = L.divIcon({
            className: 'map-pin-icon',
            html: '<div class="map-pin map-pin--residential"><span class="map-pin__core"></span></div>',
            iconSize: [26, 26],
            iconAnchor: [13, 26],
            popupAnchor: [0, -16]
        });

        // Add commercial markers with enhanced popups
        commercialLocations.forEach((loc) => {
            const featuresHTML = loc.features.map((f) =>
                `<span style="display: inline-block; background: rgba(196, 165, 123, 0.2); padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin: 0.25rem 0.25rem 0 0; color: #c4a57b;">${f}</span>`
            ).join('');

            const popupContent = `
                <div style="font-family: 'Outfit', sans-serif; min-width: 280px; color: #333;">
                    ${loc.image ? `<img src="${loc.image}" alt="${loc.name}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 0.75rem;">` : ''}
                    <h3 style="color: #c4a57b; margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 600;">${loc.name}</h3>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: #666;">${loc.location}</p>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.9rem; line-height: 1.5; color: #444;">${loc.description}</p>
                    <div style="border-top: 1px solid #e0e0e0; padding-top: 0.75rem; margin-top: 0.75rem;">
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem;"><strong style="color: #666;">Model:</strong> <span style="color: #c4a57b;">${loc.model}</span></p>
                        <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem;"><strong style="color: #666;">Year Installed:</strong> <span style="color: #666;">${loc.year}</span></p>
                        ${featuresHTML ? `<div style="margin-top: 0.5rem;">${featuresHTML}</div>` : ''}
                    </div>
                    ${loc.link ? `<a href="${loc.link}"${loc.linkExternal === false ? '' : ' target="_blank" rel="noopener noreferrer"'} style="display: inline-block; margin-top: 0.75rem; padding: 0.5rem 1rem; background: #c4a57b; color: white; text-decoration: none; border-radius: 4px; font-size: 0.85rem; font-weight: 500;">${loc.linkLabel || 'Visit Website'} \u2192</a>` : ''}
                </div>
            `;

            // zIndexOffset lifts every commercial pin above every residential
            // one. Leaflet's default stacking is by latitude, so a residence
            // slightly north of a venue covers it completely -- which is
            // exactly what happened to the Brackendale gallery, hidden under
            // the Brackendale residential pin. At the map's default zoom 7
            // those two sit 1.6px apart, so no amount of coordinate accuracy
            // separates them; the venue simply has to win the stack. It is
            // also the right priority: these are the pins a visitor can act on.
            const marker = L.marker(loc.coords, { icon: commercialIcon, zIndexOffset: 1000 })
                .addTo(map)
                .bindPopup(popupContent, { maxWidth: 320 });
            markers.commercial.push(marker);
        });

        // Add Edmonton commercial marker
        const edmontonFeaturesHTML = edmontonLocation.features.map((f) =>
            `<span style="display: inline-block; background: rgba(196, 165, 123, 0.2); padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin: 0.25rem 0.25rem 0 0; color: #c4a57b;">${f}</span>`
        ).join('');

        const edmontonPopup = `
            <div style="font-family: 'Outfit', sans-serif; min-width: 280px; color: #333;">
                ${edmontonLocation.image ? `<img src="${edmontonLocation.image}" alt="${edmontonLocation.name}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 0.75rem;">` : ''}
                <h3 style="color: #c4a57b; margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 600;">${edmontonLocation.name}</h3>
                <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: #666;">${edmontonLocation.location}</p>
                <p style="margin: 0 0 0.75rem 0; font-size: 0.9rem; line-height: 1.5; color: #444;">${edmontonLocation.description}</p>
                <div style="border-top: 1px solid #e0e0e0; padding-top: 0.75rem; margin-top: 0.75rem;">
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem;"><strong style="color: #666;">Model:</strong> <span style="color: #c4a57b;">${edmontonLocation.model}</span></p>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem;"><strong style="color: #666;">Year Installed:</strong> <span style="color: #666;">${edmontonLocation.year}</span></p>
                    ${edmontonFeaturesHTML ? `<div style="margin-top: 0.5rem;">${edmontonFeaturesHTML}</div>` : ''}
                </div>
            </div>
        `;

        const edmontonMarker = L.marker(edmontonLocation.coords, { icon: commercialIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup(edmontonPopup, { maxWidth: 320 });
        markers.commercial.push(edmontonMarker);

        // Add residential markers (privacy-protected, area-level)
        residentialLocations.forEach((loc) => {
            const popupContent = `
                <div style="font-family: 'Outfit', sans-serif; min-width: 250px; color: #333;">
                    ${loc.image ? `<img src="${loc.image}" alt="${loc.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 0.75rem;">` : ''}
                    <h3 style="color: #4A90E2; margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 600;">Residential Sauna</h3>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: #666;">${loc.name}</p>
                    <p style="margin: 0 0 0.25rem 0; font-size: 0.85rem;"><strong style="color: #666;">Model:</strong> <span style="color: #4A90E2;">${loc.model}</span></p>
                    <p style="margin: 0; font-size: 0.85rem;"><strong style="color: #666;">Year Installed:</strong> <span style="color: #666;">${loc.year}</span></p>
                    <p style="margin-top: 0.75rem; font-size: 0.75rem; color: #999; font-style: italic;">Location approximate for privacy</p>
                </div>
            `;

            const marker = L.marker(loc.coords, { icon: residentialIcon })
                .addTo(map)
                .bindPopup(popupContent, { maxWidth: 280 });
            markers.residential.push(marker);
        });

        // Fix map display issues
        setTimeout(() => {
            map.invalidateSize();
        }, 250);
    }

    // ============================================
    // Filter Map Markers
    // ============================================
    function filterMapMarkers(filter) {
        if (!map) return;

        // Update button states
        document.querySelectorAll('.map-filter-btn').forEach((btn) => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        // Show/hide markers based on filter
        switch(filter) {
            case 'commercial':
                markers.commercial.forEach((m) => { m.addTo(map); });
                markers.residential.forEach((m) => { map.removeLayer(m); });
                break;
            case 'residential':
                markers.commercial.forEach((m) => { map.removeLayer(m); });
                markers.residential.forEach((m) => { m.addTo(map); });
                break;
            case 'all':
            default:
                markers.commercial.forEach((m) => { m.addTo(map); });
                markers.residential.forEach((m) => { m.addTo(map); });
                break;
        }
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.initMap = initMap;
    window.SSC.filterMapMarkers = filterMapMarkers;

})();
