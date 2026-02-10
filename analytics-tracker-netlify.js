/**
 * Website Analytics Tracker - Netlify Edition
 * Lightweight tracking script for collecting visitor data
 * Works with Netlify Functions backend
 */

(function() {
    'use strict';

    const TRACK_ENDPOINT = '/.netlify/functions/track';
    const SESSION_KEY = 'analytics_session_id';

    // Generate or retrieve session ID
    // SECURITY: Use cryptographically secure random values
    function getSessionId() {
        let sessionId = sessionStorage.getItem(SESSION_KEY);
        if (!sessionId) {
            // Use crypto API for secure random generation
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            const randomPart = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            sessionId = 'sess_' + randomPart;
            sessionStorage.setItem(SESSION_KEY, sessionId);
        }
        return sessionId;
    }

    // Get screen and viewport dimensions
    function getScreenInfo() {
        return {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };
    }

    // Track page view
    function trackPageView() {
        const data = {
            type: 'pageview',
            sessionId: getSessionId(),
            pageUrl: window.location.href,
            pageTitle: document.title,
            referrer: document.referrer,
            ...getScreenInfo()
        };

        sendData(data);
    }

    // Track custom event
    function trackEvent(eventType, eventData = {}) {
        const data = {
            type: 'event',
            sessionId: getSessionId(),
            eventType: eventType,
            eventData: eventData
        };

        sendData(data);
    }

    // Send data to Netlify Function
    function sendData(data) {
        // Use sendBeacon if available (won't be blocked on page unload)
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon(TRACK_ENDPOINT, blob);
        } else {
            // Fallback to fetch
            fetch(TRACK_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(err => console.error('Analytics error:', err));
        }
    }

    // Track time on page
    let startTime = Date.now();
    function trackTimeOnPage() {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        trackEvent('time_on_page', { seconds: timeSpent, page: window.location.pathname });
    }

    // Track scroll depth
    let maxScrollDepth = 0;
    let scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

    function trackScrollDepth() {
        const scrollPercentage = Math.round(
            ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
        );

        if (scrollPercentage > maxScrollDepth) {
            maxScrollDepth = scrollPercentage;

            // Track milestones
            if (maxScrollDepth >= 25 && !scrollMilestones[25]) {
                trackEvent('scroll_depth', { depth: 25 });
                scrollMilestones[25] = true;
            } else if (maxScrollDepth >= 50 && !scrollMilestones[50]) {
                trackEvent('scroll_depth', { depth: 50 });
                scrollMilestones[50] = true;
            } else if (maxScrollDepth >= 75 && !scrollMilestones[75]) {
                trackEvent('scroll_depth', { depth: 75 });
                scrollMilestones[75] = true;
            } else if (maxScrollDepth >= 100 && !scrollMilestones[100]) {
                trackEvent('scroll_depth', { depth: 100 });
                scrollMilestones[100] = true;
            }
        }
    }

    // Track clicks on specific elements
    function trackClicks() {
        document.addEventListener('click', function(e) {
            // Track CTA button clicks
            const target = e.target.closest('a.btn, button.btn');
            if (target) {
                trackEvent('cta_click', {
                    text: target.textContent.trim(),
                    href: target.href || null,
                    class: target.className
                });
            }

            // Track navigation clicks
            const navLink = e.target.closest('nav a');
            if (navLink) {
                trackEvent('nav_click', {
                    text: navLink.textContent.trim(),
                    href: navLink.href || null
                });
            }

            // Track social media links
            const socialLink = e.target.closest('a[href*="instagram"], a[href*="facebook"], a[href*="twitter"]');
            if (socialLink) {
                const platform = socialLink.href.includes('instagram') ? 'instagram' :
                                socialLink.href.includes('facebook') ? 'facebook' : 'twitter';
                trackEvent('social_click', { platform: platform });
            }

            // Track email clicks
            const emailLink = e.target.closest('a[href^="mailto:"]');
            if (emailLink) {
                trackEvent('email_click', { email: emailLink.href.replace('mailto:', '') });
            }

            // Track model card clicks
            const modelCard = e.target.closest('.model-card');
            if (modelCard) {
                trackEvent('model_view', {
                    model: modelCard.querySelector('h3')?.textContent || 'unknown'
                });
            }

            // Track outbound links
            const link = e.target.closest('a[href]');
            if (link && link.hostname !== window.location.hostname && link.href.startsWith('http')) {
                trackEvent('outbound_click', {
                    url: link.href,
                    text: link.textContent.trim()
                });
            }
        });
    }

    // Track form submissions
    function trackForms() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form.matches('.contact-form')) {
                const formData = new FormData(form);
                trackEvent('form_submit', {
                    interest: formData.get('sauna') || 'not specified'
                });
            }
        });
    }

    // Initialize tracking
    function init() {
        // Track initial page view
        trackPageView();

        // Track scroll depth (throttled)
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(trackScrollDepth, 500);
        });

        // Track time on page before leaving
        window.addEventListener('beforeunload', trackTimeOnPage);

        // Track various interactions
        trackClicks();
        trackForms();

        // Track visibility changes (tab switches)
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                trackEvent('tab_hidden', {});
            } else {
                trackEvent('tab_visible', {});
            }
        });
    }

    // Start tracking when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose trackEvent to window for custom tracking
    window.analyticsTracker = {
        trackEvent: trackEvent,
        trackPageView: trackPageView
    };
})();
