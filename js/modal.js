/**
 * Secret Sauna Company - Modal Module
 * Sauna configuration modal functionality
 */
(function() {
    'use strict';

    // ============================================
    // Hoisted module-level helpers
    // ============================================
    const setText = window.SSC.setText;
    const formatCurrency = window.SSC.formatCurrency;

    // ============================================
    // State Management
    // ============================================
    let currentModel = null;
    let currentModelId = null;
    let currentImageIndex = 0;

    /**
     * Elements that can hold focus, for the focus trap. `:not([hidden])` is not
     * enough on its own -- an input inside a hidden ANCESTOR is still not
     * hidden itself -- so offsetParent is checked at trap time.
     */
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    /**
     * Option values that are NAMES OF PER-MODEL PRICES, not prices.
     *
     * An option whose price differs by model cannot carry a literal in the
     * markup: it would be one model's price shown to five, and two options in
     * one group sharing a literal are also indistinguishable to the quote
     * serializer -- which is how both exteriors and both interiors became
     * unquotable. The token maps to a field on the model; `updatePrices()`
     * repaints the visible span from the same field.
     *
     * Clear cedar and thermowood deliberately map to ONE field at the same
     * price today. They are separate tokens so the two can diverge without
     * either of the failures above (doc 35 §7.7 has the pricing flagged as
     * unverified).
     */
    const PER_MODEL_PRICE_KEYS = {
        interiorClearCedar: 'interiorUpgrade',
        interiorThermowood: 'interiorUpgrade',
        exteriorStandingSeam: 'exteriorStandingSeam',
        exteriorCedar: 'exteriorCedar',
        premiumFinishPrice: 'premiumFinishPrice'
    };

    /** Debounce and per-open ceiling for `configurator_option_change`. */
    const OPTION_EVENT_DEBOUNCE_MS = 500;
    const OPTION_EVENT_CAP = 12;

    /**
     * How long to wait after the last option change before writing the record.
     * Long enough that a visitor clicking through five options writes once
     * rather than five times; short enough that closing the tab straight after
     * a click still saves. localStorage writes are synchronous and block the
     * main thread, which is the whole reason not to do one per keystroke-speed
     * click.
     */
    const PERSIST_DEBOUNCE_MS = 250;

    /**
     * The required fields of step 2 and what makes each one valid. Shared by
     * the submit-time check and the live re-check, so the two can never
     * disagree about what "valid" means -- the classic way a form starts
     * clearing an error it would still reject.
     */
    const FIELD_CHECKS = [
        ['quoteName', 'quoteNameError', (v) => v.trim().length > 0],
        ['quoteEmail', 'quoteEmailError', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())],
        ['quoteLocation', 'quoteLocationError', (v) => v.trim().length > 0]
    ];

    /** Helper microcopy per site-access answer (doc 33 §3). */
    const ACCESS_HELPERS = {
        tight: 'No problem, tricky sites are normal for us. Anything you can tell us about the spot in the notes below helps.',
        crane: 'No problem, tricky sites are normal for us. Anything you can tell us about the spot in the notes below helps.',
        'on-site': 'No problem, tricky sites are normal for us. Anything you can tell us about the spot in the notes below helps.',
        trailer: 'Mobile builds travel well. Mention where it would live and how far it will roam.'
    };

    // ============================================
    // Modal Manager
    // ============================================
    class ModalManager {
        constructor() {
            this.modal = document.getElementById('saunaModal');
            /** 'configure' | 'send' | 'success' */
            this.step = 'configure';
            /** Guards the double-submit state: true from submit until settled. */
            this.submitting = false;
            /** What had focus before the modal opened, so it can be given back. */
            this.lastFocused = null;
            /** Pending debounced persist, so a burst of clicks writes once. */
            this.persistTimer = null;
            /**
             * False until the visitor has tried to submit once. Errors do not
             * appear before that (nobody wants to be told their name is missing
             * while they are still walking towards the field), and they
             * re-check live afterwards.
             */
            this.validationArmed = false;
            /**
             * Option-change instrumentation state. `configurator_option_change`
             * is the only high-frequency event in doc 14 §8 and the doc says so
             * itself: debounced and cheap, because engagement depth is a shape
             * question, not a per-click ledger.
             */
            this.optionTimer = null;
            this.pendingOption = null;
            this.optionEventCount = 0;
            this.initEventListeners();
        }

        initEventListeners() {
            // Close on overlay click
            if (this.modal) {
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) {
                        this.close();
                    }
                });
            }

            // Close on escape key, and trap Tab inside the dialog while it is
            // open. A flow that leads to money is keyboard-complete or it is
            // not done -- and an untrapped dialog drops the visitor into the
            // page behind it mid-quote.
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.close();
                    return;
                }
                if (e.key === 'Tab' && this.isOpen()) {
                    this.trapFocus(e);
                }
            });

            // Site-access helper line. Progressive disclosure at its cheapest:
            // the form gets smarter without getting longer.
            const access = document.getElementById('quoteAccess');
            if (access) {
                access.addEventListener('change', () => {
                    const helper = document.getElementById('quoteAccessHelper');
                    if (!helper) return;
                    const text = ACCESS_HELPERS[access.value];
                    helper.textContent = text || '';
                    helper.hidden = !text;
                });
            }

            // Delegation for dynamic thumbnail clicks
            if (this.modal) {
                this.modal.addEventListener('click', (e) => {
                    const thumb = e.target.closest('[data-action="set-main-image"]');
                    if (thumb) {
                        this.setMainImage(parseInt(thumb.dataset.index));
                    }
                });
            }

            // Initialize price calculation listeners
            // `.addon-option input`, NOT `.modal-addons input`: #quoteForm --
            // name, email, location, notes -- lives INSIDE .modal-addons, so
            // the looser selector bound step 2's own fields as if they were
            // configurator options. Every visitor who completed the funnel
            // emitted three phantom configurator_option_change events, on
            // exactly the walks that converted, and burned three of the twelve
            // per-open slots doing it. An option is a thing inside an
            // .addon-option; nothing else is.
            const setupAddonListeners = () => {
                document.querySelectorAll('.modal-addons .addon-option input').forEach((input) => {
                    input.addEventListener('change', () => {
                        this.calculateTotal();
                        this.trackOptionChange(input);
                        // The configuration is saved from the moment it exists,
                        // not from the moment the visitor reaches step 2. It
                        // used to be written only by "Request This Quote", so
                        // anyone who configured a sauna and closed the modal
                        // lost all of it -- while the panel beside them promised
                        // their progress was saved on this device for 7 days.
                        // The promise was on screen; the write was a step away.
                        this.persistSoon();
                    });
                });

                // Live re-check of step 2, but only once the visitor has been
                // told something is wrong. Before this, the three errors sat
                // unchanged while the visitor corrected every one of them and
                // only cleared on the next submit -- so at the moment of
                // conversion the form read as broken while it was working.
                FIELD_CHECKS.forEach(([fieldId]) => {
                    const field = document.getElementById(fieldId);
                    if (!field) return;
                    const recheck = () => { if (this.validationArmed) this.checkField(fieldId); };
                    field.addEventListener('input', recheck);
                    field.addEventListener('blur', recheck);
                });
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupAddonListeners);
            } else {
                setupAddonListeners();
            }
        }

        open(modelId) {
            // Defence in depth. initModalManager() refuses to construct without
            // a #saunaModal, so a manager reaching here should always have one;
            // this catches the case where the root is removed after
            // construction, and it means open() can never proceed to bind focus
            // and paint against a null root.
            if (!this.modal) return;
            const saunaModels = window.SSC.saunaModels;
            currentModel = saunaModels[modelId];
            currentModelId = modelId;
            if (!currentModel) return;

            this.lastFocused = document.activeElement;

            this.updateSpecs();
            this.updateImages();
            this.updatePrices();
            this.resetForm();
            this.handleHeaterOptions();
            // Restore before the first total is computed, so the visitor never
            // sees the default price flash to their saved one.
            this.restoreSaved(modelId);
            this.calculateTotal();
            this.setStep('configure');

            this.modal.classList.add('active');
            this.modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';

            const close = this.modal.querySelector('.modal-close');
            if (close) close.focus();

            // Top of the funnel. Fired last, after the modal is actually on
            // screen, so it counts opens the visitor got rather than opens the
            // code attempted.
            this.optionEventCount = 0;
            window.SSC.track('configurator_open', { model: currentModelId });
        }

        /**
         * `configurator_option_change` -- debounced, capped, and payload-free
         * beyond the model and which option moved.
         *
         * Debounced because a radio group fires a change for every arrow-key
         * step through it; capped because a visitor who plays with the
         * configurator for ten minutes should register as engaged, not as a
         * flood of identical rows in a table that costs money to hold.
         */
        trackOptionChange(input) {
            if (!currentModelId) return;
            if (this.optionEventCount >= OPTION_EVENT_CAP) return;
            this.pendingOption = input.dataset.addon || input.name || 'option';
            window.clearTimeout(this.optionTimer);
            this.optionTimer = window.setTimeout(() => this.flushOptionChange(),
                OPTION_EVENT_DEBOUNCE_MS);
        }

        /**
         * Emit whatever the debounce is holding, now.
         *
         * Called when the visitor leaves step 1 or closes the modal, because a
         * debounced event that fires on its own schedule arrives AFTER the
         * conversion it preceded -- an engagement event landing behind the
         * success it led to, in a funnel whose whole purpose is order.
         */
        flushOptionChange() {
            window.clearTimeout(this.optionTimer);
            this.optionTimer = null;
            if (!this.pendingOption) return;
            const addon = this.pendingOption;
            this.pendingOption = null;
            if (this.optionEventCount >= OPTION_EVENT_CAP) return;
            this.optionEventCount += 1;
            window.SSC.track('configurator_option_change', {
                model: currentModelId,
                addon: addon
            });
        }

        /**
         * Write the configuration shortly after the visitor stops fiddling.
         *
         * Deliberately the SAME record `requestQuote` writes, built by the same
         * serialiser: a step-1-only record is not a lesser shape, so restore,
         * the stale-version recompute and the `/contact/` fallback all work on
         * it without knowing where it came from. One shape, one writer, no
         * second code path to fall out of step.
         *
         * Only selections. No contact details are persisted here or anywhere
         * else -- the step 2 fields have never been written to storage and this
         * does not change that.
         */
        persistSoon() {
            if (!currentModel || !this.isOpen()) return;
            window.clearTimeout(this.persistTimer);
            this.persistTimer = window.setTimeout(() => {
                this.persistTimer = null;
                if (!currentModel) return;
                window.SSC.quoteStore.save(this.buildConfiguration());
            }, PERSIST_DEBOUNCE_MS);
        }

        /**
         * Drop anything the debounce is holding without writing it.
         *
         * Used wherever the record is deliberately being removed. Without this
         * a pending write from a click made 200ms earlier lands AFTER the
         * clear and resurrects the record -- storage rules that hold everywhere
         * except in a 250ms window are not rules.
         */
        cancelPersist() {
            window.clearTimeout(this.persistTimer);
            this.persistTimer = null;
        }

        /** Write anything the debounce is holding, now. */
        persistNow() {
            if (this.persistTimer === null) return;
            window.clearTimeout(this.persistTimer);
            this.persistTimer = null;
            if (!currentModel) return;
            window.SSC.quoteStore.save(this.buildConfiguration());
        }

        close() {
            if (!this.isOpen()) return;
            // A close is the most likely moment for the debounce to still be
            // holding the last click. Flushing it here is the difference
            // between "your progress is saved" being true and being a slogan.
            this.persistNow();
            this.modal.classList.remove('active');
            this.modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';

            // Closing mid-step-2 loses nothing: the configuration was written
            // to storage on ENTERING step 2, not on success. Reopening the same
            // model restores it. Only the success panel is transient -- it has
            // already done its job and would be a lie on the next open.
            if (this.step === 'success') this.setStep('configure');

            // A modal closed mid-configure still emits what it was holding:
            // abandonment is a measurement, not a reason to drop the evidence.
            this.flushOptionChange();

            if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
                this.lastFocused.focus();
            }
            this.lastFocused = null;
        }

        isOpen() {
            return !!this.modal && this.modal.classList.contains('active');
        }

        /**
         * Keep Tab inside the dialog. Only elements that are actually rendered
         * count -- step 2's fields must not be reachable from step 1.
         */
        trapFocus(event) {
            const focusable = [...this.modal.querySelectorAll(FOCUSABLE)]
                // tabIndex < 0 catches what the selector cannot: the honeypot is
                // an `input` with tabindex="-1", so it matches `input:not([disabled])`
                // and would otherwise become a wrap target for Shift+Tab.
                .filter((el) => el.tabIndex >= 0)
                .filter((el) => el.offsetParent !== null || el === document.activeElement);
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (event.shiftKey && (active === first || !this.modal.contains(active))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        }

        /**
         * The one place step visibility changes. Three panels, mutually
         * exclusive; the price summary belongs to none of them and is always
         * visible.
         */
        setStep(step) {
            this.step = step;
            const show = (id, visible) => {
                const el = document.getElementById(id);
                if (el) el.hidden = !visible;
            };
            show('configureStep', step === 'configure');
            show('configureActions', step === 'configure');
            show('sendStep', step === 'send');
            show('successStep', step === 'success');

            const heading = document.getElementById('configureHeading');
            if (heading) heading.hidden = step !== 'configure';

            // Once the quote is sent the record has been cleared, so the
            // retention notice would be claiming a thing that is no longer
            // true, next to an eraser with nothing left to erase.
            const storageNote = document.querySelector('.quote-storage-note');
            if (storageNote) storageNote.hidden = step === 'success';
        }

        /** The elements that make up a step, for animating it in or out. */
        panelsFor(step) {
            const ids = step === 'configure'
                ? ['configureHeading', 'configureStep', 'configureActions']
                : (step === 'send' ? ['sendStep'] : ['successStep']);
            return ids.map((id) => document.getElementById(id)).filter(Boolean);
        }

        /**
         * Move between steps with the specified choreography: the outgoing
         * panel fades out over 250ms, the incoming one fades in over 250ms with
         * a 100ms overlap. Under `prefers-reduced-motion` it is an instant swap,
         * because motion is the visitor's setting to refuse and the flow must
         * not be slower for taking them at their word.
         *
         * `after` runs once the incoming panel is actually rendered -- focus
         * cannot be moved into an element that is still hidden.
         */
        transitionTo(step, after) {
            const done = () => { if (typeof after === 'function') after(); };
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const outgoing = this.panelsFor(this.step).filter((el) => !el.hidden);

            const arrive = () => {
                this.setStep(step);
                if (!reduced) {
                    this.panelsFor(step).forEach((el) => {
                        el.classList.add('quote-step--entering');
                        window.setTimeout(() => el.classList.remove('quote-step--entering'), 250);
                    });
                }
                done();
            };

            if (reduced || !outgoing.length) { arrive(); return; }

            outgoing.forEach((el) => el.classList.add('quote-step--leaving'));
            window.setTimeout(() => {
                outgoing.forEach((el) => el.classList.remove('quote-step--leaving'));
                arrive();
            }, 150);
        }

        updateSpecs() {
            setText('modalTitle', currentModel.name);
            // C22: the bar names the model the total belongs to.
            setText('stickyModelName', currentModel.name);
            setText('specSize', currentModel.size);
            setText('specCapacity', currentModel.capacity);
            setText('specPrice', formatCurrency(currentModel.basePrice));
            setText('specHeater', currentModel.heater);
        }

        updateImages() {
            currentImageIndex = 0;
            const mainMedia = document.getElementById('modalMainMedia');
            if (mainMedia) {
                const mediaUrl = currentModel.images[0];
                this.renderMainMedia(mainMedia, mediaUrl, `${currentModel.name} - Main view`);
            }

            const thumbnailsContainer = document.getElementById('modalThumbnails');
            if (thumbnailsContainer) {
                thumbnailsContainer.innerHTML = currentModel.images
                    .map((mediaUrl, index) => {
                        const thumbnail = this.getThumbnailUrl(mediaUrl);

                        return `
                        <img
                            src="${thumbnail}"
                            class="modal-thumbnail ${index === 0 ? 'active' : ''}"
                            data-action="set-main-image"
                            data-index="${index}"
                            alt="${currentModel.name} - View ${index + 1}"
                            loading="lazy"
                        >
                    `;
                    }).join('');
            }
        }

        isVideoUrl(url) {
            return url.includes('/video/upload/') ||
                   url.includes('.mp4') ||
                   url.includes('.mov') ||
                   url.includes('.TS') ||
                   url.includes('.webm') ||
                   url.includes('.ogv');
        }

        getThumbnailUrl(mediaUrl) {
            if (!this.isVideoUrl(mediaUrl)) {
                return mediaUrl;
            }

            return currentModel.images.find((url) => !this.isVideoUrl(url)) || mediaUrl;
        }

        renderMainMedia(container, mediaUrl, altText) {
            if (!container) return;
            const isVideo = this.isVideoUrl(mediaUrl);

            if (isVideo) {
                // Convert Cloudinary video URL to MP4 format with proper codec
                const videoUrl = mediaUrl.replace('/upload/', '/upload/vc_h264/');
                container.innerHTML = `
                <video controls autoplay muted loop playsinline preload="metadata" style="background: #000;">
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
                return;
            }

            container.innerHTML = `
            <img src="${mediaUrl}" alt="${altText}">
        `;
        }

        updatePrices() {
            // Every price span whose option carries a PER_MODEL token must be
            // repainted here, or the label disagrees with what calculateTotal
            // adds -- the visitor reads the span, the quote carries the token.
            const setPrice = (id, amount) => {
                const el = document.getElementById(id);
                if (el && typeof amount === 'number') el.textContent = `+${formatCurrency(amount)}`;
            };

            setPrice('clearCedarPrice', currentModel.interiorUpgrade);
            setPrice('thermowoodPrice', currentModel.interiorUpgrade);
            setPrice('standingSeamPrice', currentModel.exteriorStandingSeam);
            setPrice('cedarExteriorPrice', currentModel.exteriorCedar);
            setPrice('premiumFinishPrice', currentModel.premiumFinishPrice);
        }

        /**
         * Both heater upgrades are per-model in price AND in product.
         *
         * This slot previously swapped only the LABEL and left one hardcoded
         * $2,000 behind it, so SC's 15kW Apex and the S2-S8 Revive were sold at
         * one price that had only ever been costed for one of them. Value,
         * price text and label are now set together from the model, every time.
         *
         * Wood-fired is per-model too: a model with no `woodFired` price has no
         * wood-fired option, which is stronger than the old electricOnly flag
         * -- it cannot be selected because there is no price for it to carry.
         */
        handleHeaterOptions() {
            const electricLabel = document.getElementById('heaterElectricLabel');
            const electricPrice = document.getElementById('heaterElectricPrice');
            const electricInput = document.querySelector('#heaterElectricUpgrade input');
            if (electricLabel && electricPrice && electricInput) {
                const amount = currentModel.electricHeaterUpgrade;
                electricLabel.textContent = currentModelId === 'sc'
                    ? 'Homecraft 15kW Apex (Electric)'
                    : 'Homecraft Revive 9kW (Electric)';
                electricPrice.textContent = `+${formatCurrency(amount)}`;
                electricInput.value = String(amount);
            }

            const woodUpgrade = document.getElementById('heaterWoodUpgrade');
            if (!woodUpgrade) return;

            const woodInput = woodUpgrade.querySelector('input');
            const woodLabel = document.getElementById('heaterWoodLabel');
            const woodPrice = document.getElementById('heaterWoodPrice');
            const woodAmount = currentModel.woodFired;
            const unavailable = currentModel.electricOnly || typeof woodAmount !== 'number';

            if (unavailable) {
                woodUpgrade.classList.add('disabled');
                if (woodInput) {
                    woodInput.disabled = true;
                    // A disabled radio keeps its checked state, and the group's
                    // default is a different input -- so hand the selection back
                    // rather than leaving an unbuyable heater in the total.
                    if (woodInput.checked) {
                        woodInput.checked = false;
                        const fallback = document.querySelector('input[name="heater"][value="0"]');
                        if (fallback) fallback.checked = true;
                    }
                }
            } else {
                woodUpgrade.classList.remove('disabled');
                if (woodInput) {
                    woodInput.disabled = false;
                    woodInput.value = String(woodAmount);
                }
                if (woodLabel && currentModel.woodFiredLabel) woodLabel.textContent = currentModel.woodFiredLabel;
                if (woodPrice) woodPrice.textContent = `+${formatCurrency(woodAmount)}`;
            }
        }

        resetForm() {
            // Reset radio buttons to default
            document.querySelectorAll('.modal-addons input[type="radio"]').forEach((input) => {
                // Zero-valued radios are the "none / included" defaults for their group.
                // Groups whose options are all non-priced (e.g. bench) mark their default
                // explicitly with data-default so they still reset correctly.
                // handlePremiumPackageChange applies the same two-clause test -- keep them
                // in step, or the two paths disagree about what "default" means.
                if (input.value === '0' || input.hasAttribute('data-default')) {
                    input.checked = true;
                }
                // Re-enable all inputs
                input.disabled = false;
                const addonOption = input.closest('.addon-option');
                if (addonOption) addonOption.classList.remove('disabled');
            });

            // Reset checkboxes
            document.querySelectorAll('.modal-addons input[type="checkbox"]').forEach((input) => {
                input.checked = false;
                // Re-enable all inputs
                input.disabled = false;
                const addonOption = input.closest('.addon-option');
                if (addonOption) addonOption.classList.remove('disabled');
            });

            // Update base price display
            const summaryBase = document.getElementById('summaryBase');
            if (summaryBase) {
                summaryBase.textContent = formatCurrency(currentModel.basePrice);
            }
        }

        setMainImage(index) {
            currentImageIndex = index;
            const mainMedia = document.getElementById('modalMainMedia');
            if (mainMedia) {
                const mediaUrl = currentModel.images[index];
                this.renderMainMedia(mainMedia, mediaUrl, `${currentModel.name} - View ${index + 1}`);
            }

            document.querySelectorAll('.modal-thumbnail').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        }

        calculateTotal() {
            if (!currentModel) return;

            let total = currentModel.basePrice;
            let addonsHTML = '';

            // Process radio button selections
            document.querySelectorAll('.modal-addons input[type="radio"]:checked').forEach((input) => {
                let value = input.value;

                if (Object.prototype.hasOwnProperty.call(PER_MODEL_PRICE_KEYS, value)) {
                    value = currentModel[PER_MODEL_PRICE_KEYS[value]] || 0;
                } else {
                    // Named tokens that are NOT per-model price keys land here and are
                    // deliberately non-numeric: benchL / benchU exist only to be
                    // distinguishable in the quote serializer, and both must cost $0.
                    // Note the trap in the `|| 0` -- it swallows NaN silently. If a bench
                    // tier is ever priced, it needs a numeric value or a resolver branch
                    // above; editing only the price SPAN would ship a $0 upsell, which is
                    // the mirror image of the bug the tokens were introduced to fix.
                    value = parseInt(value) || 0;
                }

                if (value > 0) {
                    total += value;
                    const addonOption = input.closest('.addon-option');
                    const label = addonOption ? addonOption.querySelector('.addon-label') : null;
                    if (label) {
                        addonsHTML += `
                        <div class="price-row addon">
                            <span>${label.textContent}</span>
                            <span>+${formatCurrency(value)}</span>
                        </div>
                    `;
                    }
                }
            });

            // Process checkbox selections
            document.querySelectorAll('.modal-addons input[type="checkbox"]:checked').forEach((input) => {
                const value = parseInt(input.value) || 0;
                if (value > 0) {
                    total += value;
                    const addonOption = input.closest('.addon-option');
                    const label = addonOption ? addonOption.querySelector('.addon-label') : null;
                    if (label) {
                        addonsHTML += `
                        <div class="price-row addon">
                            <span>${label.textContent}</span>
                            <span>+${formatCurrency(value)}</span>
                        </div>
                    `;
                    }
                }
            });

            const addonsList = document.getElementById('addonsList');
            if (addonsList) addonsList.innerHTML = addonsHTML;

            const summaryTotal = document.getElementById('summaryTotal');
            if (summaryTotal) summaryTotal.textContent = formatCurrency(total);

            // C22. The sticky bar mirrors the summary from the SAME value, in
            // the same place, rather than reading the summary's rendered text
            // back out of the DOM. Two elements showing one number must not
            // have two ways of learning it -- that is how they drift.
            const stickyTotal = document.getElementById('stickyTotal');
            if (stickyTotal) stickyTotal.textContent = formatCurrency(total);
        }

        handlePremiumPackageChange() {
            const isPremiumSelected = document.querySelector('input[name="premiumPackage"][value="premiumFinishPrice"]:checked');

            // Elements that are included in Premium Finish Package
            const conflictingAddons = [
                'input[name="interior"]',           // Clear cedar interior
                'input[name="exterior"]',           // Cedar exterior
                'input[data-addon="wifi"]',         // WiFi controller
                'input[data-addon="lighting"]',     // Lighting package
                'input[data-addon="speakers"]'      // Bluetooth speakers
            ];

            conflictingAddons.forEach((selector) => {
                document.querySelectorAll(selector).forEach((input) => {
                    const addonOption = input.closest('.addon-option');
                    if (isPremiumSelected) {
                        // Disable and dim conflicting options
                        input.disabled = true;
                        if (addonOption) addonOption.classList.add('disabled');
                        // Reset to default/included value
                        if (input.type === 'checkbox') {
                            input.checked = false;
                        // Same default test as resetForm -- see the comment there.
                        } else if (input.type === 'radio' && (input.value === '0' || input.hasAttribute('data-default'))) {
                            input.checked = true;
                        }
                    } else {
                        // Re-enable options
                        input.disabled = false;
                        if (addonOption) addonOption.classList.remove('disabled');
                    }
                });
            });

            this.calculateTotal();
        }

        /**
         * Compose the quote as one human-readable blob plus the machine-ish
         * bits, read from the LIVE summary the visitor is looking at.
         *
         * Every checked radio is included, including the $0 ones. "No changing
         * room" and "L-shaped benches" are choices the visitor made and Lee has
         * to quote against; the previous version skipped anything valued '0'
         * and silently dropped them.
         */
        buildConfiguration() {
            const lines = [];
            const selections = [];
            const inputs = [...document.querySelectorAll('.modal-addons input')];

            inputs.forEach((input, index) => {
                if (!input.checked) return;
                if (input.type !== 'radio' && input.type !== 'checkbox') return;

                const addonOption = input.closest('.addon-option');
                if (!addonOption) return;
                const labelEl = addonOption.querySelector('.addon-label');
                const priceEl = addonOption.querySelector('.addon-price');
                if (!labelEl) return;

                const label = labelEl.textContent.trim();
                const priceText = priceEl ? priceEl.textContent.trim() : '';
                lines.push(`\u2022 ${label}${priceText ? ` ${priceText}` : ''}`);
                selections.push({
                    i: index,
                    addon: input.dataset.addon || '',
                    value: input.value,
                    label: label
                });
            });

            const summaryTotalEl = document.getElementById('summaryTotal');
            const total = summaryTotalEl ? summaryTotalEl.textContent.trim() : '';

            const summary = [
                currentModel.name,
                `Base Price: ${formatCurrency(currentModel.basePrice)}`,
                '',
                'Selected Options:',
                ...lines,
                '',
                `Estimated Total: ${total}`
            ].join('\n');

            return {
                modelId: currentModelId,
                modelName: currentModel.name,
                total: total,
                selections: selections,
                summary: summary
            };
        }

        /**
         * Re-apply a saved configuration for this model, if there is one.
         *
         * The stored TOTAL is never replayed. Selections are re-checked on the
         * live form and calculateTotal() recomputes from live prices, so a
         * saved number can never disagree with the line items beside it. When
         * the record predates the current price sheet -- or when an option it
         * names no longer exists -- the visitor is told the total was
         * recalculated rather than being left to notice.
         */
        restoreSaved(modelId) {
            const note = document.getElementById('quoteStaleNote');
            if (note) note.hidden = true;

            const stored = window.SSC.quoteStore.read();
            if (!stored || stored.data.modelId !== modelId) return;
            if (!Array.isArray(stored.data.selections)) return;

            const inputs = [...document.querySelectorAll('.modal-addons input')];
            let missed = 0;

            stored.data.selections.forEach((sel) => {
                // Index first, then verify it is still the same option. The
                // markup can move under a record that is up to a week old, and
                // checking the wrong box is worse than checking none.
                let input = inputs[sel.i];
                const matches = (el) => el
                    && (el.dataset.addon || '') === sel.addon
                    && (el.closest('.addon-option')?.querySelector('.addon-label')?.textContent.trim() === sel.label);

                if (!matches(input)) {
                    input = inputs.find(matches);
                }
                if (!input) { missed += 1; return; }
                input.checked = true;
            });

            // Premium package disables the options it contains; re-apply that
            // rule after restoring, or a restored basket can show both.
            this.handlePremiumPackageChange();

            // Two different things can invalidate a restored total, and saying
            // "prices" when an option vanished would be a small lie in the one
            // place the visitor is being asked to trust a number. A stale price
            // sheet is the superset, so it wins when both are true.
            // Validates the preservation design: a restore that never happens
            // means the storage work is carrying nobody.
            window.SSC.track('quote_restore', {
                model: modelId,
                stale: !!stored.stale,
                missed: missed
            });

            if (note && (stored.stale || missed > 0)) {
                note.textContent = stored.stale
                    ? 'Prices have been updated since you saved this, so the total above has been recalculated.'
                    : 'Some of the options you had picked have changed since you saved this, so the total above has been recalculated.';
                note.hidden = false;
            }
        }

        /**
         * Step 1 -> Step 2. Transitions in place. Nothing navigates, nothing
         * submits, and the configuration is written to storage HERE, not on
         * success -- so closing the modal mid-step-2 loses nothing.
         */
        requestQuote() {
            if (!currentModel) return;

            // Ordering matters more than the extra 500ms of coalescing: an
            // option change the visitor made BEFORE clicking through must be
            // recorded before the step it led to.
            this.flushOptionChange();

            const config = this.buildConfiguration();
            window.SSC.quoteStore.save(config);

            const set = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value;
            };
            set('quoteConfiguration', config.summary);
            set('quoteModel', config.modelName);
            set('quoteTotal', config.total);

            this.clearErrors();
            this.transitionTo('send', () => {
                const first = document.getElementById('quoteName');
                if (first) first.focus();
            });

            // Intent. The step1 -> step2 number is the denominator for the only
            // conversion rate this programme has a target for.
            window.SSC.track('quote_step2_view', {
                model: config.modelId,
                total: window.SSC.trackAmount(config.total)
            });
        }

        /** Step 2 -> Step 1, with every input exactly as it was left. */
        goBack() {
            this.clearErrors();
            this.transitionTo('configure', () => {
                const btn = document.querySelector('[data-action="request-quote"]');
                if (btn) btn.focus();
            });
        }

        /**
         * Explicit start over: the visitor's own eraser. Clears the saved
         * record and returns the configurator to defaults. One of exactly three
         * things that removes the stored key -- the others are a confirmed
         * submit and the 7-day expiry.
         */
        startOver() {
            this.cancelPersist();
            window.SSC.quoteStore.clear();
            this.validationArmed = false;
            const form = document.getElementById('quoteForm');
            if (form) form.reset();
            this.clearErrors();
            const note = document.getElementById('quoteStaleNote');
            if (note) note.hidden = true;
            const helper = document.getElementById('quoteAccessHelper');
            if (helper) { helper.hidden = true; helper.textContent = ''; }

            if (currentModel) {
                this.resetForm();
                this.handleHeaterOptions();
                this.calculateTotal();
            }
            this.setStep('configure');
            const btn = document.querySelector('[data-action="request-quote"]');
            if (btn) btn.focus();
        }

        clearErrors() {
            const box = document.getElementById('quoteError');
            if (box) { box.hidden = true; box.innerHTML = ''; }
            // Driven off FIELD_CHECKS rather than two hand-kept lists, so a
            // fourth required field cannot arrive with a working error and no
            // way to clear it.
            FIELD_CHECKS.forEach(([fieldId, errorId]) => {
                const error = document.getElementById(errorId);
                if (error) error.hidden = true;
                const field = document.getElementById(fieldId);
                if (field) field.removeAttribute('aria-invalid');
            });
        }

        /**
         * Re-check one field and show or clear its error accordingly.
         *
         * The clearing direction is the one that was missing: the error and its
         * aria-invalid go the instant the field becomes valid, rather than
         * surviving until the next submit. Strictness is unchanged -- this is
         * the same predicate the submit uses, asked more often.
         *
         * @returns {boolean} whether the field is currently valid
         */
        checkField(fieldId) {
            const entry = FIELD_CHECKS.find(([id]) => id === fieldId);
            if (!entry) return true;
            const [, errorId, ok] = entry;
            const field = document.getElementById(fieldId);
            if (!field) return true;

            const valid = ok(field.value);
            const error = document.getElementById(errorId);
            if (error) error.hidden = valid;
            if (valid) field.removeAttribute('aria-invalid');
            else field.setAttribute('aria-invalid', 'true');
            return valid;
        }

        /**
         * Client-side validation. The form carries `novalidate` so the errors
         * are ours: the browser's bubble is unstyleable, disappears on the next
         * keystroke, and reads badly to a screen reader.
         *
         * @returns {boolean} true when the form may be sent
         */
        validate() {
            this.clearErrors();
            // From here on every keystroke re-checks, so a corrected field
            // stops accusing the visitor the moment it is correct.
            this.validationArmed = true;

            let firstBad = null;
            FIELD_CHECKS.forEach(([fieldId]) => {
                if (this.checkField(fieldId)) return;
                const field = document.getElementById(fieldId);
                if (!firstBad) firstBad = field;
            });

            if (firstBad) {
                firstBad.focus();
                return false;
            }
            return true;
        }

        /**
         * Render a failure. The form STAYS MOUNTED with every value intact and
         * the configuration is offered a second exit by email -- a quote that
         * only has one way out is a quote that gets lost when that way breaks.
         */
        showFailure(message, options) {
            // Every failure path in submitQuote() renders through here, so this
            // is the one place `quote_submit_error` can be fired exactly once
            // per failure the visitor actually saw. `error` is a short code,
            // never the message text: doc 14 calls a STREAK of these the
            // tripwire that would have caught the original dead funnel in a
            // day, and a tripwire you have to read prose to count is not one.
            const totalEl = document.getElementById('summaryTotal');
            window.SSC.track('quote_submit_error', {
                model: currentModelId,
                total: window.SSC.trackAmount(totalEl ? totalEl.textContent : ''),
                error: (options && options.code) || 'unknown'
            });

            const box = document.getElementById('quoteError');
            if (!box) return;
            box.innerHTML = '';

            const line = document.createElement('p');
            line.className = 'quote-error__message';
            line.textContent = message;
            box.appendChild(line);

            if (!options || options.mailto !== false) {
                const config = this.buildConfiguration();
                const link = document.createElement('a');
                const address = (this.modal.dataset.contactEmail || '').trim();
                link.href = `mailto:${address}`
                    + `?subject=${encodeURIComponent(`Quote Request \u2014 ${config.modelName} \u2014 ${config.total}`)}`
                    + `&body=${encodeURIComponent(config.summary)}`;
                link.className = 'quote-error__mailto';
                link.textContent = `Email it to us instead`;
                box.appendChild(link);
            }

            box.hidden = false;
        }

        /**
         * Step 2 submit. The whole state machine lives here.
         *
         * What it does NOT do, deliberately: navigate. The success body carries
         * a `next` URL and the old contact handler followed one; following it
         * here would throw away the modal, the recap and the visitor's place in
         * the flow at the exact moment they finally succeeded.
         */
        submitQuote(event) {
            event.preventDefault();
            const form = document.getElementById('quoteForm');
            if (!form || !currentModel) return;

            // Double-submit. Formspree's own guidance is to disable the button
            // until the response returns; the flag is belt to that braces,
            // because a keyboard Enter can outrun a disabled attribute.
            if (this.submitting) return;

            if (!this.validate()) return;

            // Offline is not a failure, it is a wait. Firing the fetch anyway
            // would produce a generic network error and teach the visitor
            // nothing they can act on.
            if (navigator.onLine === false) {
                this.showFailure('You are offline right now. Your configuration is saved, so reconnect and send it again.', { mailto: false, code: 'offline' });
                return;
            }

            const endpoint = form.getAttribute('action');
            if (!endpoint) {
                console.error('SSC: quote form has no action; expected site.forms.endpoint');
                this.showFailure('That didn\'t send. Your configuration is still here; try again, or email it to us.', { code: 'no_endpoint' });
                return;
            }

            // Recompose from the live summary at send time rather than trusting
            // what step 1 stashed: the visitor may have gone back and changed
            // something.
            const config = this.buildConfiguration();
            const location = (document.getElementById('quoteLocation') || {}).value || '';
            const subject = `Configurator Quote \u2014 ${config.modelName} \u2014 ${config.total} \u2014 ${location.trim()}`;
            const set = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value;
            };
            set('quoteConfiguration', config.summary);
            set('quoteModel', config.modelName);
            set('quoteTotal', config.total);
            set('quoteSubject', subject);
            set('quoteSubjectAlt', subject);

            const submitBtn = document.getElementById('quoteSubmit');
            const originalLabel = submitBtn ? submitBtn.textContent : '';
            this.submitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending\u2026';
            }
            this.clearErrors();

            // An attempt is a send that reached the wire: past validation, past
            // the offline check, past the missing-endpoint guard. Counting
            // blocked clicks here would make the attempt -> success rate lie
            // about the endpoint, which is the thing this rate exists to watch.
            window.SSC.track('quote_submit_attempt', {
                model: config.modelId,
                total: window.SSC.trackAmount(config.total)
            });

            const settle = () => {
                this.submitting = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalLabel;
                }
            };

            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    // The only thing that switches Formspree out of
                    // redirect-mode and into JSON. Without it the browser is
                    // handed a 302 and the modal is gone.
                    'Accept': 'application/json'
                },
                body: new URLSearchParams(new FormData(form)).toString()
            })
                .then((response) => {
                    // 429 is invisible in the body: Formspree publishes no
                    // rate-limit error code, and its own client never reads
                    // the status. Only response.status can tell us.
                    if (response.status === 429) {
                        settle();
                        this.showFailure('We are getting a lot of requests right now. Give it a minute and send it again, or email it to us.', { code: 'rate_limited' });
                        return null;
                    }
                    return response.json().catch(() => ({}));
                })
                .then((body) => {
                    if (body === null) return;

                    // Success is discriminated by the body carrying a string
                    // `next`, which is what Formspree's own client checks.
                    // Status is not sufficient on its own.
                    const ok = body && typeof body.next === 'string';
                    if (!ok) {
                        settle();
                        const detail = Array.isArray(body && body.errors)
                            ? body.errors.map((e) => e.message).filter(Boolean).join(' ')
                            : (body && typeof body.error === 'string' ? body.error : '');
                        this.showFailure(detail
                            ? `That didn't send: ${detail} Your configuration is still here.`
                            : 'That didn\'t send. Your configuration is still here; try again, or email it to us.', { code: 'rejected' });
                        return;
                    }

                    settle();
                    this.onSubmitSuccess(config);
                })
                .catch(() => {
                    settle();
                    this.showFailure('That didn\'t send. Your configuration is still here; try again, or email it to us.', { code: 'network' });
                });
        }

        onSubmitSuccess(config) {
            // The one place the stored key is cleared by a send. Not on entering
            // step 2, not on failure -- only when Lee actually has it.
            this.cancelPersist();
            window.SSC.quoteStore.clear();
            this.validationArmed = false;

            const form = document.getElementById('quoteForm');
            if (form) form.reset();

            this.transitionTo('success', () => {
                const heading = document.querySelector('.quote-success-heading');
                if (heading) {
                    heading.setAttribute('tabindex', '-1');
                    heading.focus();
                }
            });

            // The number that must move off zero. Routed through SSC.track like
            // every other event: same existence guard, same payload budget, and
            // `total` as an integer rather than the rendered "$28,500" so the
            // events table can add it up.
            window.SSC.track('quote_submit_success', {
                model: config.modelId,
                total: window.SSC.trackAmount(config.total),
                options: config.selections.length
            });
        }
    }

    // ============================================
    // Create instance (deferred until DOM ready)
    // ============================================
    let modalManager = null;

    /**
     * Returns null on any page that does not carry the modal.
     *
     * The include is now scoped to pages setting `configurator: true` (today
     * /saunas/ alone), so on the other 15 routes this script still loads -- it
     * is in the shared bundle -- and finds no #saunaModal. Constructing a
     * ModalManager against a null root would bind listeners and query elements
     * that are not there, so the manager is simply never created and
     * `window.SSC.modalManager` stays undefined.
     *
     * That is safe because EVERY dispatch site already guards on it before
     * calling: js/init.js lines 25, 28, 31, 34, 37, 75 and 121 each read
     * `if (SSC.modalManager) SSC.modalManager.<method>(...)`. Those seven
     * guards were written for the deferred-construction window and hold
     * unchanged for permanent absence -- verified site by site, not assumed.
     */
    function initModalManager() {
        if (!document.getElementById('saunaModal')) return null;
        if (!modalManager) {
            modalManager = new ModalManager();
            window.SSC.modalManager = modalManager;
        }
        return modalManager;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalManager);
    } else {
        initModalManager();
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};

})();
