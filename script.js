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

    // --- Sample Work: four tabs, each a 3D roulette slider ---
    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    };
    const slideOf = (...children) => {
        const slide = el('div', 'slide-item');
        slide.append(...children);
        return slide;
    };
    const detailsOf = (tag, title, description) => {
        const details = el('div', 'slide-details');
        details.append(el('span', 'category-tag', tag), el('h3', '', title));
        if (description) details.appendChild(el('p', 'slide-desc', description));
        return details;
    };

    // Video Editing: one slide per video in resource/work/ (list built by tools/build-work.mjs)
    const videoTrack = document.querySelector('#panel-video .slider-track');
    if (videoTrack && Array.isArray(window.SAMPLE_WORKS)) {
        window.SAMPLE_WORKS.forEach((work) => {
            const wrapper = el('div', 'video-hd-wrapper');
            if (work.orientation === 'landscape') wrapper.classList.add('landscape');

            const video = el('video');
            video.src = work.src;
            if (work.poster) video.poster = work.poster;
            video.playsInline = true;
            video.controls = true;
            video.preload = 'metadata';
            video.setAttribute('aria-label', [work.title, work.description].filter(Boolean).join(' — '));
            // Fall back to the video's own size when the build couldn't detect it
            if (!work.orientation) {
                video.addEventListener('loadedmetadata', () => {
                    wrapper.classList.toggle('landscape', video.videoWidth > video.videoHeight);
                }, { once: true });
            }
            wrapper.appendChild(video);
            videoTrack.appendChild(slideOf(wrapper, detailsOf(work.tag, work.title, work.description)));
        });
    }

    // Graphic Design: one slide per image in resource/work/design/ (list built by tools/build-work.mjs)
    const designTrack = document.querySelector('#panel-design .slider-track');
    const designs = Array.isArray(window.SAMPLE_DESIGNS) ? window.SAMPLE_DESIGNS : [];
    if (designTrack && designs.length) {
        designs.forEach((d) => {
            const link = el('a', 'design-frame');
            link.href = d.src;
            link.target = '_blank';
            link.rel = 'noopener';
            const img = el('img');
            img.src = d.src;
            img.alt = [d.title, d.description].filter(Boolean).join(' — ');
            if (d.width && d.height) {
                img.width = d.width;
                img.height = d.height;
            }
            link.appendChild(img);
            designTrack.appendChild(slideOf(link, detailsOf(d.tag, d.title, d.description)));
        });
        // Real designs replace the "coming soon" slide
        designTrack.querySelector('[data-soon="design"]')?.remove();
    }

    // 3D Roulette Slider: works for every .slider-container. "fit" sliders size to their slides.
    const initSlider = (container) => {
        const track = container.querySelector('.slider-track');
        const prevBtn = container.querySelector('.prev-btn');
        const nextBtn = container.querySelector('.next-btn');
        const slides = () => [...track.children].filter(s => s.classList.contains('slide-item'));
        let current = 0;

        const update = () => {
            const all = slides();
            current = Math.min(current, Math.max(all.length - 1, 0));
            all.forEach((slide, index) => {
                slide.classList.remove('active', 'prev', 'next');
                if (index === current) {
                    slide.classList.add('active');
                } else if (index === (current - 1 + all.length) % all.length) {
                    slide.classList.add('prev');
                } else if (index === (current + 1) % all.length) {
                    slide.classList.add('next');
                }
                // Stop videos that slide out of focus so their audio doesn't keep playing
                if (index !== current) slide.querySelectorAll('video').forEach(v => v.pause());
            });
            // Nothing to spin through with a single slide
            [prevBtn, nextBtn].forEach(btn => { if (btn) btn.hidden = all.length < 2; });
        };
        const go = (step) => {
            const count = slides().length;
            if (count < 2) return;
            current = (current + step + count) % count;
            update();
        };

        // Size "fit" sliders to their tallest slide (cards and banners aren't video height)
        const fit = () => {
            if (!container.classList.contains('fit') || container.closest('[hidden]')) return;
            container.style.setProperty('--slide-h', '0px');
            const tallest = Math.max(0, ...slides().map(s => s.offsetHeight));
            container.style.setProperty('--slide-h', `${tallest}px`);
        };

        prevBtn?.addEventListener('click', () => go(-1));
        nextBtn?.addEventListener('click', () => go(1));
        // Clicking a side slide brings it to the front instead of following its links
        track.addEventListener('click', (e) => {
            const slide = e.target.closest('.slide-item');
            if (!slide || slide.classList.contains('active')) return;
            if (slide.classList.contains('prev') || slide.classList.contains('next')) {
                e.preventDefault();
                e.stopPropagation();
                go(slide.classList.contains('prev') ? -1 : 1);
            }
        }, true);

        update();
        fit();
        return { refresh: () => { update(); fit(); }, fit };
    };
    const sliders = new Map();
    document.querySelectorAll('.slider-container').forEach(c => sliders.set(c, initSlider(c)));
    const fitAll = () => sliders.forEach(s => s.fit());
    window.addEventListener('resize', fitAll);
    document.fonts?.ready.then(fitAll);
    document.querySelectorAll('.design-frame img').forEach(img => img.addEventListener('load', fitAll, { once: true }));

    // Tabs: Software / AI Tools / Video Editing / Graphic Design
    const tabs = [...document.querySelectorAll('.work-tab')];
    const selectTab = (tab, focus) => {
        tabs.forEach((t) => {
            const on = t === tab;
            t.setAttribute('aria-selected', on);
            t.tabIndex = on ? 0 : -1;
            document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
        // Leaving the video tab shouldn't leave a video playing
        if (tab.id !== 'tab-video') document.querySelectorAll('#panel-video video').forEach(v => v.pause());
        // Hidden panels can't be measured, so size the newly shown slider now
        fitAll();
        if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', (e) => {
            const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
            if (step) selectTab(tabs[(i + step + tabs.length) % tabs.length], true);
            else if (e.key === 'Home') selectTab(tabs[0], true);
            else if (e.key === 'End') selectTab(tabs[tabs.length - 1], true);
            else return;
            e.preventDefault();
        });
    });

    // Software & AI Tools: public GitHub repos tagged with the topic "portfolio"
    // (add the topic "ai" too to file it under AI Tools). Untagged practice repos stay off the site.
    const GITHUB_USER = 'abhijeetgorhe26';
    const renderRepos = (repos) => {
        const prettify = (name) => name.replace(/[-_]+/g, ' ').trim();
        const touched = new Set();
        repos
            .filter(r => !r.fork && (r.topics || []).includes('portfolio'))
            .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
            .forEach((repo) => {
                const kind = repo.topics.includes('ai') ? 'ai' : 'software';
                const track = document.querySelector(`[data-repos="${kind}"]`);
                if (!track) return;

                const card = el('article', 'project-card');
                const kicker = [repo.language, new Date(repo.pushed_at).getFullYear()].filter(Boolean).join(' · ');
                card.append(el('span', 'cred-kicker', kicker), el('h3', '', prettify(repo.name)));
                if (repo.description) card.appendChild(el('p', '', repo.description));
                const tags = repo.topics.filter(t => t !== 'portfolio' && t !== 'ai');
                if (tags.length) {
                    const list = el('ul', 'tl-tags');
                    tags.forEach(t => list.appendChild(el('li', '', t)));
                    card.appendChild(list);
                }
                [['View code →', repo.html_url], ['Live demo →', repo.homepage]]
                    .filter(([, href]) => href && /^https?:\/\//.test(href))
                    .forEach(([label, href]) => {
                        const a = el('a', 'card-link', label);
                        a.href = href;
                        a.target = '_blank';
                        a.rel = 'noopener';
                        card.appendChild(a);
                    });
                // Real projects go before the "coming soon" slide
                const soon = track.querySelector('.soon-card')?.closest('.slide-item') ?? null;
                track.insertBefore(slideOf(card), soon);
                touched.add(track.closest('.slider-container'));
            });
        touched.forEach(c => sliders.get(c)?.refresh());
    };
    if (document.querySelector('[data-repos]')) {
        const cacheKey = 'gh-repos';
        let cached = null;
        try { cached = JSON.parse(sessionStorage.getItem(cacheKey)); } catch { /* storage unavailable */ }
        if (cached) {
            renderRepos(cached);
        } else {
            fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`)
                .then(res => (res.ok ? res.json() : []))
                .then((repos) => {
                    if (!Array.isArray(repos)) return;
                    // Keep only what we render so the cache stays small
                    const slim = repos.map(({ name, description, html_url, homepage, language, topics, fork, pushed_at }) =>
                        ({ name, description, html_url, homepage, language, topics, fork, pushed_at }));
                    try { sessionStorage.setItem(cacheKey, JSON.stringify(slim)); } catch { /* storage unavailable */ }
                    renderRepos(slim);
                })
                .catch(() => { /* offline or rate-limited: the "coming soon" slides still show */ });
        }
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
