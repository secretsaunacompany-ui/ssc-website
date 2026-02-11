/**
 * Secret Sauna Company - Modal Module
 * Sauna configuration modal functionality
 */
(function() {
    'use strict';

    // ============================================
    // State Management
    // ============================================
    var currentModel = null;
    var currentImageIndex = 0;

    // ============================================
    // Modal Manager
    // ============================================
    function ModalManager() {
        this.modal = document.getElementById('saunaModal');
        this.initEventListeners();
    }

    ModalManager.prototype.initEventListeners = function() {
        var self = this;

        // Close on overlay click
        if (this.modal) {
            this.modal.addEventListener('click', function(e) {
                if (e.target === self.modal) {
                    self.close();
                }
            });
        }

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                self.close();
            }
        });

        // Initialize price calculation listeners
        var setupAddonListeners = function() {
            document.querySelectorAll('.modal-addons input').forEach(function(input) {
                input.addEventListener('change', function() { self.calculateTotal(); });
            });
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupAddonListeners);
        } else {
            setupAddonListeners();
        }
    };

    ModalManager.prototype.open = function(modelId) {
        var saunaModels = window.saunaModels || window.SSC.saunaModels;
        currentModel = saunaModels[modelId];
        if (!currentModel) return;

        this.updateSpecs();
        this.updateImages();
        this.updatePrices();
        this.handleHeaterOptions();
        this.resetForm();
        this.calculateTotal();

        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    ModalManager.prototype.close = function() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    ModalManager.prototype.updateSpecs = function() {
        var setText = window.setText || window.SSC.setText;
        var formatCurrency = window.formatCurrency || window.SSC.formatCurrency;

        setText('modalTitle', currentModel.name);
        setText('specSize', currentModel.size);
        setText('specCapacity', currentModel.capacity);
        setText('specPrice', formatCurrency(currentModel.basePrice));
        setText('specHeater', currentModel.heater);
    };

    ModalManager.prototype.updateImages = function() {
        var self = this;
        currentImageIndex = 0;
        var mainMedia = document.getElementById('modalMainMedia');
        if (mainMedia) {
            var mediaUrl = currentModel.images[0];
            this.renderMainMedia(mainMedia, mediaUrl, currentModel.name + ' - Main view');
        }

        var thumbnailsContainer = document.getElementById('modalThumbnails');
        if (thumbnailsContainer) {
            thumbnailsContainer.innerHTML = currentModel.images
                .map(function(mediaUrl, index) {
                    var thumbnail = self.getThumbnailUrl(mediaUrl);

                    return '\n                        <img\n                            src="' + thumbnail + '"\n                            class="modal-thumbnail ' + (index === 0 ? 'active' : '') + '"\n                            onclick="modalManager.setMainImage(' + index + ')"\n                            alt="' + currentModel.name + ' - View ' + (index + 1) + '"\n                            loading="lazy"\n                        >\n                    ';
                }).join('');
        }
    };

    ModalManager.prototype.isVideoUrl = function(url) {
        return url.indexOf('/video/upload/') !== -1 ||
               url.indexOf('.mp4') !== -1 ||
               url.indexOf('.mov') !== -1 ||
               url.indexOf('.TS') !== -1 ||
               url.indexOf('.webm') !== -1 ||
               url.indexOf('.ogv') !== -1;
    };

    ModalManager.prototype.getThumbnailUrl = function(mediaUrl) {
        var self = this;
        if (!this.isVideoUrl(mediaUrl)) {
            return mediaUrl;
        }

        return currentModel.images.find(function(url) { return !self.isVideoUrl(url); }) || mediaUrl;
    };

    ModalManager.prototype.renderMainMedia = function(container, mediaUrl, altText) {
        if (!container) return;
        var isVideo = this.isVideoUrl(mediaUrl);

        if (isVideo) {
            // Convert Cloudinary video URL to MP4 format with proper codec
            var videoUrl = mediaUrl.replace('/upload/', '/upload/vc_h264/');
            container.innerHTML = '\n                <video controls autoplay muted loop playsinline preload="metadata" style="background: #000;">\n                    <source src="' + videoUrl + '" type="video/mp4">\n                    Your browser does not support the video tag.\n                </video>\n            ';
            return;
        }

        container.innerHTML = '\n            <img src="' + mediaUrl + '" alt="' + altText + '">\n        ';
    };

    ModalManager.prototype.updatePrices = function() {
        var formatCurrency = window.formatCurrency || window.SSC.formatCurrency;
        var upgradePrice = '+' + formatCurrency(currentModel.interiorUpgrade);
        var clearCedarPrice = document.getElementById('clearCedarPrice');
        var thermowoodPrice = document.getElementById('thermowoodPrice');
        if (clearCedarPrice) clearCedarPrice.textContent = upgradePrice;
        if (thermowoodPrice) thermowoodPrice.textContent = upgradePrice;

        // Update Premium Finish Package price
        var premiumFinishPrice = document.getElementById('premiumFinishPrice');
        if (premiumFinishPrice && currentModel.premiumFinishPrice) {
            premiumFinishPrice.textContent = '+' + formatCurrency(currentModel.premiumFinishPrice);
        }
    };

    ModalManager.prototype.handleHeaterOptions = function() {
        var woodUpgrade = document.getElementById('heaterWoodUpgrade');
        if (!woodUpgrade) return;

        if (currentModel.electricOnly) {
            woodUpgrade.classList.add('disabled');
            var input = woodUpgrade.querySelector('input');
            if (input) input.disabled = true;
        } else {
            woodUpgrade.classList.remove('disabled');
            var input = woodUpgrade.querySelector('input');
            if (input) input.disabled = false;
        }
    };

    ModalManager.prototype.resetForm = function() {
        var formatCurrency = window.formatCurrency || window.SSC.formatCurrency;

        // Reset radio buttons to default
        document.querySelectorAll('.modal-addons input[type="radio"]').forEach(function(input) {
            if (input.value === '0' || input.value === 'included') {
                input.checked = true;
            }
            // Re-enable all inputs
            input.disabled = false;
            var addonOption = input.closest('.addon-option');
            if (addonOption) addonOption.classList.remove('disabled');
        });

        // Reset checkboxes
        document.querySelectorAll('.modal-addons input[type="checkbox"]').forEach(function(input) {
            input.checked = false;
            // Re-enable all inputs
            input.disabled = false;
            var addonOption = input.closest('.addon-option');
            if (addonOption) addonOption.classList.remove('disabled');
        });

        // Update base price display
        var summaryBase = document.getElementById('summaryBase');
        if (summaryBase) {
            summaryBase.textContent = formatCurrency(currentModel.basePrice);
        }
    };

    ModalManager.prototype.setMainImage = function(index) {
        currentImageIndex = index;
        var mainMedia = document.getElementById('modalMainMedia');
        if (mainMedia) {
            var mediaUrl = currentModel.images[index];
            this.renderMainMedia(mainMedia, mediaUrl, currentModel.name + ' - View ' + (index + 1));
        }

        document.querySelectorAll('.modal-thumbnail').forEach(function(thumb, i) {
            thumb.classList.toggle('active', i === index);
        });
    };

    ModalManager.prototype.calculateTotal = function() {
        if (!currentModel) return;

        var formatCurrency = window.formatCurrency || window.SSC.formatCurrency;
        var total = currentModel.basePrice;
        var addonsHTML = '';

        // Process radio button selections
        document.querySelectorAll('.modal-addons input[type="radio"]:checked').forEach(function(input) {
            var value = input.value;

            if (value === 'interiorUpgrade') {
                value = currentModel.interiorUpgrade;
            } else if (value === 'premiumFinishPrice') {
                value = currentModel.premiumFinishPrice;
            } else {
                value = parseInt(value) || 0;
            }

            if (value > 0) {
                total += value;
                var addonOption = input.closest('.addon-option');
                var label = addonOption ? addonOption.querySelector('.addon-label') : null;
                if (label) {
                    addonsHTML += '\n                        <div class="price-row addon">\n                            <span>' + label.textContent + '</span>\n                            <span>+' + formatCurrency(value) + '</span>\n                        </div>\n                    ';
                }
            }
        });

        // Process checkbox selections
        document.querySelectorAll('.modal-addons input[type="checkbox"]:checked').forEach(function(input) {
            var value = parseInt(input.value) || 0;
            if (value > 0) {
                total += value;
                var addonOption = input.closest('.addon-option');
                var label = addonOption ? addonOption.querySelector('.addon-label') : null;
                if (label) {
                    addonsHTML += '\n                        <div class="price-row addon">\n                            <span>' + label.textContent + '</span>\n                            <span>+' + formatCurrency(value) + '</span>\n                        </div>\n                    ';
                }
            }
        });

        var addonsList = document.getElementById('addonsList');
        if (addonsList) addonsList.innerHTML = addonsHTML;

        var summaryTotal = document.getElementById('summaryTotal');
        if (summaryTotal) summaryTotal.textContent = formatCurrency(total);
    };

    ModalManager.prototype.handlePremiumPackageChange = function() {
        var isPremiumSelected = document.querySelector('input[name="premiumPackage"][value="premiumFinishPrice"]:checked');

        // Elements that are included in Premium Finish Package
        var conflictingAddons = [
            'input[name="interior"]',           // Clear cedar interior
            'input[name="exterior"]',           // Cedar exterior
            'input[name="wifi"]',               // WiFi controller (if it exists)
            'input[data-addon="lighting"]',     // Lighting package
            'input[data-addon="speakers"]'      // Bluetooth speakers
        ];

        conflictingAddons.forEach(function(selector) {
            document.querySelectorAll(selector).forEach(function(input) {
                var addonOption = input.closest('.addon-option');
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
    };

    ModalManager.prototype.requestQuote = function() {
        if (!currentModel) return;

        var formatCurrency = window.formatCurrency || window.SSC.formatCurrency;

        // Build configuration summary
        var config = currentModel.name + '\n';
        config += 'Base Price: ' + formatCurrency(currentModel.basePrice) + '\n\n';
        config += 'Selected Options:\n';

        document.querySelectorAll('.modal-addons input[type="radio"]:checked').forEach(function(input) {
            var value = input.value;
            if (value !== '0') {
                var addonOption = input.closest('.addon-option');
                var label = addonOption ? addonOption.querySelector('.addon-label') : null;
                var price = addonOption ? addonOption.querySelector('.addon-price') : null;
                if (label && price) {
                    config += '\u2022 ' + label.textContent + ' ' + price.textContent + '\n';
                }
            }
        });

        document.querySelectorAll('.modal-addons input[type="checkbox"]:checked').forEach(function(input) {
            var addonOption = input.closest('.addon-option');
            var label = addonOption ? addonOption.querySelector('.addon-label') : null;
            var price = addonOption ? addonOption.querySelector('.addon-price') : null;
            if (label && price) {
                config += '\u2022 ' + label.textContent + ' ' + price.textContent + '\n';
            }
        });

        var summaryTotalEl = document.getElementById('summaryTotal');
        var total = summaryTotalEl ? summaryTotalEl.textContent : '';
        config += '\nEstimated Total: ' + total;

        // Close modal and navigate to contact with config data
        this.close();
        sessionStorage.setItem('ssc_quote_config', config);
        window.location.href = '/contact/';
    };

    // ============================================
    // Create instance (deferred until DOM ready)
    // ============================================
    var modalManager = null;

    function initModalManager() {
        if (!modalManager) {
            modalManager = new ModalManager();
            window.modalManager = modalManager;
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

    // Global functions for onclick handlers
    window.openModal = function(modelId) {
        initModalManager();
        modalManager.open(modelId);
    };
    window.closeModal = function() {
        if (modalManager) modalManager.close();
    };
    window.setMainImage = function(index) {
        if (modalManager) modalManager.setMainImage(index);
    };
    window.calculateTotal = function() {
        if (modalManager) modalManager.calculateTotal();
    };
    window.requestQuote = function() {
        if (modalManager) modalManager.requestQuote();
    };
    window.handlePremiumPackageChange = function() {
        if (modalManager) modalManager.handlePremiumPackageChange();
    };

})();
