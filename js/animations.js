/**
 * Secret Sauna Company - Animations Module
 * Scroll animations and hero intro animation
 */
(function() {
    'use strict';

    // ============================================
    // Scroll Animation Manager
    // ============================================
    function ScrollAnimationManager() {
        this.observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        var self = this;
        this.observer = new IntersectionObserver(
            function(entries) { self.handleIntersection(entries); },
            this.observerOptions
        );
    }

    ScrollAnimationManager.prototype.handleIntersection = function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    };

    ScrollAnimationManager.prototype.init = function() {
        var self = this;
        var animatedElements = document.querySelectorAll(
            '.fade-in, .slide-up, .slide-left, .slide-right, .scale-in'
        );

        animatedElements.forEach(function(el) {
            el.classList.remove('visible');
            self.observer.observe(el);
        });

        // Trigger immediate check for elements already in view
        setTimeout(function() {
            animatedElements.forEach(function(el) {
                var rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    el.classList.add('visible');
                }
            });
        }, 50);
    };

    ScrollAnimationManager.prototype.reinit = function() {
        var self = this;
        setTimeout(function() { self.init(); }, 100);
    };

    // ============================================
    // Hero Intro Animation
    // ============================================
    function HeroIntroAnimation() {
        this.isActive = false;
        this.isRevealed = false;
        this.scrollThreshold = 50; // Pixels of scroll needed to trigger reveal
        this.scrollAccumulator = 0;
        this.readyForReveal = false;
        this.touchStartY = 0;

        // Bind methods
        var self = this;
        this.boundTouchStart = function(e) { self.handleTouchStart(e); };
        this.boundPreventScroll = function(e) { self.preventScroll(e); };
        this.boundHandleWheel = function(e) { self.handleWheel(e); };
        this.boundHandleTouch = function(e) { self.handleTouch(e); };
    }

    HeroIntroAnimation.prototype.init = function() {
        // Only run on home page and first visit
        if (sessionStorage.getItem('heroIntroShown')) {
            document.body.classList.remove('intro-pending');
            return;
        }

        this.isActive = true;
        document.body.classList.add('hero-intro-active');

        window.addEventListener('wheel', this.boundHandleWheel, { passive: false });
        window.addEventListener('touchstart', this.boundTouchStart, { passive: true });
        window.addEventListener('touchmove', this.boundHandleTouch, { passive: false });
        window.addEventListener('keydown', this.boundPreventScroll, { passive: false });

        // Small delay before listening for scroll to trigger reveal
        var self = this;
        setTimeout(function() {
            self.readyForReveal = true;
        }, 300);
    };

    HeroIntroAnimation.prototype.preventScroll = function(e) {
        if (this.isActive && !this.isRevealed) {
            if (['ArrowDown', 'ArrowUp', 'Space', 'PageDown', 'PageUp'].indexOf(e.key) !== -1) {
                e.preventDefault();
                this.triggerReveal();
            }
        }
    };

    HeroIntroAnimation.prototype.handleWheel = function(e) {
        if (this.isActive && !this.isRevealed && this.readyForReveal) {
            e.preventDefault();

            // Accumulate scroll delta
            this.scrollAccumulator += Math.abs(e.deltaY);

            if (this.scrollAccumulator >= this.scrollThreshold) {
                this.triggerReveal();
            }
        }
    };

    HeroIntroAnimation.prototype.handleTouchStart = function(e) {
        this.touchStartY = e.touches[0].clientY;
    };

    HeroIntroAnimation.prototype.handleTouch = function(e) {
        if (this.isActive && !this.isRevealed && this.readyForReveal) {
            var touchY = e.touches[0].clientY;
            var deltaY = this.touchStartY - touchY;

            if (Math.abs(deltaY) > 30) {
                e.preventDefault();
                this.triggerReveal();
            }
        }
    };

    HeroIntroAnimation.prototype.triggerReveal = function() {
        if (this.isRevealed) return;
        this.isRevealed = true;
        document.body.classList.remove('intro-pending');

        // Reveal nav first
        var nav = document.querySelector('nav');
        if (nav) {
            nav.classList.add('revealed');
        }

        // Reveal hero content with slight delay
        setTimeout(function() {
            var heroContent = document.querySelector('.hero-content');
            if (heroContent) {
                heroContent.classList.add('revealed');
            }
        }, 200);

        // Remove scroll lock after animation
        var self = this;
        setTimeout(function() {
            self.cleanup();
        }, 1200);

        // Mark as shown for this session
        sessionStorage.setItem('heroIntroShown', 'true');
    };

    HeroIntroAnimation.prototype.cleanup = function() {
        this.isActive = false;
        document.body.classList.remove('hero-intro-active');
        document.body.classList.remove('intro-pending');
        window.removeEventListener('wheel', this.boundHandleWheel);
        window.removeEventListener('touchstart', this.boundTouchStart);
        window.removeEventListener('touchmove', this.boundHandleTouch);
        window.removeEventListener('keydown', this.boundPreventScroll);
    };

    // Reset for page navigation back to home
    HeroIntroAnimation.prototype.reset = function() {
        if (!sessionStorage.getItem('heroIntroShown')) {
            this.isActive = false;
            this.isRevealed = false;
            this.scrollAccumulator = 0;
            this.readyForReveal = false;
            this.init();
        }
    };

    // ============================================
    // Create instances and export
    // ============================================
    var scrollAnimations = new ScrollAnimationManager();
    var heroIntro = new HeroIntroAnimation();

    window.SSC = window.SSC || {};
    window.SSC.scrollAnimations = scrollAnimations;
    window.SSC.heroIntro = heroIntro;

    // Also expose directly for backward compatibility
    window.scrollAnimations = scrollAnimations;
    window.heroIntro = heroIntro;

})();
