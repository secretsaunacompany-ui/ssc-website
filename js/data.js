/**
 * Secret Sauna Company - Data Module
 * Contains sauna model data and location data
 */
(function() {
    'use strict';

    /**
     * Price-sheet version.
     *
     * Bump this in the SAME commit as any change to a price -- `basePrice`,
     * `interiorUpgrade`, `premiumFinishPrice`, `electricHeaterUpgrade`,
     * `woodPremium`, `exteriorStandingSeam`, `exteriorCedar`,
     * `exteriorYakisugi` here, or any option
     * value in `_includes/modals/sauna.njk`.
     *
     * The heater fields at pricesVersion 4 encode the complete-sauna rule:
     * `standardElectricLabel` and `standardWoodLabel` name the heaters this
     * model INCLUDES at $0, and a null `standardWoodLabel` means the model has
     * no wood-fired build (S2 on clearances, SC on commercial spec).
     * `woodPremium` is the IKI tier priced OVER whichever standard that model
     * carries -- which is why SC's is the largest step despite sharing a stove
     * with S6 and S8. Neither standard heater is ever a priced line.
     *
     * This is not a convention anyone has to remember: `npm run
     * prices-version:test` hashes the whole price table and fails if the hash
     * moves without this number moving with it.
     *
     * It exists so a quote configuration saved on a visitor's device before a
     * price change can be recognised as belonging to the old world. A stale
     * record is not thrown away: its selections are re-applied and the total is
     * recomputed from live prices, with a visible note. Without the stamp, a
     * week-old saved total would silently contradict its own line items.
     */
    const pricesVersion = 4;

    // ============================================
    // Sauna Model Data
    // ============================================
    const saunaModels = {
        s2: {
            name: 'S2 Standard Sauna',
            basePrice: 23500,
            size: "5' x 7'",
            capacity: '2-3 people',
            heater: 'Homecraft 7.5kW H Series',
            interiorUpgrade: 2200,
            premiumFinishPrice: 9200,
            electricHeaterUpgrade: 3500,
            standardElectricLabel: 'Homecraft 7.5kW H-Series',
            standardWoodLabel: null,
            woodPremium: null,
            // Named even though it is never sellable here. The option still
            // RENDERS on S2 -- disabled -- and a disabled row must say what it
            // is that S2 cannot have, not keep whichever model's stove the
            // visitor happened to look at last.
            woodPremiumLabel: 'Original-IKI (Wood-fired)',
            exteriorStandingSeam: 3000,
            exteriorCedar: 2500,
            exteriorYakisugi: 5000,
            electricOnly: true,
            images: [
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768410759/Gemini_Generated_Image_ot1l9lot1l9lot1l_1_ukzekw.png',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768411922/Gemini_Generated_Image_gkw2ipgkw2ipgkw2_jmvkle.png',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768410755/Gemini_Generated_Image_9lmyb49lmyb49lmy_dfnxak.png',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768410751/nano-banana-2025-09-12T21-15-12_kukbz0.png'
            ]
        },
        s4: {
            name: 'S4 Standard Sauna',
            basePrice: 29500,
            size: "7' x 7'",
            capacity: '4-5 people',
            heater: 'Harvia M3 or Homecraft 7.5kW',
            interiorUpgrade: 2600,
            premiumFinishPrice: 9600,
            electricHeaterUpgrade: 3500,
            standardElectricLabel: 'Homecraft 7.5kW H-Series',
            standardWoodLabel: 'Harvia M3',
            woodPremium: 5000,
            woodPremiumLabel: 'Mini-IKI (Wood-fired)',
            exteriorStandingSeam: 3000,
            exteriorCedar: 2500,
            exteriorYakisugi: 5000,
            electricOnly: false,
            images: [
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768272416/PXL_20240808_173352968.MP_yhb9bq.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768324981/PXL_20240911_022834882.MP_wtnwtj.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto,a_-90,w_1200/v1768275843/IMG_2891_wfwy7y.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768410756/PXL_20240911_021105407_snxau7.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768486021/PXL_20250930_183317338_acg3cj.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto,a_90,w_1200/v1768487213/20250918_121317_twpyv8.jpg',
                'https://res.cloudinary.com/dlhqdgmih/video/upload/q_auto,f_auto/v1768415361/PXL_20240808_172958194.TS_eqp8zy.mp4'
            ]
        },
        s6: {
            name: 'S6 Standard Sauna',
            basePrice: 35500,
            size: "7' x 9'",
            capacity: '6-7 people',
            heater: 'Harvia M3 or Homecraft 7.5kW',
            interiorUpgrade: 3000,
            premiumFinishPrice: 10500,
            electricHeaterUpgrade: 3500,
            standardElectricLabel: 'Homecraft 7.5kW H-Series',
            standardWoodLabel: 'Harvia M3',
            woodPremium: 5900,
            woodPremiumLabel: 'Original-IKI (Wood-fired)',
            exteriorStandingSeam: 3500,
            exteriorCedar: 3000,
            exteriorYakisugi: 6000,
            electricOnly: false,
            images: [
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768250653/IMG_6404_hrncws.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768250654/IMG_6592_ln0gz8.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768272421/20250313_124032-EDIT_uu36i8.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto,a_90,w_1200/v1768250654/IMG_6812_xpzjwk.jpg'
            ]
        },
        s8: {
            name: 'S8 Standard Sauna',
            basePrice: 44000,
            size: "7' x 11'",
            capacity: '8-10 people',
            heater: 'Harvia M3 or Homecraft 7.5kW',
            interiorUpgrade: 3500,
            premiumFinishPrice: 11000,
            electricHeaterUpgrade: 3500,
            standardElectricLabel: 'Homecraft 7.5kW H-Series',
            standardWoodLabel: 'Harvia M3',
            woodPremium: 5900,
            woodPremiumLabel: 'Original-IKI (Wood-fired)',
            exteriorStandingSeam: 4000,
            exteriorCedar: 3000,
            exteriorYakisugi: 6000,
            electricOnly: false,
            images: [
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768324977/DSC03225-EDIT_crqtkp.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto,a_90,w_1200/v1768324976/20250117_192120_yeltdd.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768324985/IMG_7463_fevmyz.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768324982/IMG_7354_qbg7dz.jpg'
            ]
        },
        sc: {
            name: 'SC Commercial Sauna',
            basePrice: 57000,
            size: "7' x 12' or larger",
            capacity: '10-12+ people',
            heater: 'Harvia Pro 20 or Homecraft Revive 9kW',
            interiorUpgrade: 5000,
            premiumFinishPrice: 12500,
            electricHeaterUpgrade: 2800,
            standardElectricLabel: 'Homecraft Revive 9kW',
            standardWoodLabel: null,
            woodPremium: 6500,
            woodPremiumLabel: 'Original-IKI (Wood-fired)',
            exteriorStandingSeam: 4000,
            exteriorCedar: 3000,
            exteriorYakisugi: 6000,
            electricOnly: false,
            images: [
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768409622/IMG_5228_1_z2bz8q.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768409618/IMG_7123_bmcx9s.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768324972/PXL_20250605_233615654_or7ngn.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768324973/PXL_20250605_232338418_yo0pnm.jpg',
                'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768250659/PXL_20250605_233559063.MP-EDIT_zvmio8.jpg'
            ]
        }
    };

    // ============================================
    // Commercial Location Data
    // ============================================
    const commercialLocations = [
        {
            name: 'Secret Sauna Company',
            location: 'Abbotsford, BC',
            coords: [49.0504, -122.3045],
            description: 'Our flagship location featuring premium sauna experiences with breathtaking country views.',
            model: 'S2, S8',
            year: '2025',
            features: ['Cold Plunge', 'Country Views', 'Two Saunas'],
            link: null,
            image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768616084/PXL_20250910_044921755_wobuh2.jpg'
        },
        {
            name: 'The Good Sauna',
            location: '1216 Franklin St, Vancouver, BC',
            coords: [49.2738, -123.0705],
            description: 'Premium sauna experience at Container Brewing in East Vancouver\'s vibrant Strathcona neighbourhood.',
            model: 'SC',
            year: '2024',
            features: ['Urban Location', 'Brewery Partnership'],
            link: 'https://www.thegoodsauna.com/',
            image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768409622/IMG_5228_1_z2bz8q.jpg'
        },
        {
            name: 'Gatherwell - Ambleside',
            location: 'Ambleside Beach, West Vancouver, BC',
            coords: [49.3250, -123.1544],
            description: 'BC\'s first waterfront sauna, custom-built for the stunning Ambleside Park beachfront.',
            model: 'Custom Build',
            year: '2025',
            features: ['Waterfront', 'Ocean Views', 'Public Access'],
            link: 'https://www.gatherwell.ca/book-a-session-ambleside',
            image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768409619/PXL_20251217_173040936_cnznku.jpg'
        },
        {
            name: 'The Finnish Sauna Co. - Sea Edge',
            location: 'Parksville, BC',
            coords: [49.3152, -124.3128],
            description: 'Oceanfront sauna experience just meters from the beach at Sea Edge Seaside Hotel.',
            model: 'SC',
            year: '2024',
            features: ['Oceanfront', 'Hotel Partnership', 'Beach Access'],
            link: 'https://www.thefinnishsauna.ca/sea-edge-sauna',
            image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768409618/IMG_7123_bmcx9s.jpg'
        },
        {
            name: 'Brackendale Art Gallery',
            location: 'Squamish, BC',
            coords: [49.7695, -123.1558],
            description: 'Regular mobile sauna appearances at this cultural hub in the heart of Brackendale.',
            model: 'Mobile',
            year: '2023-Present',
            features: ['Mobile Sauna', 'Cultural Events', 'Community Hub'],
            link: 'https://brackendaleartgallery.com/',
            image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768620246/PXL_20251017_175607860_enorvg.jpg'
        }
    ];

    // Edmonton Commercial Location
    const edmontonLocation = {
        name: 'Custom Commercial Unit',
        location: 'Edmonton, AB',
        coords: [53.5461, -113.4938],
        description: 'Custom-designed commercial sauna installation for a private wellness center.',
        model: 'Custom',
        year: '2024',
        features: ['Commercial', 'Custom Design', 'Wellness Center'],
        link: null,
        image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768250657/PXL_20250605_231738816.MP_javbdv.jpg'
    };

    // ============================================
    // Residential Location Data
    // ============================================
    const residentialLocations = [
        { name: 'Brackendale Area', coords: [49.7695, -123.1558], model: 'S4', year: '2023', image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768410756/PXL_20240911_021105407_snxau7.jpg' },
        { name: 'Brackendale Area', coords: [49.7750, -123.1650], model: 'S6', year: '2024', image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768250653/20250313_124025-EDIT_h1v6bm.jpg' },
        { name: 'Pemberton Area', coords: [50.3186, -122.8022], model: 'S4', year: '2024', image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768620435/20250206_123417_nnpsrg.jpg' },
        { name: 'Squamish Area', coords: [49.7016, -123.1558], model: 'S4', year: '2025', image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto,a_90,w_400/v1768487213/20250918_121317_twpyv8.jpg' },
        { name: 'California', coords: [36.7783, -119.4179], model: 'S8', year: '2024', image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768620572/20250425_132951-EDIT_z5qkii.jpg' },
        { name: 'Abbotsford Area', coords: [49.0504, -122.3200], model: 'S2', year: '2025', image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto/v1768486096/20250610_124511_dtirpu.jpg' },
        { name: 'Williams Lake Area', coords: [52.1417, -122.1417], model: 'S6', year: '2025', image: 'https://res.cloudinary.com/dlhqdgmih/image/upload/q_auto,f_auto,a_90,w_400/v1768250654/IMG_6812_xpzjwk.jpg' }
    ];

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.pricesVersion = pricesVersion;
    window.SSC.saunaModels = saunaModels;
    window.SSC.commercialLocations = commercialLocations;
    window.SSC.edmontonLocation = edmontonLocation;
    window.SSC.residentialLocations = residentialLocations;

})();
