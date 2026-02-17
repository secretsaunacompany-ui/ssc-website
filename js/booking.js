/**
 * Secret Sauna Company - Booking Module
 * Calendar, time slots, and reservation system
 */
(function() {
    'use strict';

    // Ensure SSC namespace exists before hoisting config
    window.SSC = window.SSC || {};
    const BOOKING_CONFIG = window.SSC.BOOKING_CONFIG;

    // ============================================
    // Booking Manager
    // ============================================
    class BookingManager {
        constructor() {
            this.selectedDate = null;
            this.selectedTime = null;
            this.serverSlots = {};
            this.currentSlots = [];
            this.currentMonth = new Date();
        }

        fetchSlots(dateKey) {
            if (this.serverSlots[dateKey]) {
                return Promise.resolve(this.serverSlots[dateKey]);
            }

            return fetch(`${BOOKING_CONFIG.availabilityEndpoint}?date=${dateKey}`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Unable to load availability');
                    }
                    return response.json();
                })
                .then((data) => {
                    this.serverSlots[dateKey] = data.slots || [];
                    return this.serverSlots[dateKey];
                });
        }

        clearSlotsCache(dateKey) {
            delete this.serverSlots[dateKey];
        }

        // Format date as YYYY-MM-DD
        formatDateKey(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Format date for display
        formatDateDisplay(date) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }

        // Generate available time slots for a given date
        getAvailableSlots(date, bookingType) {
            const dateKey = this.formatDateKey(date);
            return this.fetchSlots(dateKey).then((slots) => {
                const now = new Date();
                const earliestBookable = new Date(now.getTime() + BOOKING_CONFIG.minAdvanceHours * 60 * 60 * 1000);

                this.currentSlots = slots.map((slot) => ({
                    start: slot.start,
                    end: slot.end,
                    status: slot.status,
                    booked_social: slot.booked_social,
                    available_social: slot.available_social,
                    display: this.formatTimeRange(slot.start, slot.end)
                }));

                return this.currentSlots.filter((slot) => {
                    const slotDateTime = new Date(`${dateKey}T${slot.start}:00`);
                    if (slotDateTime < earliestBookable) return false;
                    if (slot.status !== 'open') return false;
                    if (bookingType === 'private') return slot.booked_social === 0;
                    return slot.available_social > 0;
                });
            });
        }

        // Format time range for display
        formatTimeRange(start, end) {
            const formatTime = (time) => {
                const parts = time.split(':');
                const hour = parseInt(parts[0]);
                const min = parts[1];
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const h12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                return `${h12}:${min} ${ampm}`;
            };

            return `${formatTime(start)} - ${formatTime(end)}`;
        }

        // Check if a date is bookable
        isDateBookable(date) {
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + BOOKING_CONFIG.maxAdvanceDays);

            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);

            // Basic checks: future date, within max advance days, operating day
            if (checkDate < today ||
                checkDate > maxDate ||
                !BOOKING_CONFIG.operatingDays.includes(date.getDay())) {
                return false;
            }

            // Check if at least one time slot would be available (outside 18-hour window)
            const earliestBookable = new Date(now.getTime() + BOOKING_CONFIG.minAdvanceHours * 60 * 60 * 1000);
            const dateKey = this.formatDateKey(date);

            return BOOKING_CONFIG.slots.some((slot) => {
                const slotDateTime = new Date(`${dateKey}T${slot.start}:00`);
                return slotDateTime >= earliestBookable;
            });
        }
    }

    // ============================================
    // Booking Calendar
    // ============================================
    class BookingCalendar {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            this.currentMonth = new Date();
            this.currentMonth.setDate(1); // First day of month
        }

        render() {
            if (!this.container) return;

            const year = this.currentMonth.getFullYear();
            const month = this.currentMonth.getMonth();

            // Calendar header
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December'];

            let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <button type="button" data-action="cal-prev" style="background: none; border: none; color: var(--color-off-white); font-size: 1.5rem; cursor: pointer; padding: 0.5rem; min-width: 44px; min-height: 44px;">&lsaquo;</button>
                <h4 style="margin: 0; font-size: 1.1rem;">${monthNames[month]} ${year}</h4>
                <button type="button" data-action="cal-next" style="background: none; border: none; color: var(--color-off-white); font-size: 1.5rem; cursor: pointer; padding: 0.5rem; min-width: 44px; min-height: 44px;">&rsaquo;</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center; min-width: 0;">
        `;

            // Day headers
            const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            dayNames.forEach((day) => {
                html += `<div style="padding: 0.35rem 0; font-size: 0.7rem; color: #888; font-weight: 500;">${day}</div>`;
            });

            // Get first day of month and number of days
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Empty cells for days before month starts
            for (let i = 0; i < firstDay; i++) {
                html += '<div></div>';
            }

            // Day cells
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const isBookable = bookingManager.isDateBookable(date);
                const isToday = date.getTime() === today.getTime();
                const isSelected = bookingManager.selectedDate &&
                               date.getTime() === bookingManager.selectedDate.getTime();

                let cellStyle = 'padding: 0.5rem 0.25rem; cursor: pointer; border-radius: 4px; transition: all 0.2s; font-size: 0.9rem; min-width: 0; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;';

                if (!isBookable) {
                    cellStyle += 'color: #444; cursor: not-allowed;';
                } else if (isSelected) {
                    cellStyle += 'background: var(--color-warm-wood); color: #000; font-weight: 600;';
                } else if (isToday) {
                    cellStyle += 'border: 1px solid var(--color-warm-wood); color: var(--color-warm-wood);';
                } else {
                    cellStyle += 'color: var(--color-off-white);';
                }

                const dataAttrs = isBookable ? `data-action="cal-select" data-year="${year}" data-month="${month}" data-day="${day}"` : '';
                const hoverClass = isBookable && !isSelected ? 'cal-day--hoverable' : '';

                html += `<div style="${cellStyle}" class="${hoverClass}" ${dataAttrs}>${day}</div>`;
            }

            html += '</div>';
            this.container.innerHTML = html;
        }

        selectDate(date) {
            bookingManager.selectedDate = date;
            bookingManager.selectedTime = null; // Reset time selection
            this.render();
            refreshBookingUI();
        }

        nextMonth() {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.render();
        }

        previousMonth() {
            // Don't go before current month
            const today = new Date();
            today.setDate(1);
            today.setHours(0, 0, 0, 0);

            const prevMonth = new Date(this.currentMonth);
            prevMonth.setMonth(prevMonth.getMonth() - 1);

            if (prevMonth >= today) {
                this.currentMonth = prevMonth;
                this.render();
            }
        }
    }

    // ============================================
    // Time Slots Rendering
    // ============================================
    function renderTimeSlots() {
        const container = document.getElementById('timeSlots');
        const noSlotsMsg = document.getElementById('noSlotsMessage');

        if (!container) return Promise.resolve();

        if (!bookingManager.selectedDate) {
            container.innerHTML = '';
            if (noSlotsMsg) noSlotsMsg.style.display = 'block';
            return Promise.resolve();
        }

        if (noSlotsMsg) noSlotsMsg.style.display = 'none';
        const bookingType = getSelectedBookingType();

        return bookingManager.getAvailableSlots(bookingManager.selectedDate, bookingType)
            .then((slots) => {
                if (slots.length === 0) {
                    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 1rem;">No available time slots for this date</p>';
                    return;
                }

                if (bookingManager.selectedTime && !slots.some((slot) => slot.start === bookingManager.selectedTime)) {
                    bookingManager.selectedTime = null;
                }

                container.innerHTML = slots.map((slot) => {
                    const isSelected = bookingManager.selectedTime === slot.start;
                    const bgColor = isSelected ? 'var(--color-warm-wood)' : 'var(--color-bg-dark)';
                    const textColor = isSelected ? '#000' : 'var(--color-off-white)';
                    const borderColor = isSelected ? 'var(--color-warm-wood)' : 'var(--color-border-subtle)';
                    const spotsLeft = bookingType === 'social' ? `<div style="font-size: 0.75rem; color: ${isSelected ? '#000' : '#888'}; margin-top: 0.35rem;">${slot.available_social} spots left</div>` : '';

                    return `
                    <button type="button"
                            data-action="select-time" data-time="${slot.start}"
                            style="padding: 1rem; background: ${bgColor}; border: 1px solid ${borderColor}; color: ${textColor}; cursor: pointer; transition: all 0.2s; border-radius: 4px; font-size: 0.9rem;"
                            class="${isSelected ? 'selected' : ''} time-slot--hoverable">
                        ${slot.display}
                        ${spotsLeft}
                    </button>
                `;
                }).join('');
            })
            .catch((error) => {
                console.error('Availability error:', error);
                container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 1rem;">Unable to load availability. Please try again.</p>';
            });
    }

    function refreshBookingUI() {
        return renderTimeSlots()
            .then(updateBookingSummary)
            .catch(() => {
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
        const privateRadio = document.querySelector('input[name="bookingType"][value="private"]');
        return privateRadio && privateRadio.checked ? 'private' : 'social';
    }

    function updateBookingTypeUI() {
        const bookingType = getSelectedBookingType();
        const privateOption = document.getElementById('privateOption');
        const socialOption = document.getElementById('socialOption');
        const guestsLabel = document.getElementById('guestsLabel');
        const guestsInput = document.getElementById('bookingGuests');
        const summaryType = document.getElementById('summaryTypeBooking');

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
                guestsLabel.textContent = `Number of Guests (1-${BOOKING_CONFIG.privateMaxGuests}) *`;
                guestsInput.max = BOOKING_CONFIG.privateMaxGuests;
            } else {
                guestsLabel.textContent = `Number of Spots (1-${BOOKING_CONFIG.socialMaxGuests}) *`;
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
        const summary = document.getElementById('bookingSummary');
        const submitBtn = document.getElementById('bookingSubmitBtn');
        const summaryDate = document.getElementById('summaryDateBooking');
        const summaryTime = document.getElementById('summaryTimeBooking');
        const summaryGuests = document.getElementById('summaryGuestsBooking');
        const summaryTotal = document.getElementById('summaryTotalBooking');
        const guestsInput = document.getElementById('bookingGuests');

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

        const selectedSlot = (bookingManager.currentSlots || []).find((s) => s.start === bookingManager.selectedTime);
        if (summaryTime) summaryTime.textContent = selectedSlot ? selectedSlot.display : '-';

        // Update guests and calculate total based on booking type
        const bookingType = getSelectedBookingType();
        const numGuests = guestsInput ? parseInt(guestsInput.value) || 1 : 1;
        if (summaryGuests) summaryGuests.textContent = numGuests;

        // Calculate subtotal, taxes, and total
        const summarySubtotal = document.getElementById('summarySubtotalBooking');
        const summaryGST = document.getElementById('summaryGSTBooking');

        let subtotal = 0;
        if (bookingType === 'private') {
            subtotal = 500;
        } else {
            subtotal = numGuests * 45;
        }

        const gst = subtotal * 0.05;
        const total = subtotal + gst;

        if (summarySubtotal) summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
        if (summaryGST) summaryGST.textContent = `$${gst.toFixed(2)}`;
        if (summaryTotal) summaryTotal.textContent = `$${total.toFixed(2)}`;
    }

    // ============================================
    // Form Submission
    // ============================================
    function handleBookingSubmit(event) {
        event.preventDefault();

        if (!bookingManager.selectedDate || !bookingManager.selectedTime) {
            alert('Please select a date and time for your booking.');
            return;
        }

        const bookingType = getSelectedBookingType();
        const numGuests = parseInt(document.getElementById('bookingGuests').value) || 1;
        const total = bookingType === 'private' ? 500 : numGuests * 45;
        const selectedSlot = (bookingManager.currentSlots || []).find((s) => s.start === bookingManager.selectedTime);

        if (!selectedSlot) {
            alert('Please select a valid time slot.');
            return;
        }

        if (bookingType === 'social' && selectedSlot.available_social < numGuests) {
            alert('Not enough spots are available for that time slot.');
            return;
        }

        const formData = {
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

        const submitBtn = document.getElementById('bookingSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        let emailFailed = false;

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
        .then((reserveResponse) => {
            return reserveResponse.json().catch(() => ({})).then((reservePayload) => {
                if (!reserveResponse.ok) {
                    throw new Error(reservePayload.error || 'Selected slot is no longer available');
                }
                return reservePayload;
            });
        })
        .then(() => {
            // Send to Formspree (or your email service)
            return fetch(BOOKING_CONFIG.formEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: `New ${formData.bookingTypeDisplay} Booking - ${formData.date}`,
                    message: `\nNew Booking Request:\n\nType: ${formData.bookingTypeDisplay}\nDate: ${formData.date}\nTime: ${formData.time}\nName: ${formData.name}\nEmail: ${formData.email}\nGuests: ${formData.guests}\nNotes: ${formData.notes || 'None'}\n\nTotal: $${formData.total}${formData.bookingType === 'social' ? ` ($45 x ${formData.guests} spots)` : ' (flat rate)'}\n                `
                })
            });
        })
        .then((response) => {
            if (!response.ok) {
                console.warn('Booking email notification failed.');
                emailFailed = true;
            }

            // Show success message
            const emailNote = emailFailed ? '\n\nNote: We received your booking, but email delivery failed. If you don\'t hear from us within 24 hours, please email us directly.' : '';
            alert(`Thank you for your ${formData.bookingTypeDisplay} booking request!\n\nDate: ${formData.date}\nTime: ${formData.time}\nTotal: $${formData.total}\n\nWe'll send you a confirmation email within 24 hours with payment details and final instructions.${emailNote}`);

            // Reset form
            document.getElementById('bookingForm').reset();
            bookingManager.selectedDate = null;
            bookingManager.selectedTime = null;
            bookingManager.clearSlotsCache(formData.dateKey);
            bookingCalendar.render();
            refreshBookingUI();
        })
        .catch((error) => {
            console.error('Booking error:', error);
            alert('There was an error submitting your booking. Please try again or contact us directly at secretsaunacompany@gmail.com');
        })
        .finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    }

    // ============================================
    // Initialize Booking System
    // ============================================
    const bookingManager = new BookingManager();
    let bookingCalendar = null;

    function initBookingSystem() {
        if (document.getElementById('bookingCalendar')) {
            bookingCalendar = new BookingCalendar('bookingCalendar');
            bookingCalendar.render();
            window.SSC.bookingCalendar = bookingCalendar;
            refreshBookingUI().catch(() => {});
        }
    }

    // ============================================
    // Internal event delegation for dynamic elements
    // ============================================
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'cal-prev':
                if (bookingCalendar) bookingCalendar.previousMonth();
                break;
            case 'cal-next':
                if (bookingCalendar) bookingCalendar.nextMonth();
                break;
            case 'cal-select':
                if (bookingCalendar) {
                    const date = new Date(
                        parseInt(target.dataset.year),
                        parseInt(target.dataset.month),
                        parseInt(target.dataset.day)
                    );
                    bookingCalendar.selectDate(date);
                }
                break;
            case 'select-time':
                selectTimeSlot(target.dataset.time);
                break;
        }
    });

    // CSS-based hover for dynamic calendar/time elements
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('.cal-day--hoverable, .time-slot--hoverable:not(.selected)');
        if (target) target.style.background = 'rgba(184,156,104,0.2)';
    });
    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('.cal-day--hoverable, .time-slot--hoverable:not(.selected)');
        if (target) target.style.background = target.classList.contains('selected') ? '' : (target.classList.contains('time-slot--hoverable') ? 'var(--color-bg-dark)' : 'transparent');
    });

    // ============================================
    // Export to global scope
    // ============================================
    window.SSC.bookingManager = bookingManager;
    window.SSC.initBookingSystem = initBookingSystem;
    window.SSC.handleBookingSubmit = handleBookingSubmit;
    window.SSC.updateBookingTypeUI = updateBookingTypeUI;
    window.SSC.updateBookingSummary = updateBookingSummary;

})();
