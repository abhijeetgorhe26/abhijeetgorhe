// Abhijeet Gorhe — portfolio
document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => [...el.querySelectorAll(s)];

    // ---------- Nav: solid background once scrolled, mobile menu ----------
    const nav = $('.nav');
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const burger = $('.nav-burger');
    const menu = $('#mobile-menu');
    const setMenu = (open) => {
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.hidden = !open;
        document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

    // ---------- Theme: dark (default) <-> light ----------
    const root = document.documentElement;
    const themeBtn = $('.nav-theme');
    const metaTheme = $('meta[name="theme-color"]');
    const syncTheme = () => {
        const light = root.dataset.theme === 'light';
        themeBtn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
        metaTheme?.setAttribute('content', light ? '#ffffff' : '#140705');
    };
    themeBtn.addEventListener('click', () => {
        const light = root.dataset.theme !== 'light';
        if (light) root.dataset.theme = 'light'; else delete root.dataset.theme;
        try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch (e) { /* storage blocked */ }
        syncTheme();
    });
    syncTheme();

    // ---------- Work grid (data from resource/work/works.js) ----------
    // Cards sit in justified rows: each card's width follows its video's aspect ratio,
    // so a row of mixed 9:16, 1:1 and 16:9 edits shares one height with no gaps.
    const works = window.SAMPLE_WORKS || [];
    const grid = $('#work-grid');
    const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.8v12.4L14 8z" fill="currentColor"/></svg>';
    const ratio = (w) => ({ landscape: 16 / 9, square: 1, portrait: 9 / 16 }[w.orientation] || 9 / 16);

    const card = (w, i) => {
        const el = document.createElement('article');
        el.className = 'card rv';
        el.dataset.tag = w.tag;
        el.dataset.index = i;
        el.style.setProperty('--ar', ratio(w).toFixed(4));
        el.style.setProperty('--d', `${(i % 4) * 0.06}s`);
        const compare = w.compare === true ? 'Reference vs Mine' : (w.compare || '');
        el.innerHTML = `
            <div class="card-media">
                ${w.poster ? `<img src="${w.poster}" alt="" loading="lazy" decoding="async">` : ''}
                <span class="card-badge">${w.tag}</span>${compare ? `<span class="card-badge is-compare">${compare}</span>` : ''}
                <button class="card-play" type="button">${playIcon}</button>
            </div>
            <div class="card-meta">
                <div><h3></h3>${w.description ? '<p></p>' : ''}</div>
                ${w.duration ? `<span>${w.duration}</span>` : ''}
            </div>`;
        el.querySelector('h3').textContent = w.title;
        if (w.description) el.querySelector('p').textContent = w.description;
        el.querySelector('.card-play').setAttribute('aria-label', `Play ${w.title}`);
        return el;
    };

    // One <video> per card, created on first hover/click so nothing heavy loads up front
    const videoFor = (el) => {
        let v = $('video', el);
        if (!v) {
            const w = works[el.dataset.index];
            v = document.createElement('video');
            Object.assign(v, { src: w.src, muted: true, loop: true, playsInline: true, preload: 'metadata' });
            if (w.poster) v.poster = w.poster;
            $('.card-media', el).prepend(v);
        }
        return v;
    };
    const stopOthers = (keep) => $$('.card.is-playing', grid).forEach((c) => {
        if (c === keep) return;
        const v = $('video', c);
        v.pause();
        v.controls = false;
        v.muted = true;
        v.loop = true;
        c.classList.remove('is-playing', 'is-previewing');
    });
    // Plays the edit right inside its card, with sound and the browser's controls
    const playInline = (el) => {
        stopOthers(el);
        const v = videoFor(el);
        el.classList.remove('is-previewing');
        el.classList.add('is-playing');
        v.loop = false;
        v.muted = false;
        v.controls = true;
        v.currentTime = 0;
        v.play().catch(() => {});
        v.focus({ preventScroll: true });
    };

    if (grid) {
        if (!works.length) {
            grid.innerHTML = '<p class="work-empty">New edits are on their way.</p>';
        } else {
            works.forEach((w, i) => grid.appendChild(card(w, i)));
            const cta = document.createElement('a');
            cta.className = 'card-cta rv';
            cta.href = '#contact';
            cta.innerHTML = '<small>Your project</small><strong>Want an edit like these?</strong><span aria-hidden="true">&#8599;</span>';
            grid.appendChild(cta);
        }

        grid.addEventListener('click', (e) => {
            const el = e.target.closest('.card');
            if (!el || el.classList.contains('is-playing')) return;   // once playing, the native controls take over
            if (e.target.closest('.card-media')) playInline(el);
        });

        // Hover preview: muted loop, only on devices with a mouse
        if (canHover && !reduceMotion) {
            $$('.card', grid).forEach((el) => {
                el.addEventListener('mouseenter', () => {
                    if (el.classList.contains('is-playing')) return;
                    const v = videoFor(el);
                    v.currentTime = 0;
                    v.play().then(() => {
                        if (!el.classList.contains('is-playing')) el.classList.add('is-previewing');
                    }).catch(() => {});
                });
                el.addEventListener('mouseleave', () => {
                    if (el.classList.contains('is-playing')) return;
                    el.classList.remove('is-previewing');
                    $('video', el)?.pause();
                });
            });
        }

        // Filters
        const chips = $$('.chip');
        chips.forEach((chip) => chip.addEventListener('click', () => {
            const f = chip.dataset.filter;
            chips.forEach((c) => { const on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
            $$('.card', grid).forEach((el) => { el.hidden = f !== 'all' && el.dataset.tag !== f; });
        }));
        // hide filters that have no work yet
        chips.forEach((c) => { if (c.dataset.filter !== 'all' && !works.some((w) => w.tag === c.dataset.filter)) c.hidden = true; });
    }

    // ---------- Hero "latest edit" card: jumps to that edit and plays it in place ----------
    const latest = $('[data-latest]');
    const featuredIndex = Math.max(0, works.findIndex((w) => w.featured));
    const featured = works[featuredIndex];
    if (latest && featured && grid) {
        $('img', latest).src = featured.poster || '';
        $('[data-latest-title]', latest).textContent = featured.title.split('—')[0].trim();
        $('[data-latest-tag]', latest).textContent = '/' + featured.tag;
        latest.addEventListener('click', (e) => {
            e.preventDefault();
            const el = $(`.card[data-index="${featuredIndex}"]`, grid);
            el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
            playInline(el);
        });
    } else if (latest) {
        latest.hidden = true;
    }

    // ---------- Scroll reveal ----------
    $$('.head, .stat, .svc, .about-photo, .about-text, .steps li, .tl, .cert, .faq-list details, .form, .links li')
        .forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--d', `${(i % 4) * 0.07}s`); });
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach((el) => io.observe(el));

    // ---------- Stat counters ----------
    const countUp = (el) => {
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / 1400);
            el.textContent = prefix + (target * (1 - Math.pow(1 - t, 3))).toFixed(decimals) + suffix;
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };
    if (!reduceMotion) {
        const so = new IntersectionObserver((entries) => entries.forEach((en) => {
            if (en.isIntersecting) { countUp(en.target); so.unobserve(en.target); }
        }), { threshold: 0.6 });
        $$('[data-count]').forEach((el) => so.observe(el));
    }

    // ---------- Contact form (FormSubmit, AJAX) ----------
    const form = $('#contact-form');
    if (form) {
        const freeDomains = ['gmail.com', 'yahoo.com', 'yahoo.in', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'rediffmail.com', 'proton.me', 'protonmail.com'];
        const status = $('.form-status', form);
        const button = $('button[type="submit"]', form);
        const label = $('.btn-label', button);
        const rules = {
            name: (v) => v.trim().length >= 2 || 'Please enter your name.',
            email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address.',
            phone: (v) => {
                const digits = v.replace(/\D/g, '');
                return (/^\+?[\d\s\-()]+$/.test(v.trim()) && digits.length >= 7 && digits.length <= 15) || 'Please enter a valid phone number.';
            },
            message: (v) => v.trim().length >= 10 || 'Please write a few more words (10+ characters).',
        };
        const setError = (input, msg, hint = false) => {
            const field = input.closest('.field');
            const err = $('.err', field);
            field.classList.toggle('has-error', Boolean(msg) && !hint);
            err.textContent = msg || '';
            err.classList.toggle('is-hint', hint);
        };
        const check = (input) => {
            const rule = rules[input.name];
            if (!rule) return true;
            const r = rule(input.value);
            if (r !== true) { setError(input, r); return false; }
            const domain = input.name === 'email' ? input.value.trim().split('@')[1]?.toLowerCase() : '';
            setError(input, domain && freeDomains.includes(domain) ? 'Tip: a work email helps me reply faster.' : '', true);
            return true;
        };
        const inputs = $$('input[name], textarea[name]', form).filter((i) => rules[i.name]);
        inputs.forEach((i) => {
            i.addEventListener('blur', () => check(i));
            i.addEventListener('input', () => { if (i.closest('.field').classList.contains('has-error')) check(i); });
        });
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!inputs.map(check).every(Boolean)) {
                inputs.find((i) => i.closest('.field').classList.contains('has-error'))?.focus();
                return;
            }
            button.disabled = true;
            label.textContent = 'Sending…';
            status.className = 'form-status';
            status.textContent = '';
            try {
                const res = await fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
                    method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || String(data.success) === 'false') throw new Error(data.message || 'Request failed');
                form.reset();
                inputs.forEach((i) => setError(i, ''));
                status.classList.add('success');
                status.textContent = 'Thanks! Your message is on its way — I’ll get back to you soon.';
            } catch {
                status.classList.add('error');
                status.textContent = 'Something went wrong. Please email me at abhijeetgorhe8@gmail.com.';
            } finally {
                button.disabled = false;
                label.textContent = 'Send message';
            }
        });
    }
});
