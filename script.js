(function () {
  'use strict';

  // ============================================================
  // 1. SCROLL ANIMATION ENGINE (240 FRAMES + LERP)
  // ============================================================
  const FRAME_COUNT = 240;
  const getFrameUrl = (index) => `ezgif-frame-${String(index).padStart(3, '0')}.jpg`;

  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  let dpr = window.devicePixelRatio || 1;
  let targetProgress = 0;
  let currentProgress = 0;
  let lastRenderedFrame = -1;
  let needsRedraw = true;

  // Image cache
  const images = new Array(FRAME_COUNT + 1);
  let loadedCount = 0;

  const bgColor = '#0c0c10';

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    needsRedraw = true;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function updateScrollProgress() {
    const scrollEl = document.documentElement;
    const maxScroll = scrollEl.scrollHeight - window.innerHeight;
    if (maxScroll > 0) {
      targetProgress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
    } else {
      targetProgress = 0;
    }
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('load', updateScrollProgress);
  updateScrollProgress();

  function getNearestLoadedImage(targetIdx) {
    if (images[targetIdx] && images[targetIdx].complete && images[targetIdx].naturalWidth > 0) {
      return images[targetIdx];
    }
    // Search outwards for closest available loaded frame
    for (let offset = 1; offset < FRAME_COUNT; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 1 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return images[prev];
      }
      const next = targetIdx + offset;
      if (next <= FRAME_COUNT && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return images[next];
      }
    }
    return null;
  }

  function renderFrame(index) {
    const img = getNearestLoadedImage(index);
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || 1280;
    const ih = img.naturalHeight || 720;

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);

    // Dynamic cover framing
    const screenRatio = cw / ch;
    const imgRatio = iw / ih;

    let renderW, renderH, offsetX, offsetY;

    if (screenRatio > imgRatio) {
      renderW = cw;
      renderH = cw / imgRatio;
      offsetX = 0;
      offsetY = (ch - renderH) * 0.22; // Well-framed head & torso
    } else {
      renderH = ch;
      renderW = ch * imgRatio;
      offsetX = (cw - renderW) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, Math.round(offsetX), Math.round(offsetY), Math.round(renderW), Math.round(renderH));
  }

  // Ultra-smooth momentum LERP loop
  const LERP_FACTOR = 0.09;

  function tick() {
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.0001) {
      currentProgress += diff * LERP_FACTOR;
    } else {
      currentProgress = targetProgress;
    }

    const frameIndex = Math.min(
      FRAME_COUNT,
      Math.max(1, Math.round(1 + currentProgress * (FRAME_COUNT - 1)))
    );

    if (frameIndex !== lastRenderedFrame || needsRedraw) {
      renderFrame(frameIndex);
      lastRenderedFrame = frameIndex;
      needsRedraw = false;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // Preload all 240 frames
  function preloadImages() {
    // 1. Prioritize frame 1 for instant display
    const firstImg = new Image();
    firstImg.src = getFrameUrl(1);
    firstImg.onload = () => {
      images[1] = firstImg;
      loadedCount++;
      needsRedraw = true;

      // 2. Stream remaining 239 frames concurrently
      for (let i = 2; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.src = getFrameUrl(i);
        img.onload = () => {
          images[i] = img;
          loadedCount++;
          if (Math.abs(i - lastRenderedFrame) <= 1) {
            needsRedraw = true;
          }
        };
      }
    };
  }

  preloadImages();

  // ============================================================
  // 2. PORTFOLIO INTERACTIVITY (NAV SPY, FILTERS, FORM)
  // ============================================================

  // Active Nav Scroll Spy
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function highlightNavOnScroll() {
    const scrollY = window.scrollY;
    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 150;
      const sectionId = section.getAttribute('id');

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNavOnScroll, { passive: true });

  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }

  // Project Category Filter
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.style.opacity = '1';
        } else {
          card.style.display = 'none';
          card.style.opacity = '0';
        }
      });

      // Update scroll bounds after grid change
      setTimeout(updateScrollProgress, 100);
    });
  });

  // Contact Form Submission Handler
  const contactForm = document.getElementById('portfolio-contact-form');
  const formFeedback = document.getElementById('form-feedback');

  if (contactForm && formFeedback) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('form-name').value;

      formFeedback.textContent = `Thank you, ${nameVal || 'friend'}! Your message has been received. I'll get back to you within 24 hours.`;
      formFeedback.className = 'form-feedback success';
      contactForm.reset();

      setTimeout(() => {
        formFeedback.style.display = 'none';
      }, 6000);
    });
  }

})();
