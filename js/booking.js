/**
 * Secret Sauna Company - Booking Module
 * Calendar, time slots, and reservation system
 */
(function() {
    'use strict';

    // ============================================
    // Booking Manager
    // ============================================
    function BookingManager() {
        this.selectedDate = null;
        this.selectedTime = null;
        this.serverSlots = {};
        this.currentSlots = [];
        this.currentMonth = new Date();
    }

    BookingManager.prototype.fetchSlots = function(dateKey) {
        var self = this;
        if (this.serverSlots[dateKey]) {
            return Promise.resolve(this.serverSlots[dateKey]);
        }

        var BOOKING_CONFIG = window.BOOKING_CONFIG || window.SSC.BOOKING_CONFIG;
        return fetch(BOOKING_CONFIG.availabilityEndpoint + '?date=' + dateKey)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Unable to load availability');
                }
                return response.json();
            })
            .then(function(data) {
                self.serverSlots[dateKey] = data.slots || [];
                return self.serverSlots[dateKey];
            });
    };

    BookingManager.prototype.clearSlotsCache = function(dateKey) {
        delete this.serverSlots[dateKey];
    };

    // Format date as YYYY-MM-DD
    BookingManager.prototype.formatDateKey = function(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    };

    // Format date for display
    BookingManager.prototype.formatDateDisplay = function(date) {
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    BookingManager.prototype.isDateBlocked = function(date) {
        var BOOKING_CONFIG = window.BOOKING_CONFIG || window.SSC.BOOKING_CONFIG;
        var dateKey = this.formatDateKey(date);
        return (BOOKING_CONFIG.blockedDates || []).indexOf(dateKey) !== -1;
    };

    // Generate available time slots for a given date
    BookingManager.prototype.getAvailableSlots = function(date, bookingType) {
        var self = this;
        var BOOKING_CONFIG = window.BOOKING_CONFIG || window.SSC.BOOKING_CONFIG;

        if (this.isDateBlocked(date)) {
            this.currentSlots = [];
            return Promise.resolve([]);
        }

        var dateKey = this.formatDateKey(date);
        return this.fetchSlots(dateKey).then(function(slots) {
            var now = new Date();
            var earliestBookable = new Date(now.getTime() + BOOKING_CONFIG.minAdvanceHours * 60 * 60 * 1000);

            self.currentSlots = slots.map(function(slot) {
                return {
                    start: slot.start,
                    end: slot.end,
                    status: slot.status,
                    booked_social: slot.booked_social,
                    available_social: slot.available_social,
                    display: self.formatTimeRange(slot.start, slot.end)
                };
            });

            return self.currentSlots.filter(function(slot) {
                var slotDateTime = new Date(dateKey + 'T' + slot.start + ':00');
                if (slotDateTime < earliestBookable) return false;
                if (slot.status !== 'open') return false;
                if (bookingType === 'private') return slot.booked_social === 0;
                return slot.available_social > 0;
            });
        });
    };

    // Format time range for display
    BookingManager.prototype.formatTimeRange = function(start, end) {
        var formatTime = function(time) {
            var parts = time.split(':');
            var hour = parseInt(parts[0]);
            var min = parts[1];
            var ampm = hour >= 12 ? 'PM' : 'AM';
            var h12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return h12 + ':' + min + ' ' + ampm;
        };

        return formatTime(start) + ' - ' + formatTime(end);
    };

    // Check if a date is bookable
    BookingManager.prototype.isDateBookable = function(date) {
        var BOOKING_CONFIG = window.BOOKING_CONFIG || window.SSC.BOOKING_CONFIG;

        if (this.isDateBlocked(date)) {
            return false;
        }

        var now = new Date();
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + BOOKING_CONFIG.maxAdvanceDays);

        var checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        // Basic checks: future date, within max advance days, operating day
        if (checkDate < today ||
            checkDate > maxDate ||
            BOOKING_CONFIG.operatingDays.indexOf(date.getDay()) === -1) {
            return false;
        }

        // Check if at least one time slot would be available (outside 18-hour window)
        var earliestBookable = new Date(now.getTime() + BOOKING_CONFIG.minAdvanceHours * 60 * 60 * 1000);
        var dateKey = this.formatDateKey(date);

        return BOOKING_CONFIG.slots.some(function(slot) {
            var slotDateTime = new Date(dateKey + 'T' + slot.start + ':00');
            return slotDateTime >= earliestBookable;
        });
    };

    // ============================================
    // Booking Calendar
    // ============================================
    function BookingCalendar(containerId) {
        this.container = document.getElementById(containerId);
        this.currentMonth = new Date();
        this.currentMonth.setDate(1); // First day of month
    }

    BookingCalendar.prototype.render = function() {
        if (!this.container) return;

        var year = this.currentMonth.getFullYear();
        var month = this.currentMonth.getMonth();

        // Calendar header
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

        var html = '\n            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">\n                <button type="button" onclick="bookingCalendar.previousMonth()" style="background: none; border: none; color: var(--color-off-white); font-size: 1.5rem; cursor: pointer; padding: 0.5rem; min-width: 44px; min-height: 44px;">&lsaquo;</button>\n                <h4 style="margin: 0; font-size: 1.1rem;">' + monthNames[month] + ' ' + year + '</h4>\n                <button type="button" onclick="bookingCalendar.nextMonth()" style="background: none; border: none; color: var(--color-off-white); font-size: 1.5rem; cursor: pointer; padding: 0.5rem; min-width: 44px; min-height: 44px;">&rsaquo;</button>\n            </div>\n            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center; min-width: 0;">\n        ';

        // Day headers
        var dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        dayNames.forEach(function(day) {
            html += '<div style="padding: 0.35rem 0; font-size: 0.7rem; color: #888; font-weight: 500;">' + day + '</div>';
        });

        // Get first day of month and number of days
        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty cells for days before month starts
        for (var i = 0; i < firstDay; i++) {
            html += '<div></div>';
        }

        // Day cells
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for (var day = 1; day <= daysInMonth; day++) {
            var date = new Date(year, month, day);
            var isBookable = bookingManager.isDateBookable(date);
            var isToday = date.getTime() === today.getTime();
            var isSelected = bookingManager.selectedDate &&
                           date.getTime() === bookingManager.selectedDate.getTime();

            var cellStyle = 'padding: 0.5rem 0.25rem; cursor: pointer; border-radius: 4px; transition: all 0.2s; font-size: 0.9rem; min-width: 0; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;';

            if (!isBookable) {
                cellStyle += 'color: #444; cursor: not-allowed;';
            } else if (isSelected) {
                cellStyle += 'background: var(--color-warm-wood); color: #000; font-weight: 600;';
            } else if (isToday) {
                cellStyle += 'border: 1px solid var(--color-warm-wood); color: var(--color-warm-wood);';
            } else {
                cellStyle += 'color: var(--color-off-white);';
            }

            var onclick = isBookable ? 'onclick="bookingCalendar.selectDate(new Date(' + year + ', ' + month + ', ' + day + '))"' : '';
            var hoverStyle = isBookable && !isSelected ? 'onmouseover="this.style.background=\'rgba(184,156,104,0.2)\'" onmouseout="this.style.background=\'transparent\'"' : '';

            html += '<div style="' + cellStyle + '" ' + onclick + ' ' + hoverStyle + '>' + day + '</div>';
        }

        html += '</div>';
        this.container.innerHTML = html;
    };

    BookingCalendar.prototype.selectDate = function(date) {
        bookingManager.selectedDate = date;
        bookingManager.selectedTime = null; // Reset time selection
        this.render();
        refreshBookingUI();
    };

    BookingCalendar.prototype.nextMonth = function() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.render();
    };

    BookingCalendar.prototype.previousMonth = function() {
        // Don't go before current month
        var today = new Date();
        today.setDate(1);
        today.setHours(0, 0, 0, 0);

        var prevMonth = new Date(this.currentMonth);
        prevMonth.setMonth(prevMonth.getMonth() - 1);

        if (prevMonth >= today) {
            this.currentMonth = prevMonth;
            this.render();
        }
    };

    // ============================================
    // Time Slots Rendering
    // ============================================
    function renderTimeSlots() {
        var container = document.getElementById('timeSlots');
        var noSlotsMsg = document.getElementById('noSlotsMessage');

        if (!container) return Promise.resolve();

        if (!bookingManager.selectedDate) {
            container.innerHTML = '';
            if (noSlotsMsg) noSlotsMsg.style.display = 'block';
            return Promise.resolve();
        }

        if (noSlotsMsg) noSlotsMsg.style.display = 'none';
        var bookingType = getSelectedBookingType();

        return bookingManager.getAvailableSlots(bookingManager.selectedDate, bookingType)
            .then(function(slots) {
                if (slots.length === 0) {
                    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 1rem;">No available time slots for this date</p>';
                    return;
                }

                if (bookingManager.selectedTime && !slots.some(function(slot) { return slot.start === bookingManager.selectedTime; })) {
                    bookingManager.selectedTime = null;
                }

                container.innerHTML = slots.map(function(slot) {
                    var isSelected = bookingManager.selectedTime === slot.start;
                    var bgColor = isSelected ? 'var(--color-warm-wood)' : 'var(--color-bg-dark)';
                    var textColor = isSelected ? '#000' : 'var(--color-off-white)';
                    var borderColor = isSelected ? 'var(--color-warm-wood)' : 'var(--color-border-subtle)';
                    var spotsLeft = bookingType === 'social' ? '<div style="font-size: 0.75rem; color: ' + (isSelected ? '#000' : '#888') + '; margin-top: 0.35rem;">' + slot.available_social + ' spots left</div>' : '';

                    return '\n                    <button type="button"\n                            onclick="selectTimeSlot(\'' + slot.start + '\')"\n                            style="padding: 1rem; background: ' + bgColor + '; border: 1px solid ' + borderColor + '; color: ' + textColor + '; cursor: pointer; transition: all 0.2s; border-radius: 4px; font-size: 0.9rem;"\n                            onmouseover="if(!this.classList.contains(\'selected\')) this.style.background=\'rgba(184,156,104,0.2)\'"\n                            onmouseout="if(!this.classList.contains(\'selected\')) this.style.background=\'var(--color-bg-dark)\'"\n                            class="' + (isSelected ? 'selected' : '') + '">\n                        ' + slot.display + '\n                        ' + spotsLeft + '\n                    </button>\n                ';
                }).join('');
            })
            .catch(function(error) {
                console.error('Availability error:', error);
                container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 1rem;">Unable to load availability. Please try again.</p>';
            });
    }

    function refreshBookingUI() {
        return renderTimeSlots()
            .then(updateBookingSummary)
            .catch(function() {
                updateBookingSummary();
            });
    }

    function selectTimeSlot(time) {
        bookingManager.selectedTime = time;
        refreshBookingUI();
    }

    // ============================================
    // Booking Type Selection
    // ============================================
    function getSelectedBookingType() {
        var privateRadio = document.querySelector('input[name="bookingType"][value="private"]');
        return privateRadio && privateRadio.checked ? 'private' : 'social';
    }

    function updateBookingTypeUI() {
        var BOOKING_CONFIG = window.BOOKING_CONFIG || window.SSC.BOOKING_CONFIG;
        var bookingType = getSelectedBookingType();
        var privateOption = document.getElementById('privateOption');
        var socialOption = document.getElementById('socialOption');
        var guestsLabel = document.getElementById('guestsLabel');
        var guestsInput = document.getElementById('bookingGuests');
        var summaryType = document.getElementById('summaryTypeBooking');

        if (privateOption && socialOption) {
            if (bookingType === 'private') {
                privateOption.style.borderColor = 'var(--color-warm-wood)';
                socialOption.style.borderColor = 'var(--color-border-subtle)';
                privateOption.querySelector('span').style.color = 'var(--color-warm-wood)';
                socialOption.querySelector('span').style.color = 'var(--color-off-white)';
            } else {
                socialOption.style.borderColor = 'var(--color-warm-wood)';
                privateOption.style.borderColor = 'var(--color-border-subtle)';
                socialOption.querySelector('span').style.color = 'var(--color-warm-wood)';
                privateOption.querySelector('span').style.color = 'var(--color-off-white)';
            }
        }

        // Update guest limits based on booking type
        if (guestsLabel && guestsInput) {
            if (bookingType === 'private') {
                guestsLabel.textContent = 'Number of Guests (1-' + BOOKING_CONFIG.privateMaxGuests + ') *';
                guestsInput.max = BOOKING_CONFIG.privateMaxGuests;
            } else {
                guestsLabel.textContent = 'Number of Spots (1-' + BOOKING_CONFIG.socialMaxGuests + ') *';
                guestsInput.max = BOOKING_CONFIG.socialMaxGuests;
                // Clamp value if over limit
                if (parseInt(guestsInput.value) > BOOKING_CONFIG.socialMaxGuests) {
                    guestsInput.value = BOOKING_CONFIG.socialMaxGuests;
                }
            }
        }

        if (summaryType) {
            summaryType.textContent = bookingType === 'private' ? 'Private Session' : 'Social Sauna';
        }

        refreshBookingUI();
    }

    // ============================================
    // Booking Summary Update
    // ============================================
    function updateBookingSummary() {
        var summary = document.getElementById('bookingSummary');
        var submitBtn = document.getElementById('bookingSubmitBtn');
        var summaryDate = document.getElementById('summaryDateBooking');
        var summaryTime = document.getElementById('summaryTimeBooking');
        var summaryGuests = document.getElementById('summaryGuestsBooking');
        var summaryTotal = document.getElementById('summaryTotalBooking');
        var guestsInput = document.getElementById('bookingGuests');

        if (!bookingManager.selectedDate || !bookingManager.selectedTime) {
            if (summary) summary.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.style.cursor = 'not-allowed';
            }
            return;
        }

        if (summary) summary.style.display = 'block';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }

        if (summaryDate) summaryDate.textContent = bookingManager.formatDateDisplay(bookingManager.selectedDate);

        var selectedSlot = (bookingManager.currentSlots || []).find(function(s) { return s.start === bookingManager.selectedTime; });
        if (summaryTime) summaryTime.textContent = selectedSlot ? selectedSlot.display : '-';

        // Update guests and calculate total based on booking type
        var bookingType = getSelectedBookingType();
        var numGuests = guestsInput ? parseInt(guestsInput.value) || 1 : 1;
        if (summaryGuests) summaryGuests.textContent = numGuests;

        // Calculate subtotal, taxes, and total
        var summarySubtotal = document.getElementById('summarySubtotalBooking');
        var summaryGST = document.getElementById('summaryGSTBooking');

        var subtotal = 0;
        if (bookingType === 'private') {
            subtotal = 300;
        } else {
            subtotal = numGuests * 39;
        }

        var gst = subtotal * 0.05;
        var total = subtotal + gst;

        if (summarySubtotal) summarySubtotal.textContent = '$' + subtotal.toFixed(2);
        if (summaryGST) summaryGST.textContent = '$' + gst.toFixed(2);
        if (summaryTotal) summaryTotal.textContent = '$' + total.toFixed(2);
    }

    // ============================================
    // Form Submission
    // ============================================
    function handleBookingSubmit(event) {
        event.preventDefault();

        var BOOKING_CONFIG = window.BOOKING_CONFIG || window.SSC.BOOKING_CONFIG;

        if (!bookingManager.selectedDate || !bookingManager.selectedTime) {
            alert('Please select a date and time for your booking.');
            return;
        }

        var bookingType = getSelectedBookingType();
        var numGuests = parseInt(document.getElementById('bookingGuests').value) || 1;
        var total = bookingType === 'private' ? 300 : numGuests * 39;
        var selectedSlot = (bookingManager.currentSlots || []).find(function(s) { return s.start === bookingManager.selectedTime; });

        if (!selectedSlot) {
            alert('Please select a valid time slot.');
            return;
        }

        if (bookingType === 'social' && selectedSlot.available_social < numGuests) {
            alert('Not enough spots are available for that time slot.');
            return;
        }

        var formData = {
            bookingType: bookingType,
            bookingTypeDisplay: bookingType === 'private' ? 'Private Session' : 'Social Sauna',
            date: bookingManager.formatDateDisplay(bookingManager.selectedDate),
            time: bookingManager.selectedTime,
            name: document.getElementById('bookingName').value,
            email: document.getElementById('bookingEmail').value,
            guests: numGuests,
            notes: document.getElementById('bookingNotes').value,
            dateKey: bookingManager.formatDateKey(bookingManager.selectedDate),
            total: total
        };

        var submitBtn = document.getElementById('bookingSubmitBtn');
        var originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        var emailFailed = false;

        // Reserve slot in backend to prevent double booking
        fetch(BOOKING_CONFIG.reserveEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: formData.dateKey,
                start_time: formData.time,
                end_time: selectedSlot.end,
                booking_type: bookingType,
                guests: numGuests,
                name: formData.name,
                email: formData.email,
                notes: formData.notes || ''
            })
        })
        .then(function(reserveResponse) {
            return reserveResponse.json().catch(function() { return {}; }).then(function(reservePayload) {
                if (!reserveResponse.ok) {
                    throw new Error(reservePayload.error || 'Selected slot is no longer available');
                }
                return reservePayload;
            });
        })
        .then(function() {
            // Send to Formspree (or your email service)
            return fetch(BOOKING_CONFIG.formEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: 'New ' + formData.bookingTypeDisplay + ' Booking - ' + formData.date,
                    message: '\nNew Booking Request:\n\nType: ' + formData.bookingTypeDisplay + '\nDate: ' + formData.date + '\nTime: ' + formData.time + '\nName: ' + formData.name + '\nEmail: ' + formData.email + '\nGuests: ' + formData.guests + '\nNotes: ' + (formData.notes || 'None') + '\n\nTotal: $' + formData.total + (formData.bookingType === 'social' ? ' ($39 x ' + formData.guests + ' spots)' : ' (flat rate)') + '\n                '
                })
            });
        })
        .then(function(response) {
            if (!response.ok) {
                console.warn('Booking email notification failed.');
                emailFailed = true;
            }

            // Show success message
            var emailNote = emailFailed ? '\n\nNote: We received your booking, but email delivery failed. If you don\'t hear from us within 24 hours, please email us directly.' : '';
            alert('Thank you for your ' + formData.bookingTypeDisplay + ' booking request!\n\nDate: ' + formData.date + '\nTime: ' + formData.time + '\nTotal: $' + formData.total + '\n\nWe\'ll send you a confirmation email within 24 hours with payment details and final instructions.' + emailNote);

            // Reset form
            document.getElementById('bookingForm').reset();
            bookingManager.selectedDate = null;
            bookingManager.selectedTime = null;
            bookingManager.clearSlotsCache(formData.dateKey);
            bookingCalendar.render();
            refreshBookingUI();
        })
        .catch(function(error) {
            console.error('Booking error:', error);
            alert('There was an error submitting your booking. Please try again or contact us directly at secretsaunacompany@gmail.com');
        })
        .finally(function() {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    }

    // ============================================
    // Initialize Booking System
    // ============================================
    var bookingManager = new BookingManager();
    var bookingCalendar = null;

    function initBookingSystem() {
        if (document.getElementById('bookingCalendar')) {
            bookingCalendar = new BookingCalendar('bookingCalendar');
            bookingCalendar.render();
            window.bookingCalendar = bookingCalendar;
            refreshBookingUI().catch(function() {});
        }
    }

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC = window.SSC || {};
    window.SSC.bookingManager = bookingManager;
    window.SSC.initBookingSystem = initBookingSystem;

    // Global functions
    window.bookingManager = bookingManager;
    window.initBookingSystem = initBookingSystem;
    window.selectTimeSlot = selectTimeSlot;
    window.handleBookingSubmit = handleBookingSubmit;
    window.updateBookingTypeUI = updateBookingTypeUI;
    window.updateBookingSummary = updateBookingSummary;

})();
