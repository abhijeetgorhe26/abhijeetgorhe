document.addEventListener('DOMContentLoaded', () => {
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
    const sections = ['Home', 'About', 'Work', 'Experience', 'Contact'];
    const sectionIds = ['home', 'about', 'portfolio', 'experience', 'contact'];
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
