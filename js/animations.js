/**
 * Secret Sauna Company - Animations Module
 * Scroll animations and hero intro animation
 */
(function() {
    'use strict';

    // ============================================
    // Scroll Animation Manager
    // ============================================
    class ScrollAnimationManager {
        constructor() {
            this.observerOptions = {
                threshold: 0.15,
                rootMargin: '0px 0px -50px 0px'
            };

            this.observer = new IntersectionObserver(
                (entries) => { this.handleIntersection(entries); },
                this.observerOptions
            );
        }

        handleIntersection(entries) {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }

        init() {
            const animatedElements = document.querySelectorAll(
                '.fade-in, .slide-up, .slide-left, .slide-right, .scale-in'
            );

            animatedElements.forEach((el) => {
                el.classList.remove('visible');
                this.observer.observe(el);
            });

            // Set stagger indices for animated grid children
            const staggerContainers = document.querySelectorAll(
                '.grid-2, .grid-3, .model-grid, .grid-offerings, .comparison-grid'
            );
            staggerContainers.forEach((container) => {
                const children = container.children;
                for (let i = 0; i < children.length; i++) {
                    children[i].style.setProperty('--stagger-index', i);
                }
            });

            // Set stagger indices for gallery items and FAQ items
            document.querySelectorAll('.gallery-item, .faq-item').forEach((el) => {
                const parent = el.parentElement;
                if (!parent.dataset.staggered) {
                    parent.dataset.staggered = 'true';
                    const siblings = parent.querySelectorAll(':scope > .gallery-item, :scope > .faq-item');
                    siblings.forEach((sibling, j) => {
                        sibling.style.setProperty('--stagger-index', j);
                    });
                }
            });

            // Trigger immediate check for elements already in view
            setTimeout(() => {
                animatedElements.forEach((el) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.top < window.innerHeight && rect.bottom > 0) {
                        el.classList.add('visible');
                    }
                });
            }, 50);
        }
    }

    // ============================================
    // Hero Intro Animation
    // ============================================
    class HeroIntroAnimation {
        constructor() {
            this.isActive = false;
            this.isRevealed = false;
            this.scrollThreshold = 50; // Pixels of scroll needed to trigger reveal
            this.scrollAccumulator = 0;
            this.readyForReveal = false;
            this.touchStartY = 0;

            // Bind methods
            this.boundTouchStart = (e) => { this.handleTouchStart(e); };
            this.boundPreventScroll = (e) => { this.preventScroll(e); };
            this.boundHandleWheel = (e) => { this.handleWheel(e); };
            this.boundHandleTouch = (e) => { this.handleTouch(e); };
        }

        init() {
            // Only run on home page (requires .hero section)
            if (!document.querySelector('.hero')) return;

            if (sessionStorage.getItem('heroIntroShown')) {
                document.body.classList.remove('intro-pending');
                return;
            }

            document.body.classList.add('intro-pending');
            this.isActive = true;
            document.body.classList.add('hero-intro-active');

            window.addEventListener('wheel', this.boundHandleWheel, { passive: false });
            window.addEventListener('touchstart', this.boundTouchStart, { passive: true });
            window.addEventListener('touchmove', this.boundHandleTouch, { passive: false });
            window.addEventListener('keydown', this.boundPreventScroll, { passive: false });

            // Small delay before listening for scroll to trigger reveal
            setTimeout(() => {
                this.readyForReveal = true;
            }, 300);

            // Auto-reveal after 4s if user hasn't scrolled (accessibility fallback)
            setTimeout(() => {
                if (!this.isRevealed) {
                    this.triggerReveal();
                }
            }, 4000);
        }

        preventScroll(e) {
            if (this.isActive && !this.isRevealed) {
                if (['ArrowDown', 'ArrowUp', 'Space', 'PageDown', 'PageUp'].includes(e.key)) {
                    e.preventDefault();
                    this.triggerReveal();
                }
            }
        }

        handleWheel(e) {
            if (this.isActive && !this.isRevealed && this.readyForReveal) {
                e.preventDefault();

                // Accumulate scroll delta
                this.scrollAccumulator += Math.abs(e.deltaY);

                if (this.scrollAccumulator >= this.scrollThreshold) {
                    this.triggerReveal();
                }
            }
        }

        handleTouchStart(e) {
            this.touchStartY = e.touches[0].clientY;
        }

        handleTouch(e) {
            if (this.isActive && !this.isRevealed && this.readyForReveal) {
                const touchY = e.touches[0].clientY;
                const deltaY = this.touchStartY - touchY;

                if (Math.abs(deltaY) > 30) {
                    e.preventDefault();
                    this.triggerReveal();
                }
            }
        }

        triggerReveal() {
            if (this.isRevealed) return;
            this.isRevealed = true;
            document.body.classList.remove('intro-pending');

            // Reveal nav after a frame so the browser computes the
            // intermediate .hero-intro-active nav state (opacity: 0 with
            // transition) before we add .revealed — without this, the
            // browser batches both changes and skips the CSS transition.
            requestAnimationFrame(() => {
                const nav = document.querySelector('nav');
                if (nav) {
                    nav.classList.add('revealed');
                }
            });

            // Reveal hero content with slight delay
            setTimeout(() => {
                const heroContent = document.querySelector('.hero-content');
                if (heroContent) {
                    heroContent.classList.add('revealed');
                }
            }, 200);

            // Remove scroll lock after animation
            setTimeout(() => {
                this.cleanup();
            }, 1200);

            // Mark as shown for this session
            sessionStorage.setItem('heroIntroShown', 'true');
        }

        cleanup() {
            this.isActive = false;
            document.body.classList.remove('hero-intro-active');
            document.body.classList.remove('intro-pending');
            window.removeEventListener('wheel', this.boundHandleWheel);
            window.removeEventListener('touchstart', this.boundTouchStart);
            window.removeEventListener('touchmove', this.boundHandleTouch);
            window.removeEventListener('keydown', this.boundPreventScroll);
        }
    }

    // ============================================
    // Parallax
    // ============================================
    function initHeroParallax() {
        const heroImage = document.querySelector('.hero-image');
        const heroContent = document.querySelector('.hero-content');
        const pageHeroes = document.querySelectorAll('.page-hero');
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const overlayBgs = document.querySelectorAll('.hero-overlay__bg');
        const fullWidthImages = document.querySelectorAll('.full-width-image');

        // Wrap full-width images in overflow-hidden containers
        fullWidthImages.forEach((img) => {
            if (img.parentElement.classList.contains('full-width-image-wrap')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'full-width-image-wrap';
            // Carry over animation classes
            if (img.classList.contains('scale-in')) {
                wrapper.classList.add('scale-in');
                img.classList.remove('scale-in');
            }
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
        });

        if (!heroImage && !heroContent && overlayBgs.length === 0 && fullWidthImages.length === 0 && pageHeroes.length === 0) return;

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.pageYOffset;
                    const viewH = window.innerHeight;

                    // Hero image -- strongest effect
                    if (heroImage && scrollY <= viewH) {
                        heroImage.style.top = `${-(scrollY * 0.6)}px`;
                    }

                    // Hero content text fade on scroll
                    if (!prefersReducedMotion && heroContent && scrollY <= viewH) {
                        const fadeProgress = Math.min(scrollY / (viewH * 0.6), 1);
                        heroContent.style.opacity = 1 - fadeProgress;
                    }

                    // Overlay backgrounds
                    overlayBgs.forEach((bg) => {
                        const rect = bg.parentElement.getBoundingClientRect();
                        if (rect.bottom > 0 && rect.top < viewH) {
                            const progress = (viewH - rect.top) / (viewH + rect.height);
                            bg.style.transform = `translateY(${-(progress - 0.5) * 80}px)`;
                        }
                    });

                    // Page hero content fade on scroll
                    if (!prefersReducedMotion) {
                        pageHeroes.forEach((hero) => {
                            const rect = hero.getBoundingClientRect();
                            const heroH = hero.offsetHeight;
                            if (rect.top < 0 && rect.bottom > 0) {
                                const scrolledPast = Math.abs(rect.top);
                                const fadeProgress = Math.min(scrolledPast / (heroH * 0.5), 1);
                                hero.style.opacity = 1 - fadeProgress;
                            } else if (rect.top >= 0) {
                                hero.style.opacity = 1;
                            }
                        });
                    }

                    // Full-width images
                    fullWidthImages.forEach((img) => {
                        const wrap = img.parentElement;
                        const rect = wrap.getBoundingClientRect();
                        if (rect.bottom > 0 && rect.top < viewH) {
                            const progress = (viewH - rect.top) / (viewH + rect.height);
                            img.style.transform = `translateY(${-(progress - 0.5) * 100}px)`;
                        }
                    });

                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ============================================
    // Create instances and export
    // ============================================
    const scrollAnimations = new ScrollAnimationManager();
    const heroIntro = new HeroIntroAnimation();

    window.SSC = window.SSC || {};
    window.SSC.scrollAnimations = scrollAnimations;
    window.SSC.heroIntro = heroIntro;
    window.SSC.initHeroParallax = initHeroParallax;

})();
