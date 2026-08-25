/* ============================================================
 * VEGAS TV MOUNTING — RESIDENTIAL BOOKING WIZARD ENGINE
 * ------------------------------------------------------------
 * Config-driven. The service CATALOG below is fully declarative
 * and JSON-serializable, so it can be replaced 1:1 by a Shopify
 * metaobject feed later (see booking-wizard.liquid / README).
 *
 * Only rules that span services live in the engine (routing,
 * dedup, progress, pricing). Everything service-specific lives
 * in the catalog and comes straight from the approved specs.
 *
 * IMPORTANT (per client): NO running total is shown during the
 * individual service steps. Each option shows its own price; the
 * full itemized subtotal / taxes / discounts / fees / total are
 * revealed ONLY on the Review & Book screen.
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- tiny helpers ---------- */
  const money = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const ICON_CHECK = '<svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M12.5 1.5 4.7 9.8 1.5 6.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ============================================================
   * SERVICE CATALOG  (source of truth = approved service specs)
   * ============================================================ */

  // Default services — used when no services are provided via config/metafields.
  // When services are passed in config, these defaults are overridden entirely.
  const DEFAULT_SERVICES = [
    { group: 'TV & Entertainment', id: 'tv-mounting',        name: 'TV Mounting',                 booking: 'instant', ready: true },
    { group: 'TV & Entertainment', id: 'soundbar',           name: 'Soundbar Installation',       booking: 'instant', ready: true },
    { group: 'TV & Entertainment', id: 'wire-concealment',   name: 'Wire Concealment',            booking: 'instant', ready: false, ownedBy: 'tv-mounting' },
    { group: 'TV & Entertainment', id: 'smart-tv-setup',     name: 'Smart TV & Device Setup',     booking: 'instant', ready: false, ownedBy: 'tv-mounting' },
    { group: 'TV & Entertainment', id: 'tv-dismount',        name: 'TV Dismount',                 booking: 'instant', ready: false },
    { group: 'Smart Home',         id: 'video-doorbell',     name: 'Video Doorbell Installation', booking: 'instant', ready: false },
    { group: 'Smart Home',         id: 'smart-lock',         name: 'Smart Lock Installation',     booking: 'instant', ready: false },
    { group: 'Smart Home',         id: 'smart-thermostat',   name: 'Smart Thermostat Installation', booking: 'instant', ready: false },
    { group: 'Home Décor',         id: 'art-mirror',         name: 'Art & Mirror Hanging',        booking: 'instant', ready: false },
    { group: 'Custom Projects',    id: 'home-theater',       name: 'Home Theater Installation',   booking: 'quote' },
    { group: 'Custom Projects',    id: 'surround-sound',     name: 'Surround Sound Installation', booking: 'quote' },
    { group: 'Custom Projects',    id: 'home-security',      name: 'Home Security Camera Installation', booking: 'quote' },
    { group: 'Custom Projects',    id: 'smart-lighting',     name: 'Smart Lighting Installation', booking: 'quote' },
    { group: 'Custom Projects',    id: 'led-accent',         name: 'LED Accent Lighting Installation', booking: 'quote' }
  ];

  // Default module order (master spec §5). Only modules present here render.
  const DEFAULT_MODULE_ORDER = ['tv-mounting', 'wire-concealment', 'smart-tv-setup', 'soundbar'];

  /* ---------- TV MOUNTING module (spec v1.0, steps 4–10) ---------- */
  const MOD_TV = {
    id: 'tv-mounting',
    label: 'TV Mounting',
    steps: [
      {
        id: 'tv-size', kind: 'qty', anchorPrimary: true,
        included: '<b>What’s included:</b> Professional measuring and placement, installation of the TV mount, securely mounting and leveling the TV, final positioning and installation check, and cleanup of the immediate work area.',
        title: 'What size is your TV?',
        sub: 'Tap + to add each TV you want mounted.',
        validate: { mode: 'min', value: 1 },
        options: [
          { id: 's', name: '31" or smaller (Small)', price: 69 },
          { id: 'm', name: '32"–60" (Standard)', price: 119 },
          { id: 'l', name: '61"–80" (Large)', price: 139 },
          { id: 'xl', name: '81"+ (Extra Large)', price: 249 }
        ]
      },
      {
        id: 'tv-specialty', kind: 'qty',
        title: 'Are any of your TVs a Samsung Frame or LG Gallery TV?',
        sub: 'Tap + to add the number of Frame or Gallery TVs being mounted.',
        validate: { mode: 'max', ref: 'primary' },
        none: { id: 'none', name: 'None of my TVs are Frame or Gallery' },
        options: [
          { id: 'frame', name: 'Samsung Frame Specialty Installation', price: 49 },
          { id: 'gallery', name: 'LG Gallery Specialty Installation', price: 49 }
        ]
      },
      {
        id: 'tv-mount', kind: 'qty',
        title: 'Should we bring a TV mount for your TV?',
        sub: 'Tap + to select one TV mount option for each TV.',
        help: { label: 'Not sure what to pick? See examples.', title: 'TV Mount Types' },
        validate: { mode: 'equal', ref: 'primary' },
        options: [
          { id: 'own', name: 'I have my own TV Mount', price: 0 },
          { id: 'fixed', name: 'Heavy Duty Fixed / Flat TV Mount', price: 59, product: true },
          { id: 'tilt', name: 'Heavy Duty Tilting TV Mount', price: 79, product: true },
          { id: 'full', name: 'Heavy Duty Full-Motion TV Mount', price: 189, product: true }
        ]
      },
      {
        id: 'tv-fireplace', kind: 'qty',
        title: 'Will any TVs be mounted above a fireplace?',
        sub: 'Tap + to add the number of TVs being mounted above a fireplace.',
        validate: { mode: 'max', ref: 'primary' },
        options: [{ id: 'fp', name: 'Above Fireplace', price: 29 }]
      },
      {
        id: 'tv-surface', kind: 'qty',
        title: 'What type of surface will each TV be mounted to?',
        sub: 'Tap + to select the wall type for each TV.',
        help: { label: 'Not sure what your wall is? See examples.', title: 'Wall / Surface Types' },
        validate: { mode: 'equal', ref: 'primary' },
        options: [
          { id: 'drywall', name: 'Drywall / Wood / Siding', price: 0 },
          { id: 'metal', name: 'Metal Studs', price: 19 },
          { id: 'brick', name: 'Brick / Smooth Stone / Stucco', price: 29 },
          { id: 'tile', name: 'Tile / Porcelain / Marble', price: 49 },
          { id: 'stone', name: 'Natural / Uneven Stacked Stone', price: 49 }
        ]
      },
      {
        id: 'tv-wire', kind: 'qty',
        title: 'Would you like to hide your TV wires?',
        sub: 'Tap + to select one wire option for each TV.',
        help: { label: 'Not sure which to pick? See examples.', title: 'Wire Concealment Options' },
        validate: { mode: 'equal', ref: 'primary' },
        options: [
          { id: 'behind', name: 'Hide Wires Behind the Wall', price: 149, desc: 'Behind-wall concealment is subject to wall construction and accessibility. If standard in-wall concealment is not feasible, we’ll contact you before service to discuss available options.' },
          { id: 'outside', name: 'Hide Wires Outside the Wall', price: 49 },
          { id: 'visible', name: 'Leave Wires Visible', price: 0 },
          { id: 'oneconnect', name: 'Conceal Samsung One Connect Box Behind the TV', price: 349, desc: 'Includes recessed concealment of the One Connect Box behind the TV.', maxRef: { step: 'tv-specialty', option: 'frame' } }
        ]
      },
      {
        id: 'tv-device', kind: 'qty',
        title: 'Need help setting up your TV or devices?',
        sub: 'Tap + to add setup for each TV that needs it.',
        validate: { mode: 'max', ref: 'primary' },
        none: { id: 'none', name: 'No Setup Needed' },
        options: [
          { id: 'setup', name: 'Smart TV & Device Setup', price: 39, desc: 'Smart TV, Streaming Devices, Apple TV, Gaming Consoles, etc.' }
        ]
      }
    ]
  };

  /* ---------- SOUNDBAR module (spec v1.0, steps 4–8) ---------- */
  const MOD_SB = {
    id: 'soundbar',
    label: 'Soundbar Installation',
    steps: [
      {
        id: 'sb-count', kind: 'qty', anchorPrimary: true,
        included: '<b>What’s included:</b> Professional soundbar installation, basic audio connection to the TV, first-time setup and configuration, testing, leveling when mounted, and cleanup of the immediate work area. Standard installation hardware is included when applicable.',
        title: 'How many soundbars would you like us to install?',
        sub: 'Tap + to add each soundbar you need installed.',
        validate: { mode: 'min', value: 1 },
        options: [{ id: 'soundbar', name: 'Soundbar Installation', price: 0, priceHidden: true }]
      },
      {
        id: 'sb-install', kind: 'qty',
        title: 'How would you like each soundbar installed?',
        sub: 'Tap + to select one installation option for each soundbar.',
        help: { label: 'Not sure what to pick? See examples.', title: 'Installation Types' },
        validate: { mode: 'equal', ref: 'primary' },
        options: [
          { id: 'mount', name: 'Mount Soundbar to Wall or TV + Setup', price: 99, countsAsMounted: true },
          { id: 'setuponly', name: 'Setup Only — No Mounting', price: 79 }
        ]
      },
      {
        id: 'sb-mount', kind: 'qty', showIfMounted: true,
        title: 'Do you already have a soundbar mount?',
        sub: 'Tap + to add one mount option for each soundbar being mounted.',
        validate: { mode: 'equal', ref: 'mounted' },
        options: [
          { id: 'own', name: 'I Have My Own Soundbar Mount', price: 0 },
          { id: 'provide', name: 'Vegas TV Mounting Provides Heavy Duty Soundbar Mount', price: 69, product: true }
        ]
      },
      {
        id: 'sb-surface', kind: 'qty', showIfMounted: true,
        title: 'Where will each soundbar be mounted?',
        sub: 'Tap + to select one mounting location or surface for each soundbar.',
        help: { label: 'Not sure what to pick? See examples.', title: 'Mounting Location / Surface' },
        validate: { mode: 'equal', ref: 'mounted' },
        options: [
          { id: 'drywall', name: 'Drywall / Wood / Siding', price: 0 },
          { id: 'metal', name: 'Metal Studs', price: 19 },
          { id: 'brick', name: 'Brick / Smooth Stone / Stucco', price: 29 },
          { id: 'tile', name: 'Tile / Porcelain / Marble', price: 49 },
          { id: 'stone', name: 'Natural / Uneven Stacked Stone', price: 49 },
          { id: 'totv', name: 'Mount to TV', price: 0 }
        ]
      },
      {
        id: 'sb-fireplace', kind: 'qty', showIfMounted: true,
        title: 'Will any soundbars be installed above a fireplace?',
        sub: 'Tap + to add the number of soundbars being installed above a fireplace.',
        validate: { mode: 'max', ref: 'mounted' },
        options: [{ id: 'fp', name: 'Above Fireplace', price: 29 }]
      }
    ]
  };

  // Default module definitions — used when no custom modules are provided via config.
  // Keys match service IDs. Only services with a module entry here can use instant booking.
  const DEFAULT_MODULES = { 'tv-mounting': MOD_TV, 'soundbar': MOD_SB };

  /* ---------- Shared ending screens (master spec §9) ---------- */
  const COVERAGE_STEP = {
    id: 'coverage', kind: 'coverage', belongsTo: 'shared',
    title: 'Lifetime Removal Coverage',
    sub: 'Protect your installed items for a one-time price of $29 per item, with no expiration.',
    none: { id: 'none', name: 'No Thanks, Continue Without Lifetime Coverage' },
    options: [
      { id: 'today', name: 'Add Lifetime Coverage to Items Being Installed Today', price: 29 },
      { id: 'other', name: 'Add Lifetime Coverage to Another Item', price: 29, desc: 'For another eligible item that is already installed or will be installed in the future, regardless of who installs it.' }
    ]
  };

  const COVERAGE_PRICE = 29;
  const AFTER_HOURS_FEE = 75;

  /* Appointment slots (mirrors approved mockup). Real deployments
     should source availability from HCP; see README. */
  // Fallback slots used only if HCP availability can't be loaded.
  const SLOTS = [
    { id: '08:00', start: '08:00', end: '10:00', label: '8:00 AM – 10:00 AM' },
    { id: '11:00', start: '11:00', end: '13:00', label: '11:00 AM – 1:00 PM' },
    { id: '14:00', start: '14:00', end: '16:00', label: '2:00 PM – 4:00 PM' },
    { id: '17:00', start: '17:00', end: '20:00', label: '5:00 PM – 8:00 PM' },
    { id: '20:00', start: '20:00', end: '22:00', label: '8:00 PM – 10:00 PM', afterHours: true }
  ];

  const AFTER_HOURS_START_MIN = 20 * 60; // 8:00 PM
  const SLOT_LEN_MIN = 120;              // 2-hour arrival windows
  const DAY_IDX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const timeToMin = (t) => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const minToHHMM = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  const minToLabel = (n) => { let h = Math.floor(n / 60), m = n % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (m ? ':' + String(m).padStart(2, '0') : ':00') + ' ' + ap; };

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  /* ============================================================
   * ENGINE
   * ============================================================ */
  class BookingWizard {
    constructor(root, config) {
      this.root = root;
      this.cfg = Object.assign({
        apiEndpoint: '',
        allowedZips: [],      // empty => accept any valid 5-digit, backend confirms
        taxRate: 0,           // e.g. 0.0838 for 8.38%
        brandName: 'Vegas TV Mounting',
        phone: '',
        termsUrl: '',
        logo: '',
        sharedSecret: '',     // sent as X-Booking-Secret header to the endpoint
        services: null,       // JSON array of service objects from metafields; null = use defaults
        moduleOrder: null     // JSON array of module IDs from metafields; null = use defaults
      }, config || {});

      // Use config-provided services or fall back to hardcoded defaults
      this.services = (Array.isArray(this.cfg.services) && this.cfg.services.length > 0) ? this.cfg.services : DEFAULT_SERVICES;
      this.moduleOrder = (Array.isArray(this.cfg.moduleOrder) && this.cfg.moduleOrder.length > 0) ? this.cfg.moduleOrder : DEFAULT_MODULE_ORDER;

      this.state = {
        zip: '', zipValid: false,
        propertyType: '',
        services: [],
        mode: 'instant',
        qty: {},            // 'stepId:optionId' -> number
        none: {},           // stepId -> bool
        choice: {},         // stepId -> optionId (single-select)
        terms: false,
        appt: { date: null, slot: null },
        customer: {},
        card: {},           // { number, exp, cvc, brand } — never sent raw
        community: false,   // Community Appreciation Discount opt-in
        sms: false,
        quoteNotes: ''
      };
      this.fieldErrors = {}; // field id -> message (customer/quote steps)
      this.index = 0;
      this.calMonth = null; // Date pointing to first of displayed month
      this.submitting = false;
      this.showLoader();
    }

    /* ---------- loader ---------- */
    showLoader() {
      this.root.classList.add('bw-root');
      this.root.innerHTML = `<div class="bw-loader">
        <div class="bw-loader__spinner"></div>
        <p class="bw-loader__text">Loading booking Form...</p>
      </div>`;
      setTimeout(() => {
        this.build();
        this.render();
      }, 1500);
    }

    /* ---------- key helpers ---------- */
    q(step, opt) { return this.state.qty[step + ':' + opt] || 0; }
    setQ(step, opt, v) { this.state.qty[step + ':' + opt] = Math.max(0, v); }
    stepTotal(step) { return step.options.reduce((s, o) => s + this.q(step.id, o.id), 0); }

    activeModules() {
      return this.moduleOrder
        .filter((id) => this.getModule(id) && this.state.services.includes(id))
        .map((id) => this.getModule(id));
    }
    getModule(id) {
      return DEFAULT_MODULES[id] || null;
    }
    modulePrimary(mod) {
      const anchor = mod.steps.find((s) => s.anchorPrimary);
      return anchor ? this.stepTotal(anchor) : 0;
    }
    moduleMounted(mod) {
      let n = 0;
      mod.steps.forEach((s) => s.options.forEach((o) => { if (o.countsAsMounted) n += this.q(s.id, o.id); }));
      return n;
    }
    anchorValue(mod, ref) {
      if (ref === 'primary') return this.modulePrimary(mod);
      if (ref === 'mounted') return this.moduleMounted(mod);
      return 0;
    }
    optionMax(mod, opt) {
      if (!opt.maxRef) return Infinity;
      return this.q(opt.maxRef.step, opt.maxRef.option);
    }

    /* count of eligible installed items (for coverage cap) */
    installedItemCount() {
      let n = 0;
      this.activeModules().forEach((mod) => { n += this.modulePrimary(mod); });
      return n;
    }

    /* ---------- routing / mode ---------- */
    computeMode() {
      if (this.state.propertyType === 'commercial') return 'commercial';
      const sel = this.state.services;
      let needsQuote = false;
      sel.forEach((id) => {
        const svc = this.services.find((s) => s.id === id);
        if (!svc) return;
        if (svc.booking === 'quote') needsQuote = true;
        else if (svc.booking === 'instant' && !svc.ready) {
          const satisfied = svc.ownedBy && sel.includes(svc.ownedBy);
          if (!satisfied) needsQuote = true; // no approved standalone spec yet -> quote it
        }
      });
      return needsQuote ? 'quote' : 'instant';
    }

    /* ---------- active step list (drives progress + nav) ---------- */
    buildSteps() {
      const S = [];
      S.push({ id: 'zip', kind: 'zip', title: 'What is the ZIP code where you need service?', sub: 'Enter your ZIP code to confirm service availability in your area.' });
      S.push({ id: 'property', kind: 'property', title: 'Is this for a residential or commercial property?', sub: 'Select the type of property where you need service.' });
      S.push({ id: 'services', kind: 'services', title: 'Which services can we help with today?', sub: 'Select all services you need completed during your appointment.' });

      if (this.state.mode === 'instant') {
        this.activeModules().forEach((mod) => {
          mod.steps.forEach((s) => {
            if (s.showIfMounted && this.moduleMounted(mod) <= 0) return;
            S.push(Object.assign({ belongsTo: mod.id, _mod: mod }, s));
          });
        });
        S.push(COVERAGE_STEP);
        S.push({ id: 'terms', kind: 'terms', belongsTo: 'shared', title: 'Terms of Service', sub: 'Please review and accept our Terms of Service to continue.' });
        S.push({ id: 'appointment', kind: 'appointment', belongsTo: 'shared', title: 'What day and time works best for you?', sub: 'Choose an available appointment time. Appointments starting at 8:00 PM or later include a $75 after-hours fee.' });
        S.push({ id: 'customer', kind: 'customer', belongsTo: 'shared', title: 'Almost done! Last step…', sub: 'Your card will only hold your appointment and will not be charged until your service is complete.' });
        S.push({ id: 'review', kind: 'review', belongsTo: 'shared', title: 'Review your booking', sub: 'Please review your services, appointment details, and total before completing your booking.' });
      } else {
        // quote / commercial path
        const commercial = this.state.mode === 'commercial';
        S.push({
          id: 'quote', kind: 'quote', belongsTo: 'shared',
          title: commercial ? 'Request your commercial quote' : 'Request your custom quote',
          sub: 'Share your contact details and any project notes. No card or appointment is needed — our team will reach out with your personalized quote.'
        });
        S.push({ id: 'quote-review', kind: 'quoteReview', belongsTo: 'shared', title: 'Review your request', sub: 'Confirm your details before we send your quote request.' });
      }
      this.steps = S;
      return S;
    }

    currentStep() { return this.steps[this.index]; }

    /* ============================================================
     * DOM scaffold
     * ============================================================ */
    build() {
      this.root.classList.add('bw-root');
      this.root.innerHTML = `
        <div class="bw-shell">
          <div class="bw-main">
            <div class="bw-progress" data-progress>
              <div class="bw-progress__track"><div class="bw-progress__bar" data-bar></div></div>
              <p class="bw-progress__label" data-plabel></p>
            </div>
            <div class="bw-body" data-body></div>
            <div class="bw-foot" data-foot></div>
          </div>
        </div>`;
      this.$body = this.root.querySelector('[data-body]');
      this.$foot = this.root.querySelector('[data-foot]');
      this.$bar = this.root.querySelector('[data-bar]');
      this.$plabel = this.root.querySelector('[data-plabel]');
      this.$progress = this.root.querySelector('[data-progress]');
    }

    /* ============================================================
     * RENDER
     * ============================================================ */
    render() {
      this.buildSteps();
      if (this.index >= this.steps.length) this.index = this.steps.length - 1;
      const step = this.currentStep();

      // progress
      const total = this.steps.length;
      const cur = this.index + 1;
      this.$bar.style.width = (cur / total * 100) + '%';
      this.$plabel.textContent = 'Step ' + cur + ' of ' + total;
      this.$progress.style.display = (step.kind === 'done') ? 'none' : '';

      // body
      this.$body.innerHTML = '';
      const node = this['view_' + step.kind] ? this['view_' + step.kind](step) : el('<div>Unknown step</div>');
      this.$body.appendChild(node);

      // footer nav
      this.renderFoot(step);
      this.$body.scrollTop = 0;
      this.root.querySelector('.bw-body').scrollTop = 0;
    }

    renderFoot(step) {
      if (step.kind === 'done') { this.$foot.innerHTML = ''; return; }
      const isFirst = this.index === 0;
      let nextLabel = 'Continue';
      if (step.kind === 'review') nextLabel = 'Complete My Booking';
      else if (step.kind === 'quoteReview') nextLabel = 'Submit Request';
      const nextIcon = (step.kind === 'review' || step.kind === 'quoteReview') ? ICON_CHECK : '<svg width="15" height="12" viewBox="0 0 15 12" fill="none"><path d="M9 1l5 5-5 5M14 6H1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      this.$foot.innerHTML = `
        <button class="bw-btn bw-btn--ghost" data-back ${isFirst ? 'disabled style="visibility:hidden"' : ''}>
          <svg width="15" height="12" viewBox="0 0 15 12" fill="none"><path d="M6 1 1 6l5 5M1 6h13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Back
        </button>
        <div class="bw-foot__spacer" style="flex:1"></div>
        <button class="bw-btn bw-btn--primary bw-btn--wide" data-next>
          <span class="bw-next-label">${esc(nextLabel)}</span> ${nextIcon}
        </button>`;
      this.$foot.querySelector('[data-back]')?.addEventListener('click', () => this.back());
      this.$foot.querySelector('[data-next]').addEventListener('click', () => this.next());
    }

    setError(msg) {
      let e = this.$body.querySelector('.bw-inline-error');
      if (!e) { e = el('<p class="bw-inline-error"></p>'); this.$body.appendChild(e); }
      e.textContent = msg || '';
    }

    /* ---------- navigation ---------- */
    back() { if (this.index > 0) { this.index--; this.render(); } }
    next() {
      const step = this.currentStep();
      const err = this.validateStep(step);
      if (err) {
        // re-render to surface inline per-field errors, then show the summary
        if (step.kind === 'customer' || step.kind === 'quote') this.render();
        this.setError(err);
        return;
      }

      // routing decision after service selection
      if (step.kind === 'services') {
        const newMode = this.computeMode();
        if (newMode !== this.state.mode) {
          this.state.mode = newMode;
          this.buildSteps();
        }
      }
      if (step.kind === 'property') {
        const m = this.computeMode();
        this.state.mode = m; // commercial detection
      }

      if (step.kind === 'review') { this.submit(false); return; }
      if (step.kind === 'quoteReview') { this.submit(true); return; }

      if (this.index < this.steps.length - 1) { this.index++; this.render(); }
    }

    /* ============================================================
     * VALIDATION
     * ============================================================ */
    validateStep(step) {
      switch (step.kind) {
        case 'zip':
          if (!/^\d{5}$/.test(this.state.zip)) return 'Please enter a valid 5-digit ZIP code.';
          if (!this.state.zipValid) return 'Sorry, we don’t service that ZIP yet. Please check the ZIP or contact us.';
          return '';
        case 'property':
          if (!this.state.propertyType) return 'Please select a property type.';
          return '';
        case 'services':
          if (!this.state.services.length) return 'Please select at least one service.';
          return '';
        case 'qty': return this.validateQty(step);
        case 'coverage':
          if (!this.state.none['coverage'] && (this.q('coverage', 'today') + this.q('coverage', 'other')) === 0)
            return 'Please add coverage or choose “No Thanks” to continue.';
          return '';
        case 'terms':
          if (!this.state.terms) return 'Please accept the Terms of Service to continue.';
          return '';
        case 'appointment':
          if (!this.state.appt.date) return 'Please choose an appointment date.';
          {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const d = new Date(this.state.appt.date + 'T00:00:00');
            if (d < today) { this.state.appt.date = null; this.state.appt.slot = null; return 'That date has passed — please choose an upcoming date.'; }
          }
          if (!this.state.appt.slot) return 'Please choose an appointment time.';
          return '';
        case 'customer': return this.validateCustomer();
        case 'review':
          if (!this.state.sms) return 'Please agree to receive appointment text messages to continue.';
          return '';
        case 'quote': return this.validateQuote();
        default: return '';
      }
    }

    validateQty(step) {
      const mod = step._mod;
      const total = this.stepTotal(step);
      // option-level max (e.g. Samsung One Connect <= Frame TVs)
      for (const o of step.options) {
        const mx = this.optionMax(mod, o);
        if (this.q(step.id, o.id) > mx) return 'You can select up to ' + mx + ' × “' + o.name + '”.';
      }
      if (step.none && this.state.none[step.id]) return ''; // explicit none is valid
      const v = step.validate || {};
      if (v.mode === 'min') { if (total < v.value) return 'Please select at least ' + v.value + ' to continue.'; }
      if (v.mode === 'equal') { const a = this.anchorValue(mod, v.ref); if (total !== a) return 'Please select exactly ' + a + ' (you’ve selected ' + total + ').'; }
      if (v.mode === 'max') { const a = this.anchorValue(mod, v.ref); if (total > a) return 'You can select up to ' + a + ' (you’ve selected ' + total + ').'; }
      if (step.none && total === 0) return 'Please make a selection or choose “' + step.none.name + '”.';
      return '';
    }

    validateCustomer() {
      const c = this.state.customer;
      const cd = this.state.card;
      const e = {};
      const req = { firstName: 'First name is required.', lastName: 'Last name is required.', address: 'Street address is required.', city: 'City is required.', region: 'State is required.' };
      for (const k in req) if (!c[k] || !String(c[k]).trim()) e[k] = req[k];
      if (!c.email || !String(c.email).trim()) e.email = 'Email is required.';
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) e.email = 'Enter a valid email address.';
      if (!c.phone || !String(c.phone).trim()) e.phone = 'Phone number is required.';
      else if (String(c.phone).replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit phone number.';
      if (!c.zip || !/^\d{5}$/.test(String(c.zip).trim())) e.zip = 'Enter a valid 5-digit ZIP.';

      // card (client-side format validation only — never transmitted raw)
      const num = (cd.number || '').replace(/\s/g, '');
      if (!num) e.cardNumber = 'Card number is required.';
      else if (!luhn(num) || num.length < 13) e.cardNumber = 'That card number doesn’t look valid.';
      if (!validExpiry(cd.exp || '')) e.cardExp = 'Enter a valid future expiry (MM/YY).';
      const brand = detectBrand(num);
      const cvcLen = brand === 'amex' ? 4 : 3;
      if (!/^\d+$/.test(cd.cvc || '') || (cd.cvc || '').length !== cvcLen) e.cardCvc = 'Enter the ' + cvcLen + '-digit code.';

      this.fieldErrors = e;
      const keys = Object.keys(e);
      return keys.length ? 'Please fix the highlighted field' + (keys.length > 1 ? 's' : '') + '.' : '';
    }

    validateQuote() {
      const c = this.state.customer;
      const e = {};
      const req = { firstName: 'First name is required.', lastName: 'Last name is required.' };
      for (const k in req) if (!c[k] || !String(c[k]).trim()) e[k] = req[k];
      if (!c.email || !String(c.email).trim()) e.email = 'Email is required.';
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) e.email = 'Enter a valid email address.';
      if (!c.phone || !String(c.phone).trim()) e.phone = 'Phone number is required.';
      else if (String(c.phone).replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit phone number.';
      this.fieldErrors = e;
      const keys = Object.keys(e);
      return keys.length ? 'Please fix the highlighted field' + (keys.length > 1 ? 's' : '') + '.' : '';
    }

    /* ============================================================
     * STEP VIEWS
     * ============================================================ */
    head(step, extra) {
      return `<div class="bw-step__head">
        <h1 class="bw-step__title">${esc(step.title)}</h1>
        ${step.sub ? `<p class="bw-step__sub">${esc(step.sub)}</p>` : ''}
        ${extra || ''}
      </div>`;
    }

    view_zip(step) {
      const st = this.state;
      const m0 = this.zipMsg(st.zip);
      const node = el(`<div class="bw-step">
        ${this.head(step)}
        <div class="bw-field">
          <input class="bw-input bw-input--zip" inputmode="numeric" maxlength="5" placeholder="00000" value="${esc(st.zip)}" data-zip>
        </div>
        <p class="bw-zip-status ${m0.cls}" data-zipstatus>${m0.text}</p>
      </div>`);
      const input = node.querySelector('[data-zip]');
      input.addEventListener('input', (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 5);
        e.target.value = v; st.zip = v;
        st.zipValid = this.checkZip(v);
        const s = node.querySelector('[data-zipstatus]');
        const m = this.zipMsg(v);
        s.className = 'bw-zip-status ' + m.cls;
        s.textContent = m.text;
        this.setError('');
      });
      return node;
    }
    checkZip(v) {
      if (!/^\d{5}$/.test(v)) return false;
      if (!this.cfg.allowedZips || !this.cfg.allowedZips.length) return true; // no list => backend confirms
      return this.cfg.allowedZips.includes(v);
    }
    zipMsg(v) {
      if (!/^\d{5}$/.test(v)) return { cls: '', text: '' };
      const hasList = this.cfg.allowedZips && this.cfg.allowedZips.length;
      if (this.checkZip(v)) {
        return { cls: 'is-ok', text: hasList ? '✓ Great news — we service your area!' : '✓ Thanks — we’ll confirm availability for your area.' };
      }
      return { cls: 'is-bad', text: 'Sorry, we don’t currently service this ZIP code.' };
    }

    view_property(step) {
      const st = this.state;
      const opt = (id, name, desc) => `
        <button class="bw-choice bw-choice--radio ${st.propertyType === id ? 'is-active' : ''}" data-prop="${id}">
          <span class="bw-choice__box">${ICON_CHECK}</span>
          <span class="bw-choice__text"><span class="bw-choice__name">${name}</span><span class="bw-choice__desc">${desc}</span></span>
        </button>`;
      const node = el(`<div class="bw-step">${this.head(step)}
        <div class="bw-options">
          ${opt('residential', 'Residential', 'A home, apartment, or condo.')}
          ${opt('commercial', 'Commercial', 'A business, office, or commercial property.')}
        </div></div>`);
      node.querySelectorAll('[data-prop]').forEach((b) => b.addEventListener('click', () => {
        st.propertyType = b.dataset.prop; this.setError(''); this.render();
      }));
      return node;
    }

    view_services(step) {
      const st = this.state;
      const groups = {};
      this.services.forEach((s) => { (groups[s.group] = groups[s.group] || []).push(s); });
      let html = `<div class="bw-step">${this.head(step)}<div class="bw-options">`;
      Object.keys(groups).forEach((g) => {
        html += `<div class="bw-group-label">${esc(g)}</div>`;
        groups[g].forEach((s) => {
          const on = st.services.includes(s.id);
          html += `<button class="bw-choice ${on ? 'is-active' : ''}" data-svc="${s.id}">
            <span class="bw-choice__box">${ICON_CHECK}</span>
            <span class="bw-choice__text"><span class="bw-choice__name">${esc(s.name)}</span></span>
          </button>`;
        });
      });
      html += `</div></div>`;
      const node = el(html);
      node.querySelectorAll('[data-svc]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.svc;
        const i = st.services.indexOf(id);
        if (i >= 0) st.services.splice(i, 1); else st.services.push(id);
        this.setError(''); this.render();
      }));
      return node;
    }

    view_qty(step) {
      const mod = step._mod;
      let html = `<div class="bw-step">${this.head(step, step.help ? `<button class="bw-help-link" data-help>${esc(step.help.label)}</button>` : '')}`;
      if (step.included) html += `<div class="bw-included">${step.included}</div>`;
      html += `<div class="bw-options">`;
      step.options.forEach((o) => { html += this.optRow(step, o); });
      html += `</div>`;
      if (step.none) {
        const on = !!this.state.none[step.id];
        html += `<div class="bw-options" style="margin-top:12px">
          <button class="bw-choice ${on ? 'is-active' : ''}" data-none>
            <span class="bw-choice__box">${ICON_CHECK}</span>
            <span class="bw-choice__text"><span class="bw-choice__name">${esc(step.none.name)}</span></span>
          </button></div>`;
      }
      html += `</div>`;
      const node = el(html);
      this.wireQty(node, step);
      if (step.help) node.querySelector('[data-help]').addEventListener('click', () => this.openHelp(step.help));
      const noneBtn = node.querySelector('[data-none]');
      if (noneBtn) noneBtn.addEventListener('click', () => {
        const nv = !this.state.none[step.id];
        this.state.none[step.id] = nv;
        if (nv) step.options.forEach((o) => this.setQ(step.id, o.id, 0));
        this.setError(''); this.render();
      });
      return node;
    }

    optRow(step, o) {
      const val = this.q(step.id, o.id);
      const priceTxt = o.priceHidden ? '' : (o.price === 0 ? 'Included' : '+' + money(o.price));
      return `<div class="bw-opt ${val > 0 ? 'is-active' : ''}" data-opt="${o.id}">
        <div class="bw-opt__text">
          <div class="bw-opt__name">${esc(o.name)}</div>
          ${o.desc ? `<div class="bw-opt__desc">${esc(o.desc)}</div>` : ''}
        </div>
        ${priceTxt ? `<div class="bw-opt__price">${priceTxt}</div>` : ''}
        <div class="bw-stepper">
          <button class="bw-minus" data-dec ${val <= 0 ? 'disabled' : ''}>−</button>
          <span class="bw-stepper__val" data-val>${val}</span>
          <button class="bw-plus" data-inc>+</button>
        </div>
      </div>`;
    }

    wireQty(node, step) {
      node.querySelectorAll('[data-opt]').forEach((row) => {
        const id = row.dataset.opt;
        row.querySelector('[data-inc]').addEventListener('click', () => { this.bump(step, id, +1); this.render(); });
        row.querySelector('[data-dec]').addEventListener('click', () => { this.bump(step, id, -1); this.render(); });
      });
    }

    bump(step, optId, d) {
      const cur = this.q(step.id, optId);
      const next = cur + d;
      if (next < 0) return;
      this.setQ(step.id, optId, next);
      if (next > 0 && step.none) this.state.none[step.id] = false;
      this.setError('');
    }

    view_coverage(step) {
      const st = this.state;
      const cap = this.installedItemCount();
      let html = `<div class="bw-step">${this.head(step)}
        <div class="bw-coverage-card">
          <div class="bw-coverage-hero">
            <div style="font-weight:800;color:var(--bw-red);letter-spacing:.5px">⛨ TV REMOVAL COVERAGE</div>
            <div class="bw-free">100% FREE</div>
            <div style="font-size:13px;color:var(--bw-ink-soft)">We come back to your home anytime, even years from now, and take your item down.</div>
            <div class="bw-coverage-pay">
              <div><span>Pay Today</span><strong>$29</strong></div>
              <div style="align-self:center;color:var(--bw-red);font-size:20px">→</div>
              <div><span>Pay Later</span><strong>$0</strong></div>
            </div>
          </div>
          <div class="bw-coverage-list">
            Like insurance for your installed items — add it to your ticket today, use it whenever the day comes. Professional removal, hardware removed, area left clean, $0 removal charge, no expiration.
          </div>
        </div>
        <div class="bw-options">`;
      COVERAGE_STEP.options.forEach((o) => { html += this.optRow(COVERAGE_STEP, o); });
      html += `</div>
        <div class="bw-options" style="margin-top:12px">
          <button class="bw-choice ${st.none['coverage'] ? 'is-active' : ''}" data-none>
            <span class="bw-choice__box">${ICON_CHECK}</span>
            <span class="bw-choice__text"><span class="bw-choice__name">${esc(COVERAGE_STEP.none.name)}</span></span>
          </button>
        </div></div>`;
      const node = el(html);
      node.querySelectorAll('[data-opt]').forEach((row) => {
        const id = row.dataset.opt;
        row.querySelector('[data-inc]').addEventListener('click', () => {
          if (id === 'today' && this.q('coverage', 'today') >= cap && cap > 0) { this.setError('You can cover up to ' + cap + ' item(s) being installed today.'); return; }
          this.setQ('coverage', id, this.q('coverage', id) + 1); st.none['coverage'] = false; this.setError(''); this.render();
        });
        row.querySelector('[data-dec]').addEventListener('click', () => { this.setQ('coverage', id, Math.max(0, this.q('coverage', id) - 1)); this.render(); });
      });
      node.querySelector('[data-none]').addEventListener('click', () => {
        const nv = !st.none['coverage']; st.none['coverage'] = nv;
        if (nv) { this.setQ('coverage', 'today', 0); this.setQ('coverage', 'other', 0); }
        this.setError(''); this.render();
      });
      return node;
    }

    view_terms(step) {
      const st = this.state;
      const node = el(`<div class="bw-step">${this.head(step)}
        <div class="bw-included" style="max-height:220px;overflow:auto">
          Appointments may be canceled or rescheduled at no charge if you let us know at least <b>24 hours</b> before your appointment. Changes made less than 24 hours before your appointment may be subject to a <b>$25 fee</b>. By continuing, you agree to our Terms of Service.
        </div>
        ${this.cfg.termsUrl ? `<a class="bw-help-link" href="${esc(this.cfg.termsUrl)}" target="_blank" rel="noopener">View Full Terms of Service</a>` : ''}
        <label class="bw-choice ${st.terms ? 'is-active' : ''}" style="margin-top:14px;cursor:pointer" data-agree>
          <span class="bw-choice__box">${ICON_CHECK}</span>
          <span class="bw-choice__text"><span class="bw-choice__name">I agree to the Terms of Service</span></span>
        </label>
      </div>`);
      node.querySelector('[data-agree]').addEventListener('click', () => { st.terms = !st.terms; this.setError(''); this.render(); });
      return node;
    }

    fetchAvailability() {
      if (this._availTried || !this.cfg.apiEndpoint) return;
      this._availTried = true;
      const url = this.cfg.apiEndpoint + (this.cfg.apiEndpoint.includes('?') ? '&' : '?') + 'action=availability';
      const headers = {};
      if (this.cfg.sharedSecret) headers['X-Booking-Secret'] = this.cfg.sharedSecret;
      fetch(url, { headers })
        .then((r) => r.json())
        .then((d) => {
          this.availability = (d && d.availability) || d;
          window.__bwAvailability = this.availability;
          // Refresh the calendar now that real availability is loaded.
          if (this.currentStep() && this.currentStep().kind === 'appointment') this.render();
        })
        .catch((e) => console.warn('[BookingWizard] availability fetch failed', e));
    }

    /* Parse HCP schedule_availability into { buffer, byDay: {weekdayIdx: [{start,end}]} } */
    parseAvailability() {
      const a = this.availability;
      if (!a || !a.daily_availabilities) return null;
      const rows = (a.daily_availabilities.data) || [];
      const byDay = {};
      rows.forEach((d) => {
        const idx = DAY_IDX[String(d.day_name || '').toLowerCase()];
        if (idx == null) return;
        const wins = ((d.schedule_windows || {}).data) || [];
        byDay[idx] = wins.map((w) => ({ start: w.start_time, end: w.end_time }));
      });
      return { buffer: a.availability_buffer_in_days || 0, byDay };
    }

    /* Bookable arrival slots for a given date, generated from HCP windows. */
    slotsForDate(date) {
      const av = this.parseAvailability();
      if (!av) return SLOTS.slice();                 // availability not loaded -> fallback
      const wins = av.byDay[date.getDay()];
      if (!wins || !wins.length) return [];          // day closed
      const slots = [];
      wins.forEach((w) => {
        const s = timeToMin(w.start), e = timeToMin(w.end);
        for (let t = s; t < e; t += SLOT_LEN_MIN) {
          const end = Math.min(t + SLOT_LEN_MIN, e);
          slots.push({ id: minToHHMM(t), start: minToHHMM(t), end: minToHHMM(end), startMin: t,
            label: minToLabel(t) + ' – ' + minToLabel(end), afterHours: t >= AFTER_HOURS_START_MIN });
        }
      });
      return slots;
    }

    view_appointment(step) {
      const st = this.state;
      this.fetchAvailability();
      const av = this.parseAvailability();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const earliest = new Date(today); earliest.setDate(earliest.getDate() + (av ? av.buffer : 0));
      const nowMin = (new Date()).getHours() * 60 + (new Date()).getMinutes();
      if (!this.calMonth) this.calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const node = el(`<div class="bw-step">${this.head(step)}
        <div class="bw-cal" data-cal></div>
        <div data-slots></div>
      </div>`);
      const dayOpen = (date) => !av ? true : !!(av.byDay[date.getDay()] && av.byDay[date.getDay()].length);
      const renderCal = () => {
        const cal = node.querySelector('[data-cal]');
        const y = this.calMonth.getFullYear(), m = this.calMonth.getMonth();
        const first = new Date(y, m, 1).getDay();
        const days = new Date(y, m + 1, 0).getDate();
        const prevDisabled = (y === today.getFullYear() && m <= today.getMonth());
        let g = `<div class="bw-cal__head">
          <button class="bw-cal__nav" data-prev ${prevDisabled ? 'disabled' : ''}>‹</button>
          <strong>${MONTHS[m]} ${y}</strong>
          <button class="bw-cal__nav" data-nextm>›</button></div><div class="bw-cal__grid">`;
        DOW.forEach((d) => g += `<div class="bw-cal__dow">${d}</div>`);
        for (let i = 0; i < first; i++) g += `<div></div>`;
        for (let d = 1; d <= days; d++) {
          const date = new Date(y, m, d);
          const disabled = date < earliest || !dayOpen(date);
          const iso = date.toISOString().slice(0, 10);
          const sel = st.appt.date === iso;
          const isToday = date.getTime() === today.getTime();
          g += `<button class="bw-cal__day ${sel ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}" data-day="${iso}" ${disabled ? 'disabled' : ''}><span>${d}</span></button>`;
        }
        g += `</div>`;
        cal.innerHTML = g;
        cal.querySelector('[data-prev]')?.addEventListener('click', () => { this.calMonth = new Date(y, m - 1, 1); renderCal(); });
        cal.querySelector('[data-nextm]')?.addEventListener('click', () => { this.calMonth = new Date(y, m + 1, 1); renderCal(); });
        cal.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => { st.appt.date = b.dataset.day; st.appt.slot = null; this.setError(''); renderCal(); renderSlots(); }));
      };
      const renderSlots = () => {
        const wrap = node.querySelector('[data-slots]');
        if (!st.appt.date) { wrap.innerHTML = ''; return; }
        const dt = new Date(st.appt.date + 'T00:00:00');
        const isToday = dt.getTime() === today.getTime();
        let slots = this.slotsForDate(dt);
        if (isToday) slots = slots.filter((s) => s.startMin == null || s.startMin > nowMin); // hide passed times
        let g = `<div style="text-align:center;font-weight:700;margin:16px 0 4px">${DOW[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()} — select a time</div>`;
        if (!slots.length) {
          g += `<p class="bw-step__sub">No times available on this day — please pick another date.</p>`;
          wrap.innerHTML = g; return;
        }
        g += `<div class="bw-slots">`;
        slots.forEach((s) => {
          const sel = st.appt.slot === s.id;
          g += `<button class="bw-slot ${sel ? 'is-selected' : ''}" data-slot="${s.id}">${s.label}${s.afterHours ? '<small>+$75 After-Hours Fee</small>' : ''}</button>`;
        });
        g += `</div>`;
        wrap.innerHTML = g;
        wrap.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => {
          const s = slots.find((x) => x.id === b.dataset.slot);
          st.appt.slot = s.id; st.appt.start = s.start; st.appt.end = s.end; st.appt.label = s.label; st.appt.afterHoursSel = !!s.afterHours;
          this.setError(''); renderSlots();
        }));
      };
      renderCal(); renderSlots();
      return node;
    }

    view_customer(step) {
      const st = this.state; const c = st.customer; const cd = st.card;
      if (!c.zip && st.zip) c.zip = st.zip;
      const fe = this.fieldErrors || {};
      const brand = detectBrand((cd.number || '').replace(/\s/g, ''));
      const node = el(`<div class="bw-step">${this.head(step)}
        <div class="bw-card-note">${info()} <div><b>Your card will not be charged at booking.</b> Payment is collected after your service is completed. Your card only holds your appointment.</div></div>
        <div class="bw-grid-2">
          ${field('firstName', 'First name', c.firstName, 'text', fe.firstName)}
          ${field('lastName', 'Last name', c.lastName, 'text', fe.lastName)}
          ${field('email', 'Email address', c.email, 'email', fe.email)}
          ${field('phone', 'Phone number', c.phone, 'tel', fe.phone)}
        </div>
        ${field('address', 'Street address', c.address, 'text', fe.address)}
        <div class="bw-grid-2">
          ${field('apt', 'Apt / Suite (optional)', c.apt)}
          ${field('city', 'City', c.city, 'text', fe.city)}
        </div>
        <div class="bw-grid-2">
          ${stateSelect(c.region, fe.region)}
          ${field('zip', 'ZIP code', c.zip, 'text', fe.zip)}
        </div>

        <div class="bw-group-label" style="margin-top:18px">Card to hold appointment</div>
        <div class="bw-cardbox">
          <div class="bw-cardbox__row bw-cardbox__number ${fe.cardNumber ? 'is-error' : ''}">
            <span class="bw-cardbox__brand" data-brand>${cardBrandSvg(brand)}</span>
            <input class="bw-cardbox__input" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234" data-card="number" value="${esc(cd.number || '')}">
          </div>
          <div class="bw-cardbox__split">
            <div class="bw-cardbox__row ${fe.cardExp ? 'is-error' : ''}">
              <input class="bw-cardbox__input" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" maxlength="7" data-card="exp" value="${esc(cd.exp || '')}">
            </div>
            <div class="bw-cardbox__row ${fe.cardCvc ? 'is-error' : ''}">
              <input class="bw-cardbox__input" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" maxlength="4" data-card="cvc" value="${esc(cd.cvc || '')}">
              <span class="bw-cardbox__cvc">${cvcSvg()}</span>
            </div>
          </div>
        </div>
        <div class="bw-field__err" data-carderr>${esc(fe.cardNumber || fe.cardExp || fe.cardCvc || '')}</div>
        <div class="bw-secure-line">${lock()} Secured &amp; encrypted. We never store your full card number.</div>
      </div>`);

      node.querySelectorAll('[data-field]').forEach((inp) => {
        const handler = (ev) => { c[inp.dataset.field] = ev.target.value; clearFieldErr(inp); this.setError(''); };
        inp.addEventListener('input', handler);
        inp.addEventListener('change', handler);
      });

      const numInp = node.querySelector('[data-card="number"]');
      const expInp = node.querySelector('[data-card="exp"]');
      const cvcInp = node.querySelector('[data-card="cvc"]');
      const brandEl = node.querySelector('[data-brand]');
      const cardErr = node.querySelector('[data-carderr]');

      numInp.addEventListener('input', (ev) => {
        const b = detectBrand(ev.target.value.replace(/\D/g, ''));
        const f = formatCardNumber(ev.target.value, b);
        ev.target.value = f; cd.number = f;
        brandEl.innerHTML = cardBrandSvg(b);
        cvcInp.maxLength = b === 'amex' ? 4 : 3;
        ev.target.closest('.bw-cardbox__row').classList.remove('is-error');
        cardErr.textContent = ''; this.setError('');
      });
      expInp.addEventListener('input', (ev) => {
        const f = formatExpiry(ev.target.value);
        ev.target.value = f; cd.exp = f;
        ev.target.closest('.bw-cardbox__row').classList.remove('is-error');
        cardErr.textContent = ''; this.setError('');
      });
      cvcInp.addEventListener('input', (ev) => {
        const f = ev.target.value.replace(/\D/g, '').slice(0, cvcInp.maxLength);
        ev.target.value = f; cd.cvc = f;
        ev.target.closest('.bw-cardbox__row').classList.remove('is-error');
        cardErr.textContent = ''; this.setError('');
      });
      return node;
    }

    view_quote(step) {
      const st = this.state; const c = st.customer;
      if (!c.zip && st.zip) c.zip = st.zip;
      const svcNames = st.services.map((id) => (this.services.find((s) => s.id === id) || {}).name).filter(Boolean);
      const fe = this.fieldErrors || {};
      const node = el(`<div class="bw-step">${this.head(step)}
        <div class="bw-included"><b>Selected services:</b> ${esc(svcNames.join(', ') || '—')}<br><b>Property:</b> ${esc(st.propertyType || '—')} &nbsp;·&nbsp; <b>ZIP:</b> ${esc(st.zip || '—')}</div>
        <div class="bw-grid-2">
          ${field('firstName', 'First name', c.firstName, 'text', fe.firstName)}
          ${field('lastName', 'Last name', c.lastName, 'text', fe.lastName)}
          ${field('email', 'Email address', c.email, 'email', fe.email)}
          ${field('phone', 'Phone number', c.phone, 'tel', fe.phone)}
        </div>
        ${field('address', 'Service address (optional)', c.address)}
        <div class="bw-field">
          <label>Tell us about your project (optional)</label>
          <textarea class="bw-input" style="height:110px;padding:12px 16px;resize:vertical" data-notes placeholder="Rooms, number of items, timeline, anything else that helps us quote accurately…">${esc(st.quoteNotes)}</textarea>
        </div>
      </div>`);
      node.querySelectorAll('[data-field]').forEach((inp) => inp.addEventListener('input', (e) => { c[inp.dataset.field] = e.target.value; clearFieldErr(inp); this.setError(''); }));
      node.querySelector('[data-notes]').addEventListener('input', (e) => { st.quoteNotes = e.target.value; });
      return node;
    }

    view_quote_review(step) { return this.view_quoteReview(step); }
    view_quoteReview(step) {
      const st = this.state; const c = st.customer;
      const svcNames = st.services.map((id) => (this.services.find((s) => s.id === id) || {}).name).filter(Boolean);
      return el(`<div class="bw-step">${this.head(step)}
        <div class="bw-review-sec">
          <div class="bw-review-sec__h">Request Details</div>
          <div class="bw-line"><span class="bw-line__label">Services</span><span class="bw-line__val" style="white-space:normal;text-align:right">${esc(svcNames.join(', '))}</span></div>
          <div class="bw-line"><span class="bw-line__label">Property</span><span class="bw-line__val">${esc(st.propertyType)}</span></div>
          <div class="bw-line"><span class="bw-line__label">ZIP</span><span class="bw-line__val">${esc(st.zip)}</span></div>
          <div class="bw-line"><span class="bw-line__label">Name</span><span class="bw-line__val">${esc((c.firstName || '') + ' ' + (c.lastName || ''))}</span></div>
          <div class="bw-line"><span class="bw-line__label">Email</span><span class="bw-line__val">${esc(c.email)}</span></div>
          <div class="bw-line"><span class="bw-line__label">Phone</span><span class="bw-line__val">${esc(c.phone)}</span></div>
          ${st.quoteNotes ? `<div class="bw-line"><span class="bw-line__label">Notes</span><span class="bw-line__val" style="white-space:normal;text-align:right">${esc(st.quoteNotes)}</span></div>` : ''}
        </div>
        <p class="bw-step__sub">No card or appointment is needed. Our team will review your request and reach out with a personalized quote.</p>
      </div>`);
    }

    /* ---------- REVIEW & BOOK (only place totals appear) ---------- */
    computeLineItems() {
      const items = [];
      this.activeModules().forEach((mod) => {
        const header = mod.label;
        mod.steps.forEach((step) => {
          if (step.showIfMounted && this.moduleMounted(mod) <= 0) return;
          step.options.forEach((o) => {
            const qn = this.q(step.id, o.id);
            if (qn > 0 && !(o.price === 0 && o.priceHidden)) {
              // include $0 lines that represent a real choice, but skip hidden $0 count rows
              if (o.price === 0 && !o.priceHidden && step.anchorPrimary) return;
              items.push({ group: header, step: step.id, option: o.id, label: o.name, qty: qn, unit: o.price, amount: o.price * qn, product: !!o.product });
            } else if (qn > 0 && o.priceHidden) {
              items.push({ group: header, step: step.id, option: o.id, label: o.name, qty: qn, unit: 0, amount: 0, product: !!o.product });
            }
          });
        });
      });
      // coverage
      const cov = this.q('coverage', 'today') + this.q('coverage', 'other');
      if (cov > 0) items.push({ group: 'Lifetime Removal Coverage', step: 'coverage', option: 'coverage', label: 'Lifetime Removal Coverage', qty: cov, unit: COVERAGE_PRICE, amount: COVERAGE_PRICE * cov });
      return items;
    }

    afterHours() {
      if (this.state.appt.afterHoursSel != null) return !!this.state.appt.afterHoursSel;
      if (this.state.appt.start) return timeToMin(this.state.appt.start) >= AFTER_HOURS_START_MIN;
      const slot = SLOTS.find((s) => s.id === this.state.appt.slot);
      return !!(slot && slot.afterHours);
    }

    tvCount() {
      const mod = this.activeModules().find((m) => m.id === 'tv-mounting');
      return mod ? this.modulePrimary(mod) : 0;
    }

    /* All discounts + product-only tax. Discounts apply to the whole subtotal
       (all items incl. after-hours fee). Tax applies only to physical products. */
    totals() {
      const items = this.computeLineItems();
      const itemsSum = items.reduce((s, i) => s + i.amount, 0);
      const fee = this.afterHours() ? AFTER_HOURS_FEE : 0;
      const base = itemsSum + fee;                       // discount base = everything
      const round2 = (n) => Math.round(n * 100) / 100;

      // ---- discounts ----
      const bookOnline = base > 0 ? Math.min(10, base) : 0;         // −$10 automatic
      const multiTV = this.tvCount() >= 2 ? round2(base * 0.10) : 0; // −10% for 2+ TVs
      const autoTotal = bookOnline + multiTV;
      const community = this.state.community ? round2(base * 0.10) : 0; // −10% opt-in

      let discounts = [];
      if (this.state.community && community >= autoTotal) {
        // Community is exclusive; wins only when it's the greater discount.
        discounts = [{ label: 'Community Appreciation Discount (10%)', amount: community }];
      } else {
        if (bookOnline) discounts.push({ label: 'Book Online Discount', amount: bookOnline });
        if (multiTV) discounts.push({ label: 'Multiple TV Discount (10%)', amount: multiTV });
      }
      let discountTotal = round2(discounts.reduce((s, d) => s + d.amount, 0));
      discountTotal = Math.min(discountTotal, base);

      // ---- tax: products only, on the post-discount product portion ----
      const productSubtotal = items.filter((i) => i.product).reduce((s, i) => s + i.amount, 0);
      const productShare = base > 0 ? productSubtotal / base : 0;
      const productTaxable = Math.max(0, productSubtotal - discountTotal * productShare);
      const tax = round2(productTaxable * (this.cfg.taxRate || 0));

      const total = round2(base - discountTotal + tax);
      return { items, subtotal: base, fee, discounts, discountTotal, productSubtotal, tax, total };
    }

    view_review(step) {
      const st = this.state;
      const t = this.totals();
      const jump = (kind) => { const i = this.steps.findIndex((s) => s.kind === kind); if (i >= 0) { this.index = i; this.render(); } };
      const appt = st.appt;
      const dt = appt.date ? new Date(appt.date + 'T00:00:00') : null;
      const slot = appt.label ? { label: appt.label } : SLOTS.find((s) => s.id === appt.slot);
      const c = st.customer;

      // group items
      const groups = {};
      t.items.forEach((i) => { (groups[i.group] = groups[i.group] || []).push(i); });
      let itemsHtml = '';
      Object.keys(groups).forEach((g) => {
        itemsHtml += `<div class="bw-line" style="background:var(--bw-panel);font-weight:800"><span class="bw-line__label" style="color:var(--bw-ink)">${esc(g)}</span><span class="bw-line__val"></span></div>`;
        groups[g].forEach((i) => {
          itemsHtml += `<div class="bw-line"><span class="bw-line__label">${esc(i.label)}${i.qty > 1 ? ` <small>× ${i.qty}</small>` : ''}</span><span class="bw-line__val">${i.unit === 0 ? 'Included' : money(i.amount)}</span></div>`;
        });
      });

      const node = el(`<div class="bw-step">${this.head(step)}
        <div class="bw-review-sec">
          <div class="bw-review-sec__h">Services & Options <button class="bw-review-sec__edit" data-edit-first>Edit</button></div>
          ${itemsHtml || '<div class="bw-line"><span class="bw-line__label">No items</span></div>'}
        </div>

        <div class="bw-review-sec">
          <div class="bw-review-sec__h">Appointment <button class="bw-review-sec__edit" data-edit-appt>Edit</button></div>
          <div class="bw-line"><span class="bw-line__label">Date</span><span class="bw-line__val">${dt ? DOW[dt.getDay()] + ', ' + MONTHS[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear() : '—'}</span></div>
          <div class="bw-line"><span class="bw-line__label">Time</span><span class="bw-line__val">${slot ? esc(slot.label) : '—'}</span></div>
        </div>

        <div class="bw-review-sec">
          <div class="bw-review-sec__h">Contact & Address <button class="bw-review-sec__edit" data-edit-cust>Edit</button></div>
          <div class="bw-line"><span class="bw-line__label">${esc((c.firstName || '') + ' ' + (c.lastName || ''))}</span><span class="bw-line__val">${esc(c.phone || '')}</span></div>
          <div class="bw-line"><span class="bw-line__label">${esc(c.email || '')}</span><span class="bw-line__val"></span></div>
          <div class="bw-line"><span class="bw-line__label">${esc([c.address, c.apt, c.city, c.region, c.zip].filter(Boolean).join(', '))}</span><span class="bw-line__val"></span></div>
        </div>

        <div class="bw-review-sec">
          <div class="bw-review-sec__h">Discounts &amp; Savings</div>
          <label class="bw-consent" style="padding:14px 16px;cursor:pointer">
            <input type="checkbox" data-community ${st.community ? 'checked' : ''}>
            <span><b>Community Appreciation Discount — 10% off</b><br>
            For active-duty military, veterans, teachers &amp; educators, law enforcement, firefighters, EMTs &amp; paramedics, and local/state/federal government employees.<br>
            <small>Valid employment or agency ID required at time of service. Cannot be combined with other offers.</small></span>
          </label>
        </div>

        <div class="bw-totals">
          <div class="bw-line"><span class="bw-line__label">Subtotal</span><span class="bw-line__val">${money(t.subtotal - t.fee)}</span></div>
          ${t.fee ? `<div class="bw-line"><span class="bw-line__label">After-Hours Fee</span><span class="bw-line__val">${money(t.fee)}</span></div>` : ''}
          ${t.discounts.map((d) => `<div class="bw-line"><span class="bw-line__label" style="color:var(--bw-ok)">${esc(d.label)}</span><span class="bw-line__val" style="color:var(--bw-ok)">−${money(d.amount)}</span></div>`).join('')}
          ${t.tax ? `<div class="bw-line"><span class="bw-line__label">Sales Tax (products)</span><span class="bw-line__val">${money(t.tax)}</span></div>` : ''}
          <div class="bw-line bw-totals__grand"><span class="bw-line__label">Total</span><span class="bw-line__val">${money(t.total)}</span></div>
        </div>

        <div class="bw-card-note" style="margin-top:14px">${info()}<div>Your card will not be charged at booking. Payment is collected after your service is completed.</div></div>

        <label class="bw-consent"><input type="checkbox" data-sms ${st.sms ? 'checked' : ''}><span>I agree to receive appointment and service-related text messages regarding my booking. Message and data rates may apply. Reply STOP to opt out.</span></label>
      </div>`);

      node.querySelector('[data-edit-first]').addEventListener('click', () => { const i = this.steps.findIndex((s) => s.kind === 'qty'); if (i >= 0) { this.index = i; this.render(); } });
      node.querySelector('[data-edit-appt]').addEventListener('click', () => jump('appointment'));
      node.querySelector('[data-edit-cust]').addEventListener('click', () => jump('customer'));
      node.querySelector('[data-sms]').addEventListener('change', (e) => { st.sms = e.target.checked; this.setError(''); });
      node.querySelector('[data-community]').addEventListener('change', (e) => { st.community = e.target.checked; this.render(); });
      return node;
    }

    /* ---------- help / examples modal ---------- */
    openHelp(help) {
      const back = el(`<div class="bw-modal-backdrop"><div class="bw-modal">
        <button class="bw-modal__x" data-x>×</button>
        <h3>${esc(help.title || 'Examples')}</h3>
        ${help.url ? `<iframe src="${esc(help.url)}" style="width:100%;height:50vh;border:0;border-radius:10px"></iframe>` :
          `<p style="color:var(--bw-muted);line-height:1.6">Reference photos and examples for this option will appear here. Upload example images in the theme editor / metaobject to display them.</p>`}
      </div></div>`);
      const close = () => back.remove();
      back.addEventListener('click', (e) => { if (e.target === back) close(); });
      back.querySelector('[data-x]').addEventListener('click', close);
      document.body.appendChild(back);
    }

    /* ============================================================
     * SUBMIT
     * ============================================================ */
    buildPayload(isQuote) {
      const st = this.state;
      const base = {
        type: isQuote ? (st.mode === 'commercial' ? 'commercial_quote' : 'residential_quote') : 'instant_booking',
        submittedAt: new Date().toISOString(),
        idempotencyKey: this._idem || (this._idem = 'bw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)),
        zip: st.zip,
        propertyType: st.propertyType,
        services: st.services.map((id) => { const s = this.services.find((x) => x.id === id) || {}; return { id, name: s.name }; }),
        customer: {
          firstName: st.customer.firstName, lastName: st.customer.lastName,
          email: st.customer.email, phone: st.customer.phone,
          address: st.customer.address, apt: st.customer.apt,
          city: st.customer.city, region: st.customer.region, zip: st.customer.zip || st.zip
        }
      };
      if (isQuote) { base.notes = st.quoteNotes; return base; }

      const t = this.totals();
      base.lineItems = t.items; // each carries step/option/product for server re-pricing & tax
      base.communityDiscount = st.community;
      base.pricing = { subtotal: t.subtotal, afterHoursFee: t.fee, discounts: t.discounts, discountTotal: t.discountTotal, tax: t.tax, taxRate: this.cfg.taxRate || 0, total: t.total };
      base.appointment = { date: st.appt.date, slot: st.appt.slot, start: st.appt.start, end: st.appt.end, label: st.appt.label, afterHours: this.afterHours() };
      base.consent = { terms: st.terms, sms: st.sms };
      // NOTE: the raw card number and CVC are intentionally NEVER included.
      // Only non-sensitive metadata (brand, last 4, expiry) goes to the server,
      // which is PCI-safe. A processor token from a secure-field integration
      // (Stripe Elements etc.) is attached here when available.
      const cardNum = (st.card.number || '').replace(/\D/g, '');
      base.card = cardNum ? { brand: detectBrand(cardNum), last4: cardNum.slice(-4), exp: st.card.exp || '' } : null;
      base.paymentToken = (window.BookingWizardCardToken && window.BookingWizardCardToken()) || null;
      return base;
    }

    async submit(isQuote) {
      if (this.submitting) return;
      this.submitting = true;
      const nextBtn = this.$foot.querySelector('[data-next]');
      if (nextBtn) { nextBtn.disabled = true; nextBtn.querySelector('.bw-next-label').textContent = 'Submitting'; nextBtn.insertAdjacentHTML('beforeend', ' <span class="bw-spinner"></span>'); }

      const payload = this.buildPayload(isQuote);
      let ok = false, resp = null;
      try {
        if (this.cfg.apiEndpoint) {
          const headers = { 'Content-Type': 'application/json' };
          if (this.cfg.sharedSecret) headers['X-Booking-Secret'] = this.cfg.sharedSecret;
          const r = await fetch(this.cfg.apiEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
          });
          ok = r.ok;
          try { resp = await r.json(); } catch (e) { resp = null; }
          if (!ok) console.error('[BookingWizard] server responded', r.status, resp);
        } else {
          // no endpoint configured (preview mode) — treat as success for demo
          console.warn('[BookingWizard] No apiEndpoint configured; payload:', payload);
          ok = true;
        }
      } catch (e) {
        console.error('[BookingWizard] submit failed', e);
        ok = false;
      }

      this.submitting = false;
      if (ok) { this.showDone(isQuote, resp); }
      else {
        if (nextBtn) { nextBtn.disabled = false; nextBtn.querySelector('.bw-next-label').textContent = isQuote ? 'Submit Request' : 'Complete My Booking'; nextBtn.querySelector('.bw-spinner')?.remove(); }
        this.setError('Something went wrong submitting your ' + (isQuote ? 'request' : 'booking') + '. Please try again — you won’t be charged and no duplicate will be created.');
      }
    }

    showDone(isQuote, resp) {
      this.$progress.style.display = 'none';
      this.$foot.innerHTML = '';
      const ref = (resp && (resp.reference || resp.id)) ? String(resp.reference || resp.id) : '';
      this.$body.innerHTML = `<div class="bw-done">
        <div class="bw-done__check"><svg width="34" height="26" viewBox="0 0 14 12" fill="none"><path d="M12.5 1.5 4.7 9.8 1.5 6.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h2>${isQuote ? 'Request received!' : 'Booking confirmed!'}</h2>
        <p>${isQuote
          ? 'Thanks! Our team will review your project and reach out shortly with your personalized quote.'
          : 'Your appointment is booked. We’ve sent a confirmation to your email. Remember — your card only holds the appointment and won’t be charged until your service is complete.'}</p>
        ${ref ? `<p><b>Reference:</b> ${esc(ref)}</p>` : ''}
        ${this.cfg.phone ? `<p>Questions? Call or text us at <b>${esc(this.cfg.phone)}</b>.</p>` : ''}
      </div>`;
    }
  }

  /* ---------- inline icons ---------- */
  function dot() { return '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M6 10.2 8.7 13 14 7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
  function info() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'; }
  function lock() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.8"/></svg>'; }
  function shield() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'; }
  function medal() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="5"/><path d="M8.5 12 7 22l5-3 5 3-1.5-10"/></svg>'; }
  function bolt() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>'; }
  function star() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9L6.4 20l1.1-6.2L3 9.4l6.2-.9L12 2.8z"/></svg>'; }
  function trophy() { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/></svg>'; }
  function field(id, label, val, type, err) {
    return `<div class="bw-field">
      <label>${esc(label)}</label>
      <input class="bw-input ${err ? 'bw-input--error' : ''}" type="${type || 'text'}" data-field="${id}" value="${esc(val || '')}" autocomplete="off">
      <div class="bw-field__err">${esc(err || '')}</div>
    </div>`;
  }
  function clearFieldErr(inp) {
    inp.classList.remove('bw-input--error');
    const e = inp.parentElement && inp.parentElement.querySelector('.bw-field__err');
    if (e) e.textContent = '';
  }

  const US_STATES = [
    ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],
    ['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],
    ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],
    ['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
    ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],
    ['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
    ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],
    ['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],
    ['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']
  ];
  function stateSelect(val, err) {
    const opts = US_STATES.map(([code, name]) => `<option value="${code}" ${val === code ? 'selected' : ''}>${code} — ${name}</option>`).join('');
    return `<div class="bw-field">
      <label>State</label>
      <select class="bw-input ${err ? 'bw-input--error' : ''}" data-field="region">
        <option value="" ${!val ? 'selected' : ''} disabled>Select state</option>
        ${opts}
      </select>
      <div class="bw-field__err">${esc(err || '')}</div>
    </div>`;
  }

  /* ---------- card formatting & validation (client-side UX only) ---------- */
  function detectBrand(num) {
    if (/^4/.test(num)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(num)) return 'mastercard';
    if (/^3[47]/.test(num)) return 'amex';
    if (/^(6011|65|64[4-9]|622)/.test(num)) return 'discover';
    return '';
  }
  function formatCardNumber(v, brand) {
    let d = v.replace(/\D/g, '');
    d = d.slice(0, brand === 'amex' ? 15 : 16);
    if (brand === 'amex') return d.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' '));
    return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }
  function formatExpiry(v) {
    let d = v.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 1 && +d[0] > 1) d = '0' + d;      // 3 -> 03
    if (d.length >= 3) return d.slice(0, 2) + ' / ' + d.slice(2);
    return d;
  }
  function validExpiry(v) {
    const m = v.replace(/\D/g, '');
    if (m.length !== 4) return false;
    const mm = +m.slice(0, 2), yy = +m.slice(2);
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const curYY = now.getFullYear() % 100, curMM = now.getMonth() + 1;
    return yy > curYY || (yy === curYY && mm >= curMM);
  }
  function luhn(num) {
    if (!/^\d+$/.test(num)) return false;
    let sum = 0, alt = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = +num[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }
  function cardBrandSvg(brand) {
    const labels = { visa: 'VISA', mastercard: 'MC', amex: 'AMEX', discover: 'DISC' };
    const colors = { visa: '#1A1F71', mastercard: '#EB001B', amex: '#2E77BC', discover: '#F27712' };
    if (labels[brand]) return `<span class="bw-brandpill" style="background:${colors[brand]}">${labels[brand]}</span>`;
    return '<svg width="24" height="16" viewBox="0 0 24 16" fill="none"><rect x=".5" y=".5" width="23" height="15" rx="2.5" stroke="#C9CBD3"/><path d="M1 5h22" stroke="#C9CBD3"/></svg>';
  }
  function cvcSvg() { return '<svg width="26" height="16" viewBox="0 0 26 16" fill="none"><rect x=".5" y=".5" width="25" height="15" rx="2.5" stroke="#C9CBD3"/><rect x="16" y="6" width="6" height="3" rx="1.5" fill="#C9CBD3"/></svg>'; }

  /* ---------- boot ---------- */
  function boot() {
    document.querySelectorAll('[data-booking-wizard]').forEach((root) => {
      if (root.__bw) return;
      let cfg = {};
      const cfgEl = root.querySelector('[data-booking-config]') || document.getElementById(root.getAttribute('data-config-id') || '');
      if (cfgEl) { try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { console.error('[BookingWizard] bad config JSON', e); } }
      root.__bw = new BookingWizard(root, cfg);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('shopify:section:load', boot);

  window.BookingWizard = BookingWizard;
})();
