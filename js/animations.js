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
                    if (entry.target.classList.contains('gallery-item--reveal')) {
                        entry.target.classList.add('gallery-item--visible');
                    } else {
                        entry.target.classList.add('visible');
                    }
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

            // Gallery mosaic reveal on scroll
            const galleryItems = document.querySelectorAll('.gallery-item--reveal');
            galleryItems.forEach((el, i) => {
                el.style.transitionDelay = `${(i % 6) * 0.08}s`;
                this.observer.observe(el);
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
        init() {
            // Only run on homepage (body.page-home set by template)
            if (!document.body.classList.contains('page-home')) return;

            // Reveal nav + hero content on first scroll gesture
            const reveal = () => {
                document.body.classList.add('hero-revealed');
                cleanup();
            };

            const cleanup = () => {
                window.removeEventListener('wheel', reveal);
                window.removeEventListener('touchstart', reveal);
                window.removeEventListener('keydown', onKey);
            };

            const onKey = (e) => {
                if (['ArrowDown', 'ArrowUp', 'Space', 'PageDown', 'PageUp'].includes(e.key)) {
                    reveal();
                }
            };

            // wheel + touchstart + keydown only -- NOT scroll (fires during page init)
            window.addEventListener('wheel', reveal, { once: true, passive: true });
            window.addEventListener('touchstart', reveal, { once: true, passive: true });
            window.addEventListener('keydown', onKey);

            // Safety: auto-reveal after 5s if user hasn't interacted
            setTimeout(() => {
                if (!document.body.classList.contains('hero-revealed')) {
                    reveal();
                }
            }, 5000);
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
