/*
 * Vegas TV Mounting – premium UX layer
 * Scroll reveal, count-up stats, header/scroll state, progress bar,
 * back-to-top, smooth FAQ accordion, image fade-in and button loading states.
 */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inEditor = root.classList.contains('shopify-design-mode');
  const motion = !reduceMotion && !inEditor && 'IntersectionObserver' in window;

  if (motion) root.classList.add('vtm-motion');

  /* ------------------------------------------------------------
     Scroll reveal
  ------------------------------------------------------------- */
  const REVEAL_SINGLE = [
    '#MainContent h2',
    '#MainContent [class*="__sub-heading"]',
    '#MainContent [class*="__subheading"]',
    '.services-section__collection-heading',
    '.services-section__view-all',
    '.faq-section__view-all',
    '.before-after__compare',
    '.cta-banner__card',
    '.installation-gallery__slider-outer',
    '.testimonials__slider-outer',
    '.vtm-brand-marquee__viewport',
  ];

  // Children of these containers reveal one after another
  const REVEAL_GROUPS = [
    '.services-section__grid',
    '.why-choose-section__grid',
    '.home-types__grid',
    '.service-areas__grid',
    '.faq-section__accordion',
    '.services-grid__grid',
    '.related-services__grid',
    '.process-steps__grid',
    '.tv-projects__grid',
    '.git-methods-grid',
    '.trust-badges__grid',
    '.cta-buttons',
    '.hts-grid',
    '.wi-grid',
    '.bts-grid',
    '.home-types__list',
  ];

  const isBelowFold = (el) => el.getBoundingClientRect().top > window.innerHeight * 0.92;

  function setupReveal() {
    const pending = new Set();

    const reveal = (el) => {
      el.classList.add('vtm-in');
      // Drop the stagger delay once revealed so hover effects respond instantly
      if (el.style.getPropertyValue('--vtm-i')) setTimeout(() => el.style.removeProperty('--vtm-i'), 1400);
      pending.delete(el);
      observer.unobserve(el);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) reveal(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    const mark = (el, index = 0, type = 'up') => {
      if (el.hasAttribute('data-vtm-reveal') || el.closest('.hero-section, .sticky-mobile-bar')) return;
      // Anything already on screen stays put – no flash, no layout jump
      if (!isBelowFold(el)) return;
      el.setAttribute('data-vtm-reveal', type);
      if (index) el.style.setProperty('--vtm-i', String(Math.min(index, 8)));
      pending.add(el);
      observer.observe(el);
    };

    document.querySelectorAll(REVEAL_GROUPS.join(',')).forEach((group) => {
      [...group.children].forEach((child, i) => mark(child, i));
    });
    document.querySelectorAll(REVEAL_SINGLE.join(',')).forEach((el) => mark(el));

    // Safety net: anything scrolled past without intersecting (anchor jumps,
    // restored scroll position, very fast flicks) is revealed immediately.
    let queued = false;
    const sweep = () => {
      queued = false;
      const limit = window.innerHeight;
      pending.forEach((el) => {
        if (el.getBoundingClientRect().top < limit) reveal(el);
      });
      if (!pending.size) window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        setTimeout(sweep, 120);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('load', sweep, { once: true });
  }

  /* ------------------------------------------------------------
     Count-up numbers ("10,000+ Installations", "5 Years")
  ------------------------------------------------------------- */
  const COUNT_TARGETS = '.why-choose-section__title, .why-choose-section__badge, [data-vtm-count]';

  function setupCountUp() {
    const nodes = [];
    document.querySelectorAll(COUNT_TARGETS).forEach((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const match = node.nodeValue.match(/^(\s*)(\d{1,3}(?:,\d{3})+|\d{2,})(.*)$/s);
        if (!match) continue;
        const target = parseInt(match[2].replace(/,/g, ''), 10);
        if (target < 10) continue;
        nodes.push({ el, node, prefix: match[1], suffix: match[3], target, grouped: match[2].includes(',') });
        break;
      }
    });
    if (!nodes.length) return;

    const format = (n, grouped) => (grouped ? n.toLocaleString('en-US') : String(n));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          nodes
            .filter((item) => item.el === entry.target)
            .forEach(({ node, prefix, suffix, target, grouped }) => {
              const start = performance.now();
              const duration = 1600;
              const tick = (now) => {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 4);
                node.nodeValue = prefix + format(Math.round(target * eased), grouped) + suffix;
                if (p < 1) requestAnimationFrame(tick);
              };
              node.nodeValue = prefix + '0' + suffix;
              requestAnimationFrame(tick);
            });
        }
      },
      { threshold: 0.6 }
    );

    nodes.forEach(({ el }) => {
      if (isBelowFold(el)) observer.observe(el);
    });
  }

  /* ------------------------------------------------------------
     Scroll state: header elevation, progress bar, back-to-top
  ------------------------------------------------------------- */
  function setupScrollUi() {
    const progress = document.createElement('div');
    progress.className = 'vtm-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'vtm-top';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
    document.body.appendChild(top);

    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      document.body.classList.toggle('vtm-scrolled', y > 12);
      progress.style.setProperty('--vtm-progress', max > 0 ? Math.min(y / max, 1).toFixed(4) : '0');
      top.classList.toggle('is-visible', y > window.innerHeight * 1.2);
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ------------------------------------------------------------
     FAQ: animate <details> open / close
  ------------------------------------------------------------- */
  function setupAccordions() {
    if (!motion) return;
    document.querySelectorAll('details.faq-section__item').forEach((details) => {
      const summary = details.querySelector('summary');
      const panel = details.querySelector('.faq-section__answer');
      if (!summary || !panel) return;

      let animation = null;
      summary.addEventListener('click', (event) => {
        event.preventDefault();
        animation?.cancel();

        if (details.open) {
          animation = panel.animate(
            [
              { height: `${panel.offsetHeight}px`, opacity: 1 },
              { height: '0px', opacity: 0 },
            ],
            { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          );
          animation.onfinish = () => {
            details.open = false;
            animation = null;
          };
        } else {
          details.open = true;
          animation = panel.animate(
            [
              { height: '0px', opacity: 0 },
              { height: `${panel.scrollHeight}px`, opacity: 1 },
            ],
            { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          );
          animation.onfinish = () => (animation = null);
        }
      });
    });
  }

  /* ------------------------------------------------------------
     Images fade in once loaded (lazy images below the fold only)
  ------------------------------------------------------------- */
  function setupImages() {
    if (!motion) return;
    document.querySelectorAll('#MainContent img[loading="lazy"]').forEach((img) => {
      if (img.complete || !isBelowFold(img)) return;
      img.classList.add('vtm-img', 'vtm-img-pending');
      const done = () => img.classList.remove('vtm-img-pending');
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      // Safety net: never leave an image hidden
      setTimeout(done, 6000);
    });
  }

  /* ------------------------------------------------------------
     Loading state on buttons that navigate to another page
  ------------------------------------------------------------- */
  function setupButtonLoading() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a.btn-primary, a.view-all-service, .sticky-mobile-bar__btn');
      if (!link || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      if (link.target === '_blank' || link.classList.contains('js-connect-popup')) return;

      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || /^(tel|sms|mailto):/i.test(href)) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch (e) {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;

      link.classList.add('vtm-is-loading');
    });

    // Restore buttons when returning via the back/forward cache
    window.addEventListener('pageshow', () => {
      document.querySelectorAll('.vtm-is-loading').forEach((el) => el.classList.remove('vtm-is-loading'));
    });
  }

  /* ------------------------------------------------------------
     Before / after: stop the "drag me" pulse after first touch
  ------------------------------------------------------------- */
  function setupBeforeAfter() {
    document.querySelectorAll('.before-after__compare').forEach((el) => {
      const stop = () => el.classList.add('vtm-touched');
      el.addEventListener('pointerdown', stop, { once: true });
    });
  }

  /* ------------------------------------------------------------
     Desktop sticky booking bar: visible after the hero, hidden over the footer
  ------------------------------------------------------------- */
  function setupStickyCta() {
    const bar = document.querySelector('.vtm-sticky-cta');
    const firstSection = document.querySelector('#MainContent > .shopify-section');
    if (!bar || !firstSection) return;

    const footer = document.querySelector('body > footer');
    let pastHero = false;
    let footerInView = false;

    const apply = () => {
      const show = pastHero && !footerInView;
      bar.classList.toggle('is-visible', show);
      document.body.classList.toggle('vtm-has-sticky-cta', show);
      if (show) {
        bar.removeAttribute('inert');
        bar.removeAttribute('aria-hidden');
      } else {
        bar.setAttribute('inert', '');
        bar.setAttribute('aria-hidden', 'true');
      }
    };

    new IntersectionObserver(([entry]) => {
      pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      apply();
    }).observe(firstSection);

    if (footer) {
      new IntersectionObserver(([entry]) => {
        footerInView = entry.isIntersecting;
        apply();
      }).observe(footer);
    }
  }

  /* ------------------------------------------------------------
     Desktop mega menu for Residential / Commercial
  ------------------------------------------------------------- */
  function setupMegaMenu() {
    const panels = document.querySelectorAll('.vtm-mega[data-for]');
    const header = document.querySelector('#header-component');
    if (!panels.length || !header) return;

    const desktop = window.matchMedia('(hover: hover) and (min-width: 990px)');
    let openPanel = null;
    let closeTimer = null;

    const close = (panel = openPanel) => {
      if (!panel) return;
      panel.classList.remove('is-open');
      panel._link?.setAttribute('aria-expanded', 'false');
      setTimeout(() => {
        if (!panel.classList.contains('is-open')) panel.hidden = true;
      }, 250);
      if (openPanel === panel) openPanel = null;
    };

    const open = (panel) => {
      if (!desktop.matches) return;
      clearTimeout(closeTimer);
      if (openPanel && openPanel !== panel) close(openPanel);
      panel.style.setProperty('--vtm-mega-top', `${Math.round(header.getBoundingClientRect().bottom)}px`);
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('is-open'));
      panel._link?.setAttribute('aria-expanded', 'true');
      openPanel = panel;
    };

    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => close(), 180);
    };

    panels.forEach((panel) => {
      const path = panel.dataset.for;
      const link = [...header.querySelectorAll('.menu-list__link')].find(
        (a) => a.getAttribute('href') === path
      );
      if (!link) return;
      panel._link = link;
      link.setAttribute('aria-expanded', 'false');
      link.setAttribute('aria-controls', panel.id);

      link.addEventListener('mouseenter', () => open(panel));
      link.addEventListener('mouseleave', scheduleClose);
      link.addEventListener('focus', () => open(panel));
      link.addEventListener('blur', (event) => {
        if (!panel.contains(event.relatedTarget)) scheduleClose();
      });
      panel.addEventListener('mouseenter', () => clearTimeout(closeTimer));
      panel.addEventListener('mouseleave', scheduleClose);
      panel.addEventListener('focusout', (event) => {
        if (!panel.contains(event.relatedTarget) && event.relatedTarget !== link) scheduleClose();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && openPanel) {
        const link = openPanel._link;
        close();
        link?.focus();
      }
    });
    window.addEventListener('scroll', () => openPanel && close(), { passive: true });
  }

  /* ------------------------------------------------------------
     Mobile: swipe indicator for the services row
  ------------------------------------------------------------- */
  function setupSwipeRows() {
    document.querySelectorAll('.services-section__grid').forEach((row) => {
      const hint = document.createElement('div');
      hint.className = 'vtm-swipe-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = '<span class="vtm-swipe-hint__bar"><span></span></span> Swipe';
      row.after(hint);

      const update = () => {
        const max = row.scrollWidth - row.clientWidth;
        if (max <= 0) {
          hint.hidden = true;
          return;
        }
        hint.hidden = false;
        const size = Math.max((row.clientWidth / row.scrollWidth) * 100, 15);
        const progress = row.scrollLeft / max;
        hint.style.setProperty('--vtm-swipe-size', `${size}%`);
        hint.style.setProperty('--vtm-swipe-pos', `${progress * (100 / size) * (100 - size)}%`);
      };
      row.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ------------------------------------------------------------
     Mobile: collapsible footer link groups
  ------------------------------------------------------------- */
  function setupFooterAccordion() {
    if (!window.matchMedia('(max-width: 749px)').matches) return;

    document.querySelectorAll('.cstm-footer__col:not(.cstm-footer__col--brand) .cstm-footer__heading').forEach((heading, i) => {
      const list = heading.nextElementSibling;
      if (!list || list.tagName !== 'UL') return;

      const panel = document.createElement('div');
      panel.className = 'vtm-acc-panel';
      panel.id = `vtm-footer-panel-${i}`;
      list.before(panel);
      panel.appendChild(list);

      heading.classList.add('vtm-acc');
      heading.setAttribute('role', 'button');
      heading.setAttribute('tabindex', '0');
      heading.setAttribute('aria-expanded', 'false');
      heading.setAttribute('aria-controls', panel.id);

      const toggle = () => {
        const open = heading.getAttribute('aria-expanded') !== 'true';
        heading.setAttribute('aria-expanded', String(open));
        panel.classList.toggle('is-open', open);
      };
      heading.addEventListener('click', toggle);
      // First group starts open
      if (i === 0) toggle();
      heading.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });
  }

  /* ------------------------------------------------------------
     Google reviews widget (Elfsight): hide the free-plan backlink.
     It renders inside a shadow root, so page CSS can't reach it.
  ------------------------------------------------------------- */
  function hideReviewsBacklink() {
    // Elfsight pins this link visible with inline !important styles, so it has to be removed.
    const strip = (root) =>
      root.querySelectorAll("a[href*='elfsight.com'][href*='free-widget']").forEach((link) => link.remove());
    const patch = () => {
      document.querySelectorAll('.es-embed-root').forEach((host) => {
        const root = host.shadowRoot;
        if (!root) return;
        strip(root);
        if (!host.dataset.vtmWatched) {
          // Remove it again if the widget re-renders
          host.dataset.vtmWatched = '1';
          new MutationObserver(() => strip(root)).observe(root, { childList: true, subtree: true });
        }
      });
    };
    const apps = document.querySelectorAll('[class*="elfsight-app"]');
    if (!apps.length) return;
    // The widget loads lazily (when scrolled near) and attaches its shadow root
    // without a DOM mutation we can observe, so poll until every widget is patched.
    const pollFor = (app) => {
      const timer = setInterval(() => {
        patch();
        if (app.querySelector('.es-embed-root[data-vtm-watched]')) clearInterval(timer);
      }, 400);
      setTimeout(() => clearInterval(timer), 30000);
    };
    // Start polling when a widget nears the viewport, which is when Elfsight loads it
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          pollFor(entry.target);
        });
      },
      { rootMargin: '600px 0px' }
    );
    apps.forEach((app) => io.observe(app));
  }

  /* ------------------------------------------------------------
     Animated hero videos: load only when on screen, fade in once playing,
     pause off-screen. Mobile / reduced motion / data saver keep the still image.
  ------------------------------------------------------------- */
  function setupHeroVideos() {
    const videos = document.querySelectorAll('video.vtm-hero-video[data-src]');
    if (!videos.length || reduceMotion || !('IntersectionObserver' in window)) return;
    if (navigator.connection?.saveData) return;
    const isMobile = window.matchMedia('(max-width: 749px)').matches;
    const onScreen = new Set();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target: video, isIntersecting }) => {
          if (!isIntersecting) {
            onScreen.delete(video);
            video.pause();
            return;
          }
          onScreen.add(video);
          if (!video.src) {
            video.src = video.dataset.src;
            video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
          }
          video.play().catch(() => {});
        });
      },
      { rootMargin: '200px 0px' }
    );

    videos.forEach((video) => {
      if (isMobile && !video.hasAttribute('data-mobile')) return;
      video.muted = true;
      io.observe(video);
    });

    document.addEventListener('visibilitychange', () => {
      onScreen.forEach((video) => {
        if (document.hidden) video.pause();
        else video.play().catch(() => {});
      });
    });
  }

  function init() {
    if (motion) {
      setupReveal();
      setupCountUp();
    }
    setupScrollUi();
    setupAccordions();
    setupImages();
    setupButtonLoading();
    setupBeforeAfter();
    if ('IntersectionObserver' in window) setupStickyCta();
    setupMegaMenu();
    setupSwipeRows();
    setupFooterAccordion();
    hideReviewsBacklink();
    setupHeroVideos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
