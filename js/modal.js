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
            const setupAddonListeners = () => {
                document.querySelectorAll('.modal-addons input').forEach((input) => {
                    input.addEventListener('change', () => { this.calculateTotal(); });
                });
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupAddonListeners);
            } else {
                setupAddonListeners();
            }
        }

        open(modelId) {
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
        }

        close() {
            if (!this.isOpen()) return;
            this.modal.classList.remove('active');
            this.modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';

            // Closing mid-step-2 loses nothing: the configuration was written
            // to storage on ENTERING step 2, not on success. Reopening the same
            // model restores it. Only the success panel is transient -- it has
            // already done its job and would be a lie on the next open.
            if (this.step === 'success') this.setStep('configure');

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
            const upgradePrice = `+${formatCurrency(currentModel.interiorUpgrade)}`;
            const clearCedarPrice = document.getElementById('clearCedarPrice');
            const thermowoodPrice = document.getElementById('thermowoodPrice');
            if (clearCedarPrice) clearCedarPrice.textContent = upgradePrice;
            if (thermowoodPrice) thermowoodPrice.textContent = upgradePrice;

            // Update Premium Finish Package price
            const premiumFinishPrice = document.getElementById('premiumFinishPrice');
            if (premiumFinishPrice && currentModel.premiumFinishPrice) {
                premiumFinishPrice.textContent = `+${formatCurrency(currentModel.premiumFinishPrice)}`;
            }
        }

        handleHeaterOptions() {
            const woodUpgrade = document.getElementById('heaterWoodUpgrade');
            if (!woodUpgrade) return;

            if (currentModel.electricOnly) {
                woodUpgrade.classList.add('disabled');
                const input = woodUpgrade.querySelector('input');
                if (input) input.disabled = true;
            } else {
                woodUpgrade.classList.remove('disabled');
                const input = woodUpgrade.querySelector('input');
                if (input) input.disabled = false;
            }

            // Swap electric heater upgrade based on model
            const electricLabel = document.getElementById('heaterElectricLabel');
            const electricPrice = document.getElementById('heaterElectricPrice');
            const electricInput = document.querySelector('#heaterElectricUpgrade input');
            if (electricLabel && electricPrice && electricInput) {
                if (currentModelId === 'sc') {
                    electricLabel.textContent = 'Homecraft 15kW Apex (Electric)';
                    electricPrice.textContent = '+$2,000';
                    electricInput.value = '2000';
                } else {
                    electricLabel.textContent = 'Homecraft Revive 9kW (Electric)';
                    electricPrice.textContent = '+$2,000';
                    electricInput.value = '2000';
                }
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

                if (value === 'interiorUpgrade') {
                    value = currentModel.interiorUpgrade;
                } else if (value === 'premiumFinishPrice') {
                    value = currentModel.premiumFinishPrice;
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

            if (note && (stored.stale || missed > 0)) note.hidden = false;
        }

        /**
         * Step 1 -> Step 2. Transitions in place. Nothing navigates, nothing
         * submits, and the configuration is written to storage HERE, not on
         * success -- so closing the modal mid-step-2 loses nothing.
         */
        requestQuote() {
            if (!currentModel) return;

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
            window.SSC.quoteStore.clear();
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
            ['quoteNameError', 'quoteEmailError', 'quoteLocationError'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.hidden = true;
            });
            ['quoteName', 'quoteEmail', 'quoteLocation'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.removeAttribute('aria-invalid');
            });
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
            const checks = [
                ['quoteName', 'quoteNameError', (v) => v.trim().length > 0],
                ['quoteEmail', 'quoteEmailError', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())],
                ['quoteLocation', 'quoteLocationError', (v) => v.trim().length > 0]
            ];

            let firstBad = null;
            checks.forEach(([fieldId, errorId, ok]) => {
                const field = document.getElementById(fieldId);
                if (!field || ok(field.value)) return;
                const error = document.getElementById(errorId);
                if (error) error.hidden = false;
                field.setAttribute('aria-invalid', 'true');
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
                this.showFailure('You are offline right now. Your configuration is saved, so reconnect and send it again.', { mailto: false });
                return;
            }

            const endpoint = form.getAttribute('action');
            if (!endpoint) {
                console.error('SSC: quote form has no action; expected site.forms.endpoint');
                this.showFailure('That didn\'t send. Your configuration is still here; try again, or email it to us.');
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
                        this.showFailure('We are getting a lot of requests right now. Give it a minute and send it again, or email it to us.');
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
                            : 'That didn\'t send. Your configuration is still here; try again, or email it to us.');
                        return;
                    }

                    settle();
                    this.onSubmitSuccess(config);
                })
                .catch(() => {
                    settle();
                    this.showFailure('That didn\'t send. Your configuration is still here; try again, or email it to us.');
                });
        }

        onSubmitSuccess(config) {
            // The one place the stored key is cleared by a send. Not on entering
            // step 2, not on failure -- only when Lee actually has it.
            window.SSC.quoteStore.clear();

            const form = document.getElementById('quoteForm');
            if (form) form.reset();

            this.transitionTo('success', () => {
                const heading = document.querySelector('.quote-success-heading');
                if (heading) {
                    heading.setAttribute('tabindex', '-1');
                    heading.focus();
                }
            });

            // Compact payload only. The tracker's endpoint SILENTLY replaces
            // any eventData over 5,000 characters with {} and still returns
            // 200, so sending the configuration blob here would look like
            // healthy traffic carrying nothing.
            const tracker = window.analyticsTracker;
            if (tracker && typeof tracker.trackEvent === 'function') {
                tracker.trackEvent('quote_submit_success', {
                    model: config.modelId,
                    total: config.total,
                    options: config.selections.length
                });
            }
        }
    }

    // ============================================
    // Create instance (deferred until DOM ready)
    // ============================================
    let modalManager = null;

    function initModalManager() {
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
