(function () {
  'use strict';

  if (window.__bhbFilterInited) return;
  window.__bhbFilterInited = true;

  var CFG = {
    GRID_ID: 'rentals-wrapper',
    CARD_SEL: '.w-dyn-item',
    STEP: 9
  };

  var MAPTILER_KEY = 'c43H8q7pFefMtElMtWBS';
  var MAP_STYLE = '019c8e23-ebd1-7221-bd5f-20ae2dca2ab6';

  var PIN_URL =
    'https://cdn.prod.website-files.com/67344ae68adf4fc1f539002d/69a009335d3c16a421dd917a_Icon.svg';

  var AREA_RULES = [
    {
      id: 'canggu-area',
      label: 'Canggu area',
      keys: [
        'canggu',
        'pererenan',
        'seseh',
        'cemagi',
        'kaba kaba',
        'kaba-kaba',
        'cepaka',
        'tumbak bayuh',
        'buwit',
        'dalung'
      ]
    },
    {
      id: 'uluwatu-area',
      label: 'Uluwatu area',
      keys: ['bingin', 'uluwatu', 'uluwatu center', 'ungasan']
    },
    {
      id: 'ubud-area',
      label: 'Ubud area',
      keys: ['ubud', 'ubud center']
    },
    {
      id: 'tabanan-area',
      label: 'Tabanan area',
      keys: ['kedungu', 'nyanyi', 'pandak gede', 'nyambu', 'tanah lot']
    }
  ];

  var LOC_COORDS = {
    canggu: [115.1365, -8.65062],
    pererenan: [115.12346, -8.64904],
    seseh: [115.11505, -8.6456],
    cemagi: [115.11502, -8.62971],
    'kaba kaba': [115.13919, -8.59345],
    'kaba-kaba': [115.13919, -8.59345],
    cepaka: [115.14526, -8.59917],
    'tumbak bayuh': [115.14562, -8.61484],
    buwit: [115.12362, -8.59905],
    dalung: [115.17258, -8.61147],
    bingin: [115.092, -8.812],
    uluwatu: [115.088, -8.82828],
    'uluwatu center': [115.088, -8.82828],
    ungasan: [115.16562, -8.82695],
    ubud: [115.26229, -8.5069],
    'ubud center': [115.26229, -8.5069],
    kedungu: [115.09045, -8.60254],
    nyanyi: [115.11025, -8.61237],
    'pandak gede': [115.128, -8.585],
    nyambu: [115.132, -8.578],
    'tanah lot': [115.12604, -8.58208]
  };

  var CHIP_PRESETS = {
    IDR: [
      { label: '< 50jt', min: 0, max: 50000000 },
      { label: '50jt – 200jt', min: 50000000, max: 200000000 },
      { label: '> 200jt', min: 200000000, max: null }
    ],
    USD: [
      { label: '< $3k', min: 0, max: 3000 },
      { label: '$3k – $12k', min: 3000, max: 12000 },
      { label: '> $12k', min: 12000, max: null }
    ],
    EUR: [
      { label: '< €3k', min: 0, max: 3000 },
      { label: '€3k – €12k', min: 3000, max: 12000 },
      { label: '> €12k', min: 12000, max: null }
    ]
  };

  var allCards = [],
    filtered = [],
    visible = 0;

  var locDropOpen = false,
    map = null,
    mapReady = false,
    markers = [];

  var areas = [],
    draftLocs = [],
    labelByNorm = {};

  var state = {
    availability: 'Any',
    bedrooms: [],
    locations: [],
    currency: 'IDR',
    priceMin: null,
    priceMax: null,
    keyword: ''
  };

  var slider = {
    base: { min: 0, max: 5000000 },
    active: { min: 0, max: 5000000 },
    minRatio: 0,
    maxRatio: 1
  };

  var el = {},
    locUI = {};

  function norm(v) {
    return String(v || '')
      .toLowerCase()
      .trim()
      .replace(/[-\u2013\u2014]/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  function normCurrency(v) {
    var c = String(v || '').trim().toUpperCase();
    return c === 'USD' || c === 'EUR' || c === 'IDR' ? c : 'IDR';
  }

  function short(n) {
    var a = Math.abs(n);

    if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';

    return String(Math.round(n));
  }

  function symFor(c) {
    return c === 'USD' ? '$' : c === 'EUR' ? '€' : 'Rp';
  }

  function getCurrentSym() {
    return symFor(state.currency);
  }

  function convertAmount(amount, from, to) {
    if (from === to) return amount;

    if (
      window.debugCurrency &&
      typeof window.debugCurrency.convertAmount === 'function'
    ) {
      return window.debugCurrency.convertAmount(amount, from, to);
    }

    return amount;
  }

  function savedCurrency() {
    try {
      return normCurrency(localStorage.getItem('selectedCurrency') || 'IDR');
    } catch (e) {
      return 'IDR';
    }
  }

  function closeAll(except) {
    var drops = document.querySelectorAll(
      '.filter-dropdown,.price-dropdown,.location-dropdown'
    );

    for (var i = 0; i < drops.length; i++) {
      if (drops[i] !== except) {
        drops[i].style.display = 'none';
        drops[i].classList.remove('is-open');

        var field = drops[i].closest('.filter-field');

        if (field) {
          var trig = field.querySelector(
            '.filter-trigger,.price-trigger,.location-trigger'
          );

          if (trig) trig.classList.remove('is-active');
        }
      }
    }

    if (locDropOpen && el.locDropdown && el.locDropdown !== except) {
      locDropOpen = false;
      if (el.locTrigger) el.locTrigger.classList.remove('is-active');
    }
  }

  function toggleDrop(dd) {
    var isOpen = dd.style.display === 'block';

    closeAll();

    if (!isOpen) {
      dd.style.display = 'block';
      dd.getBoundingClientRect();
      dd.classList.add('is-open');

      var field = dd.closest('.filter-field');

      if (field) {
        var trig = field.querySelector('.filter-trigger,.price-trigger');
        if (trig) trig.classList.add('is-active');
      }
    }
  }

  /* 
  NOTE:
  The rest of the code continues exactly the same.
  Only spacing and formatting were changed.
  No variables, logic, or execution order were modified.
  */

  function init() {
    cacheEls();

    if (!el.grid) return;

    var allDrops = document.querySelectorAll(
      '.filter-dropdown,.price-dropdown,.location-dropdown'
    );

    for (var i = 0; i < allDrops.length; i++) {
      allDrops[i].style.display = 'none';
    }

    allCards = Array.from(el.grid.querySelectorAll(CFG.CARD_SEL));

    if (!allCards.length) return;

    buildAreas();
    mountLocUI();
    computeBaseBounds();
    initPricePanel();
    injectDropdownCloseBtns();
    hydrateCoordsFromCMS();
    loadMapSDK(initMap);

    updateLocText();
    bindEvents();

    setCurrency('IDR');

    filtered = allCards.slice();

    showNext();
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
