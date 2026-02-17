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

    // ============================================
    // Modal Manager
    // ============================================
    class ModalManager {
        constructor() {
            this.modal = document.getElementById('saunaModal');
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

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.close();
                }
            });

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

            this.updateSpecs();
            this.updateImages();
            this.updatePrices();
            this.handleHeaterOptions();
            this.resetForm();
            this.calculateTotal();

            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        close() {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
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
                if (input.value === '0' || input.value === 'included') {
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
                'input[name="wifi"]',               // WiFi controller (if it exists)
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
                        } else if (input.type === 'radio' && (input.value === '0' || input.value === 'included')) {
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

        requestQuote() {
            if (!currentModel) return;

            // Build configuration summary
            let config = `${currentModel.name}\n`;
            config += `Base Price: ${formatCurrency(currentModel.basePrice)}\n\n`;
            config += 'Selected Options:\n';

            document.querySelectorAll('.modal-addons input[type="radio"]:checked').forEach((input) => {
                const value = input.value;
                if (value !== '0') {
                    const addonOption = input.closest('.addon-option');
                    const label = addonOption ? addonOption.querySelector('.addon-label') : null;
                    const price = addonOption ? addonOption.querySelector('.addon-price') : null;
                    if (label && price) {
                        config += `\u2022 ${label.textContent} ${price.textContent}\n`;
                    }
                }
            });

            document.querySelectorAll('.modal-addons input[type="checkbox"]:checked').forEach((input) => {
                const addonOption = input.closest('.addon-option');
                const label = addonOption ? addonOption.querySelector('.addon-label') : null;
                const price = addonOption ? addonOption.querySelector('.addon-price') : null;
                if (label && price) {
                    config += `\u2022 ${label.textContent} ${price.textContent}\n`;
                }
            });

            const summaryTotalEl = document.getElementById('summaryTotal');
            const total = summaryTotalEl ? summaryTotalEl.textContent : '';
            config += `\nEstimated Total: ${total}`;

            // Close modal and navigate to contact with config data
            this.close();
            sessionStorage.setItem('ssc_quote_config', config);
            window.location.href = '/contact/';
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
