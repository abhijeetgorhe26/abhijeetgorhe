document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Scroll Reveal: tag content so it flows in as you scroll down ---
    const revealGroups = [
        ['.section-header', 0],
        ['.about-content > p', 0.12],
        ['.slider-container', 0],
        ['.proof-shot', 0],
        ['.stat', 0.1],
        ['.process-steps li', 0.12],
        ['.tl-item', 0.12],
        ['.cred-card', 0.12],
        ['.project-card', 0],
        ['.contact-form', 0],
        ['.contact-item', 0.12],
        ['.footer', 0],
    ];
    revealGroups.forEach(([selector, stagger]) => {
        document.querySelectorAll(selector).forEach((el, i) => {
            el.classList.add('reveal');
            el.style.setProperty('--d', `${(i % 8) * stagger}s`);
        });
    });
    document.querySelectorAll('.hero-visual, .slider-container, .proof-shot')
        .forEach(el => el.classList.add('reveal-scale'));

    const startReveal = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
        document.querySelectorAll('.reveal').forEach(el => {
            // Anything already on screen (e.g. the hero) reveals right away
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
                el.classList.add('in-view');
            } else {
                observer.observe(el);
            }
        });
    };

    // --- Hero brain-pop: plays once, then loops gently; tap/click replays ---
    const brainPop = document.querySelector('.brain-pop');
    const playBrainPop = () => {
        if (!brainPop) return;
        if (reduceMotion) {
            brainPop.classList.add('is-static');
            return;
        }
        brainPop.classList.remove('is-playing');
        void brainPop.offsetWidth; // restart CSS animations
        brainPop.classList.add('is-playing');
    };
    if (brainPop) brainPop.addEventListener('click', playBrainPop);

    // --- Intro Loader ---
    const loader = document.getElementById('loader');
    const loaderPct = document.getElementById('loader-pct');
    const loaderBar = document.querySelector('.loader-bar span');

    if (loader && !reduceMotion) {
        root.classList.add('is-loading');
        const started = performance.now();
        const minTime = 1600;
        const maxTime = 4000;
        let progress = 0;
        let pageReady = document.readyState === 'complete';
        let finished = false;

        window.addEventListener('load', () => { pageReady = true; });

        const setProgress = (value) => {
            progress = value;
            if (loaderPct) loaderPct.textContent = Math.round(value);
            if (loaderBar) loaderBar.style.setProperty('--progress', value / 100);
        };

        const finish = () => {
            if (finished) return;
            finished = true;
            setProgress(100);
            setTimeout(() => {
                root.classList.add('loaded');
                root.classList.remove('is-loading');
                window.scrollTo(0, 0);
                setTimeout(startReveal, 450);
                setTimeout(playBrainPop, 650);
                setTimeout(() => root.classList.add('loader-gone'), 1300);
            }, 250);
        };

        const tick = () => {
            if (finished) return;
            const elapsed = performance.now() - started;
            const canFinish = (pageReady && elapsed >= minTime) || elapsed >= maxTime;
            if (canFinish) return finish();
            // Ease towards 90% while waiting, so the counter never stalls at 100
            const target = Math.min(90, (elapsed / minTime) * 90);
            setProgress(progress + (target - progress) * 0.15);
            setTimeout(tick, 30);
        };
        tick();
    } else {
        root.classList.add('loaded', 'loader-gone');
        startReveal();
        playBrainPop();
    }

    // --- Stats: count up when the strip comes into view ---
    const countUp = (el) => {
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = 1400;
        const start = performance.now();
        const step = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
            if (t < 1) setTimeout(step, 16);
        };
        step();
    };
    const statNums = document.querySelectorAll('.stat-num');
    if (statNums.length && !reduceMotion) {
        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    countUp(entry.target);
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.6 });
        statNums.forEach(el => statObserver.observe(el));
    }

    // --- Scroll Progress Bar ---
    const progressBar = document.querySelector('.scroll-progress');
    const updateScrollProgress = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progressBar) progressBar.style.setProperty('--scroll', max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();

    // --- Contact Form (emails via FormSubmit) ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const freeEmailDomains = ['gmail.com', 'yahoo.com', 'yahoo.in', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'rediffmail.com', 'proton.me', 'protonmail.com'];
        const statusEl = contactForm.querySelector('.form-status');
        const submitBtn = contactForm.querySelector('.form-submit');
        const btnLabel = submitBtn.querySelector('.btn-label');

        const validators = {
            name: v => v.trim().length >= 2 || 'Please enter your name.',
            email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address.',
            phone: v => {
                const digits = v.replace(/\D/g, '');
                return (/^\+?[\d\s\-()]+$/.test(v.trim()) && digits.length >= 7 && digits.length <= 15) || 'Please enter a valid phone number.';
            },
            message: v => v.trim().length >= 10 || 'Please write a few more words (10+ characters).',
        };

        const setFieldError = (input, message, isHint = false) => {
            const field = input.closest('.form-field');
            const errorEl = field.querySelector('.form-error');
            field.classList.toggle('has-error', Boolean(message) && !isHint);
            errorEl.textContent = message || '';
            errorEl.classList.toggle('is-hint', isHint);
        };

        const validateField = (input) => {
            const check = validators[input.name];
            if (!check) return true;
            const result = check(input.value);
            if (result !== true) {
                setFieldError(input, result);
                return false;
            }
            // Gentle nudge towards an official email, without blocking personal ones
            const domain = input.name === 'email' ? input.value.trim().split('@')[1]?.toLowerCase() : '';
            if (domain && freeEmailDomains.includes(domain)) {
                setFieldError(input, 'Tip: an official / work email helps me reply faster.', true);
            } else {
                setFieldError(input, '');
            }
            return true;
        };

        contactForm.querySelectorAll('input[name], textarea[name]').forEach(input => {
            if (!validators[input.name]) return;
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                if (input.closest('.form-field').classList.contains('has-error')) validateField(input);
            });
        });

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = [...contactForm.querySelectorAll('input[name], textarea[name]')].filter(i => validators[i.name]);
            const allValid = inputs.map(validateField).every(Boolean);
            if (!allValid) {
                inputs.find(i => i.closest('.form-field').classList.contains('has-error'))?.focus();
                return;
            }

            submitBtn.disabled = true;
            btnLabel.textContent = 'Sending…';
            statusEl.className = 'form-status';
            statusEl.textContent = '';

            try {
                const response = await fetch(contactForm.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: new FormData(contactForm),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || String(data.success) === 'false') throw new Error(data.message || 'Request failed');
                contactForm.reset();
                inputs.forEach(i => setFieldError(i, ''));
                statusEl.classList.add('success');
                statusEl.textContent = 'Thanks! Your message is on its way — I’ll get back to you soon.';
            } catch (err) {
                statusEl.classList.add('error');
                statusEl.textContent = 'Something went wrong. Please email me directly at abhijeetgorhe8@gmail.com.';
            } finally {
                submitBtn.disabled = false;
                btnLabel.textContent = 'Send Message';
            }
        });
    }

    // Theme Toggle Logic
    const themeBtn = document.getElementById('theme-toggle');
    const iconSun = document.querySelector('.icon-sun');
    const iconMoon = document.querySelector('.icon-moon');
    
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            
            if(document.body.classList.contains('light-theme')) {
                iconSun.style.display = 'none';
                iconMoon.style.display = 'inline';
            } else {
                iconSun.style.display = 'inline';
                iconMoon.style.display = 'none';
            }
        });
    }

    // Mobile Menu Toggle Logic
    const menuToggle = document.getElementById('menu-toggle');
    const nav = document.querySelector('.nav');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });

        // Close menu when clicking a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                nav.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });
    }

    // Mobile Nav Pill Logic (Reference Design)
    const sections = ['Home', 'About', 'Services', 'Process', 'Work', 'Proof', 'Experience', 'FAQ', 'Contact'];
    const sectionIds = ['home', 'about', 'services', 'process', 'portfolio', 'proof', 'experience', 'faq', 'contact'];
    let currentIdx = 0;
    const sectionLabel = document.getElementById('current-section');
    const prevArrow = document.querySelector('.nav-arrow.prev');
    const nextArrow = document.querySelector('.nav-arrow.next');

    function updateSection(idx) {
        if (idx < 0) idx = sections.length - 1;
        if (idx >= sections.length) idx = 0;
        currentIdx = idx;
        if (sectionLabel) sectionLabel.textContent = sections[currentIdx];
        const target = document.getElementById(sectionIds[currentIdx]);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (prevArrow && nextArrow) {
        prevArrow.addEventListener('click', () => updateSection(currentIdx - 1));
        nextArrow.addEventListener('click', () => updateSection(currentIdx + 1));
    }

    // Update label on scroll
    window.addEventListener('scroll', () => {
        sectionIds.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.top >= -50 && rect.top < 150) {
                    currentIdx = i;
                    if (sectionLabel) sectionLabel.textContent = sections[currentIdx];
                }
            }
        });
    });

    // 3D Roulette Slider Logic
    const slides = document.querySelectorAll('.slide-item');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    let currentIndex = 0;

    if (slides.length > 0) {
        const updateSlider = () => {
            slides.forEach((slide, index) => {
                slide.classList.remove('active', 'prev', 'next');

                if (index === currentIndex) {
                    slide.classList.add('active');
                } else if (index === (currentIndex - 1 + slides.length) % slides.length) {
                    slide.classList.add('prev');
                } else if (index === (currentIndex + 1) % slides.length) {
                    slide.classList.add('next');
                }
            });
        };

        // Initialize
        updateSlider();

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                updateSlider();
            });

            nextBtn.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % slides.length;
                updateSlider();
            });
        }

        // Click on side slides to navigate
        slides.forEach((slide) => {
            slide.addEventListener('click', () => {
                if (slide.classList.contains('prev')) {
                    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                    updateSlider();
                } else if (slide.classList.contains('next')) {
                    currentIndex = (currentIndex + 1) % slides.length;
                    updateSlider();
                }
            });
        });
    }

    // Smooth Scrolling for Nav Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 100, // Adjust for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });

    // Subtle parallax effect on hero profile ring
    const hero = document.querySelector('.hero');
    const ring = document.querySelector('.profile-ring');

    if (hero && ring) {
        hero.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth / 2 - e.pageX) / 50;
            const y = (window.innerHeight / 2 - e.pageY) / 50;
            ring.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    // --- Bouncing Ball & Grid Pressure Effect ---
    const ball = document.createElement('div');
    ball.id = 'bouncing-ball';
    document.body.appendChild(ball);

    const grid = document.querySelector('.clean-grid');

    // Initial random position
    let ballX = Math.random() * (window.innerWidth - 50);
    let ballY = Math.random() * (window.innerHeight - 50);

    // Velocity
    let dx = 4;
    let dy = 4;

    function applyPressure() {
        if (grid) {
            // Squeeze and zoom the grid to simulate impact pressure
            grid.style.transform = 'scale(1.08)';
            grid.style.transition = 'transform 0.05s ease-out';

            setTimeout(() => {
                grid.style.transform = 'scale(1)';
                grid.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            }, 50);
        }

        // Squeeze the ball itself
        ball.style.transform = `translate(${ballX}px, ${ballY}px) scale(0.8)`;
        setTimeout(() => {
            ball.style.transform = `translate(${ballX}px, ${ballY}px) scale(1)`;
        }, 100);
    }

    function animateBall() {
        ballX += dx;
        ballY += dy;

        let hitEdge = false;

        // Check X bounds
        if (ballX + 50 >= window.innerWidth) {
            ballX = window.innerWidth - 50;
            dx = -dx;
            hitEdge = true;
        } else if (ballX <= 0) {
            ballX = 0;
            dx = -dx;
            hitEdge = true;
        }

        // Check Y bounds
        if (ballY + 50 >= window.innerHeight) {
            ballY = window.innerHeight - 50;
            dy = -dy;
            hitEdge = true;
        } else if (ballY <= 0) {
            ballY = 0;
            dy = -dy;
            hitEdge = true;
        }

        // Apply pressure impact when hitting a side
        if (hitEdge) {
            applyPressure();
        } else {
            ball.style.transform = `translate(${ballX}px, ${ballY}px) scale(1)`;
        }

        // Track ball for grid illumination
        if (grid) {
            const cx = ballX + 25;
            const cy = ballY + 25;
            grid.style.setProperty('--bx', (cx + window.innerWidth * 0.05) + 'px');
            grid.style.setProperty('--by', (cy + window.innerHeight * 0.05) + 'px');
        }

        requestAnimationFrame(animateBall);
    }

    animateBall();
});
