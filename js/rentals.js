(function () {
  if (window.__bhbRentalsFilterInit) return;
  window.__bhbRentalsFilterInit = true;

  // ─── CURRENCY CONFIG ────────────────────────────────────────────────────────
  const CURRENCY = {
    IDR: {
      symbol: "Rp",
      min: 0,
      max: 50000000,
      step: 500000,
      chips: [
        { label: "< Rp3jt",        max: 3000000,  min: 0        },
        { label: "Rp3jt – Rp10jt", min: 3000000,  max: 10000000 },
        { label: "> Rp10jt",       min: 10000000, max: 50000000 },
      ],
      format: (v) => "Rp" + (v >= 1000000 ? (v / 1000000).toFixed(1).replace(/\.0$/, "") + "jt" : v.toLocaleString()),
    },
    USD: {
      symbol: "$",
      min: 0,
      max: 5000,
      step: 50,
      chips: [
        { label: "< $250",       max: 250,  min: 0    },
        { label: "$250 – $600",  min: 250,  max: 600  },
        { label: "> $600",       min: 600,  max: 5000 },
      ],
      format: (v) => "$" + v.toLocaleString(),
    },
    EUR: {
      symbol: "€",
      min: 0,
      max: 5000,
      step: 50,
      chips: [
        { label: "< €250",       max: 250,  min: 0    },
        { label: "€250 – €600",  min: 250,  max: 600  },
        { label: "> €600",       min: 600,  max: 5000 },
      ],
      format: (v) => "€" + v.toLocaleString(),
    },
  };

  // ─── AREA / LOCATION CONFIG ──────────────────────────────────────────────────
  const AREAS = {
    "Canggu": ["canggu", "pererenan", "seseh", "cemagi", "kaba kaba", "cepaka", "tumbak bayuh", "buwit", "dalung"],
    "Uluwatu": ["bingin", "uluwatu", "uluwatu center", "ungasan"],
    "Ubud": ["ubud", "ubud center"],
    "Tabanan": ["kedungu", "nyanyi", "pandak gede", "nyambu", "tanah lot"],
  };

  // ─── STATE ───────────────────────────────────────────────────────────────────
  let state = {
    bedrooms: "Any",
    availability: "Any",
    keyword: "",
    currency: "IDR",
    priceMin: 0,
    priceMax: CURRENCY.IDR.max,
    selectedLocations: [],   // array of lowercase village names
    page: 1,
    pageSize: 9,
  };

  let mapInstance = null;
  let mapMarkers = [];

  // ─── DOM REFS ────────────────────────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  function closeAllDropdowns(except) {
    $$(".filter-dropdown, .location-dropdown, .price-dropdown").forEach((d) => {
      if (d !== except) d.classList.remove("is-open");
    });
    $$(".filter-trigger, .location-trigger, .price-trigger").forEach((t) => {
      const dropdown = t.closest(".filter-field")
        ? t.closest(".filter-field").querySelector(".filter-dropdown, .location-dropdown")
        : null;
      if (dropdown && dropdown !== except) t.classList.remove("is-active");
    });
  }

  function toggleDropdown(trigger, dropdown) {
    const isOpen = dropdown.classList.contains("is-open");
    closeAllDropdowns(isOpen ? null : dropdown);
    dropdown.classList.toggle("is-open", !isOpen);
    trigger.classList.toggle("is-active", !isOpen);
  }

  // ─── BEDROOMS FILTER ─────────────────────────────────────────────────────────
  function initBedrooms() {
    const fields = $$(".filter-field");
    const bedField = fields.find((f) => f.querySelector(".filter-label")?.textContent.trim().startsWith("Bed"));
    if (!bedField) return;

    const trigger = $(".filter-trigger", bedField);
    const dropdown = $(".filter-dropdown", bedField);
    const triggerText = $(".filter-trigger_text", trigger);

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown(trigger, dropdown);
    });

    $$(".filter-option", dropdown).forEach((opt) => {
      opt.addEventListener("click", () => {
        state.bedrooms = opt.dataset.value;
        triggerText.textContent = opt.dataset.value === "Any" ? "Any" : opt.dataset.value + " Br";
        $$(".filter-option", dropdown).forEach((o) => o.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        dropdown.classList.remove("is-open");
        trigger.classList.remove("is-active");
      });
    });
  }

  // ─── AVAILABILITY FILTER ──────────────────────────────────────────────────────
  function initAvailability() {
    const fields = $$(".filter-field");
    const avField = fields.find((f) => f.querySelector(".filter-label")?.textContent.trim().startsWith("Avail"));
    if (!avField) return;

    const trigger = $(".filter-trigger", avField);
    const dropdown = $(".filter-dropdown", avField);
    const triggerText = $(".filter-trigger_text", trigger);

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown(trigger, dropdown);
    });

    $$(".filter-option", dropdown).forEach((opt) => {
      opt.addEventListener("click", () => {
        state.availability = opt.dataset.value;
        triggerText.textContent = opt.dataset.value;
        $$(".filter-option", dropdown).forEach((o) => o.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        dropdown.classList.remove("is-open");
        trigger.classList.remove("is-active");
      });
    });
  }

  // ─── KEYWORD FILTER ───────────────────────────────────────────────────────────
  function initKeyword() {
    const input = $(".keyword-input");
    if (!input) return;
    input.addEventListener("input", (e) => {
      state.keyword = e.target.value.trim().toLowerCase();
    });
    const form = input.closest("form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        applyFilters();
      });
    }
  }

  // ─── CURRENCY FILTER ─────────────────────────────────────────────────────────
  function initCurrency() {
    const fields = $$(".filter-field");
    const curField = fields.find((f) => f.querySelector(".filter-label")?.textContent.trim().startsWith("Currency"));
    if (!curField) return;

    const trigger = $(".filter-trigger", curField);
    const dropdown = $(".filter-dropdown", curField);
    const triggerText = $(".filter-trigger_text", trigger);

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown(trigger, dropdown);
    });

    $$(".filter-option", dropdown).forEach((opt) => {
      opt.addEventListener("click", () => {
        state.currency = opt.dataset.value;
        triggerText.textContent = opt.dataset.value;
        $$(".filter-option", dropdown).forEach((o) => o.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        dropdown.classList.remove("is-open");
        trigger.classList.remove("is-active");
        resetPriceSliderForCurrency();
        updateChipLabels();
      });
    });

    // Mark IDR as default selected
    const idrOpt = $$(".filter-option", dropdown).find((o) => o.dataset.value === "IDR");
    if (idrOpt) idrOpt.classList.add("is-selected");
  }

  // ─── PRICE FILTER ────────────────────────────────────────────────────────────
  function initPrice() {
    const priceWrapper = $(".price-trigger-wrapper");
    if (!priceWrapper) return;

    const trigger = $(".price-trigger", priceWrapper);
    const dropdown = priceWrapper.closest(".filter-field")?.querySelector(".price-dropdown");
    if (!trigger || !dropdown) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("is-open");
      closeAllDropdowns(isOpen ? null : dropdown);
      dropdown.classList.toggle("is-open", !isOpen);
      trigger.classList.toggle("is-active", !isOpen);
    });

    initPriceSlider();
    initPriceChips();
  }

  function initPriceSlider() {
    const pwMin = $("#pwMin");
    const pwMax = $("#pwMax");
    if (!pwMin || !pwMax) return;

    const cfg = CURRENCY[state.currency];
    pwMin.min = cfg.min;
    pwMin.max = cfg.max;
    pwMin.step = cfg.step;
    pwMin.value = cfg.min;
    pwMax.min = cfg.min;
    pwMax.max = cfg.max;
    pwMax.step = cfg.step;
    pwMax.value = cfg.max;

    state.priceMin = cfg.min;
    state.priceMax = cfg.max;

    updateSliderUI();

    pwMin.addEventListener("input", () => {
      const minVal = parseInt(pwMin.value);
      const maxVal = parseInt(pwMax.value);
      if (minVal >= maxVal) pwMin.value = maxVal - parseInt(pwMin.step);
      state.priceMin = parseInt(pwMin.value);
      updateSliderUI();
    });

    pwMax.addEventListener("input", () => {
      const minVal = parseInt(pwMin.value);
      const maxVal = parseInt(pwMax.value);
      if (maxVal <= minVal) pwMax.value = minVal + parseInt(pwMax.step);
      state.priceMax = parseInt(pwMax.value);
      updateSliderUI();
    });
  }

  function updateSliderUI() {
    const pwMin = $("#pwMin");
    const pwMax = $("#pwMax");
    const fill = $("#pwFill");
    const minText = $("#pwMinText");
    const maxText = $("#pwMaxText");
    const rangeText = $("#pwRangeText");
    const scaleMin = $("#pwScaleMin");
    const scaleMax = $("#pwScaleMax");
    const symMin = $("#pwSymbolMin");
    const symMax = $("#pwSymbolMax");

    if (!pwMin || !pwMax) return;

    const cfg = CURRENCY[state.currency];
    const min = parseInt(pwMin.value);
    const max = parseInt(pwMax.value);
    const range = cfg.max - cfg.min;
    const leftPct = ((min - cfg.min) / range) * 100;
    const rightPct = ((max - cfg.min) / range) * 100;

    if (fill) {
      fill.style.left = leftPct + "%";
      fill.style.width = (rightPct - leftPct) + "%";
    }

    if (minText) minText.textContent = cfg.format(min).replace(cfg.symbol, "");
    if (maxText) maxText.textContent = cfg.format(max).replace(cfg.symbol, "");
    if (rangeText) rangeText.textContent = cfg.format(min) + " – " + cfg.format(max);
    if (scaleMin) scaleMin.textContent = cfg.format(cfg.min);
    if (scaleMax) scaleMax.textContent = cfg.format(cfg.max);
    if (symMin) symMin.textContent = cfg.symbol;
    if (symMax) symMax.textContent = cfg.symbol;
  }

  function resetPriceSliderForCurrency() {
    const cfg = CURRENCY[state.currency];
    const pwMin = $("#pwMin");
    const pwMax = $("#pwMax");
    if (!pwMin || !pwMax) return;

    pwMin.min = cfg.min;    pwMin.max = cfg.max;    pwMin.step = cfg.step;    pwMin.value = cfg.min;
    pwMax.min = cfg.min;    pwMax.max = cfg.max;    pwMax.step = cfg.step;    pwMax.value = cfg.max;

    state.priceMin = cfg.min;
    state.priceMax = cfg.max;
    updateSliderUI();
  }

  function initPriceChips() {
    $$(".pw-chip").forEach((chip, i) => {
      chip.addEventListener("click", () => {
        const cfg = CURRENCY[state.currency];
        const preset = cfg.chips[i];
        if (!preset) return;

        const pwMin = $("#pwMin");
        const pwMax = $("#pwMax");
        if (!pwMin || !pwMax) return;

        pwMin.value = preset.min ?? cfg.min;
        pwMax.value = preset.max ?? cfg.max;
        state.priceMin = parseInt(pwMin.value);
        state.priceMax = parseInt(pwMax.value);

        $$(".pw-chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        updateSliderUI();
      });
    });
  }

  function updateChipLabels() {
    const cfg = CURRENCY[state.currency];
    $$(".pw-chip").forEach((chip, i) => {
      const textNode = $(".text-node", chip);
      if (textNode && cfg.chips[i]) textNode.textContent = cfg.chips[i].label;
    });
  }

  // ─── LOCATION FILTER ─────────────────────────────────────────────────────────
  function initLocation() {
    const locField = $$(".filter-field").find((f) => f.querySelector(".location-trigger"));
    if (!locField) return;

    const trigger = $(".location-trigger", locField);
    const dropdown = $(".location-dropdown", locField);
    const triggerText = $(".location-trigger_text", trigger);

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("is-open");
      closeAllDropdowns(isOpen ? null : dropdown);
      dropdown.classList.toggle("is-open", !isOpen);
      trigger.classList.toggle("is-active", !isOpen);
      if (!isOpen) {
        initMap();
        renderLocationTree();
      }
    });

    // Replace .location-search-input div with real input
    const searchDiv = $(".location-search-input", dropdown);
    if (searchDiv) {
      const realInput = document.createElement("input");
      realInput.type = "text";
      realInput.placeholder = "Search...";
      realInput.className = "location-search-input";
      realInput.style.cssText = "border:none;outline:none;background:transparent;width:100%;font-size:14px;";
      searchDiv.replaceWith(realInput);

      realInput.addEventListener("input", () => {
        renderLocationTree(realInput.value.trim().toLowerCase());
      });
    }

    // Clear button
    const clearBtn = $(".loc-btn-clear-inline", dropdown);
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        state.selectedLocations = [];
        renderLocationTree();
        renderLocationPills();
        updateLocationTriggerText(triggerText);
        updateMapMarkers();
      });
    }

    // Apply button
    const applyBtn = $(".loc-btn-apply-inline", dropdown);
    if (applyBtn) {
      applyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        dropdown.classList.remove("is-open");
        trigger.classList.remove("is-active");
        applyFilters();
      });
    }

    renderLocationTree();
    renderLocationPills();
  }

  function renderLocationTree(filter = "") {
    const treeScroll = $(".tree-scroll");
    if (!treeScroll) return;
    treeScroll.innerHTML = "";

    Object.entries(AREAS).forEach(([area, villages]) => {
      const filtered = filter
        ? villages.filter((v) => v.includes(filter) || area.toLowerCase().includes(filter))
        : villages;
      if (!filtered.length) return;

      const areaEl = document.createElement("div");
      areaEl.className = "tree-area";

      const areaLabel = document.createElement("div");
      areaLabel.className = "tree-area-label";
      const allSelected = filtered.every((v) => state.selectedLocations.includes(v));

      areaLabel.innerHTML = `
        <div class="tree-checkbox ${allSelected ? "is-checked" : ""}"></div>
        <span>${area}</span>
      `;
      areaLabel.addEventListener("click", () => {
        if (allSelected) {
          state.selectedLocations = state.selectedLocations.filter((l) => !filtered.includes(l));
        } else {
          filtered.forEach((v) => { if (!state.selectedLocations.includes(v)) state.selectedLocations.push(v); });
        }
        renderLocationTree(filter);
        renderLocationPills();
        updateLocationTriggerText($(".location-trigger_text"));
        updateMapMarkers();
      });
      areaEl.appendChild(areaLabel);

      filtered.forEach((village) => {
        const vEl = document.createElement("div");
        vEl.className = "tree-village";
        const isSelected = state.selectedLocations.includes(village);
        vEl.innerHTML = `
          <div class="tree-checkbox ${isSelected ? "is-checked" : ""}"></div>
          <span>${village.charAt(0).toUpperCase() + village.slice(1)}</span>
        `;
        vEl.addEventListener("click", () => {
          if (isSelected) {
            state.selectedLocations = state.selectedLocations.filter((l) => l !== village);
          } else {
            state.selectedLocations.push(village);
          }
          renderLocationTree(filter);
          renderLocationPills();
          updateLocationTriggerText($(".location-trigger_text"));
          updateMapMarkers();
        });
        areaEl.appendChild(vEl);
      });

      treeScroll.appendChild(areaEl);
    });
  }

  function renderLocationPills() {
    const pillScroll = $(".pill-scroll");
    if (!pillScroll) return;
    pillScroll.innerHTML = "";

    state.selectedLocations.forEach((loc) => {
      const pill = document.createElement("div");
      pill.className = "loc-pill";
      pill.innerHTML = `<span>${loc.charAt(0).toUpperCase() + loc.slice(1)}</span><span class="pill-remove">×</span>`;
      pill.querySelector(".pill-remove").addEventListener("click", () => {
        state.selectedLocations = state.selectedLocations.filter((l) => l !== loc);
        renderLocationTree();
        renderLocationPills();
        updateLocationTriggerText($(".location-trigger_text"));
        updateMapMarkers();
      });
      pillScroll.appendChild(pill);
    });

    const info = $(".loc-selected-info");
    if (info) {
      info.textContent = state.selectedLocations.length
        ? state.selectedLocations.length + " location(s) selected"
        : "No Location Selected";
    }
  }

  function updateLocationTriggerText(triggerText) {
    if (!triggerText) return;
    triggerText.textContent = state.selectedLocations.length
      ? state.selectedLocations.length + " selected"
      : "All Location";
  }

  // ─── MAP ─────────────────────────────────────────────────────────────────────
  const MAP_CENTER = [-8.65, 115.22];
  const VILLAGE_COORDS = {
    "canggu":        [115.1333, -8.6478],
    "pererenan":     [115.1150, -8.6380],
    "seseh":         [115.1050, -8.6200],
    "cemagi":        [115.1000, -8.6300],
    "kaba kaba":     [115.0800, -8.5900],
    "cepaka":        [115.0900, -8.6100],
    "tumbak bayuh":  [115.0700, -8.5700],
    "buwit":         [115.0850, -8.6000],
    "dalung":        [115.1500, -8.6200],
    "bingin":        [115.1200, -8.8100],
    "uluwatu":       [115.0850, -8.8290],
    "uluwatu center":[115.0900, -8.8250],
    "ungasan":       [115.1650, -8.8050],
    "ubud":          [115.2624, -8.5069],
    "ubud center":   [115.2650, -8.5100],
    "kedungu":       [115.0600, -8.5600],
    "nyanyi":        [115.0750, -8.5800],
    "pandak gede":   [115.0500, -8.5400],
    "nyambu":        [115.0550, -8.5500],
    "tanah lot":     [115.0867, -8.6210],
  };

  function initMap() {
    if (mapInstance) return;
    const mapContainer = document.getElementById("bhbMap");
    if (!mapContainer || typeof maptilersdk === "undefined") {
      // Load MapTiler SDK if not present
      if (typeof maptilersdk === "undefined") {
        const script = document.createElement("script");
        script.src = "https://cdn.maptiler.com/maptiler-sdk-js/v2/maptiler-sdk.umd.min.js";
        script.onload = () => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://cdn.maptiler.com/maptiler-sdk-js/v2/maptiler-sdk.css";
          document.head.appendChild(link);
          buildMap();
        };
        document.head.appendChild(script);
      }
      return;
    }
    buildMap();
  }

  function buildMap() {
    const mapContainer = document.getElementById("bhbMap");
    if (!mapContainer || !window.maptilersdk) return;
    maptilersdk.config.apiKey = "c43H8q7pFefMtElMtWBS";
    mapInstance = new maptilersdk.Map({
      container: "bhbMap",
      style: "019c8e23-ebd1-7221-bd5f-20ae2dca2ab6",
      center: MAP_CENTER,
      zoom: 10,
    });
    mapInstance.on("load", updateMapMarkers);
  }

  function updateMapMarkers() {
    if (!mapInstance) return;
    mapMarkers.forEach((m) => m.remove());
    mapMarkers = [];

    const targets = state.selectedLocations.length
      ? state.selectedLocations
      : Object.values(AREAS).flat();

    targets.forEach((loc) => {
      const coords = VILLAGE_COORDS[loc];
      if (!coords) return;
      const el = document.createElement("div");
      el.className = "map-marker" + (state.selectedLocations.includes(loc) ? " is-selected" : "");
      el.style.cssText = "width:12px;height:12px;border-radius:50%;background:" +
        (state.selectedLocations.includes(loc) ? "#e84245" : "#888") +
        ";border:2px solid #fff;cursor:pointer;";

      const popup = new maptilersdk.Popup({ offset: 16 }).setText(
        loc.charAt(0).toUpperCase() + loc.slice(1)
      );

      const marker = new maptilersdk.Marker({ element: el })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(mapInstance);

      el.addEventListener("click", () => {
        if (state.selectedLocations.includes(loc)) {
          state.selectedLocations = state.selectedLocations.filter((l) => l !== loc);
        } else {
          state.selectedLocations.push(loc);
        }
        renderLocationTree();
        renderLocationPills();
        updateLocationTriggerText($(".location-trigger_text"));
        updateMapMarkers();
      });

      mapMarkers.push(marker);
    });

    if (state.selectedLocations.length) {
      const coords = state.selectedLocations
        .map((l) => VILLAGE_COORDS[l])
        .filter(Boolean);
      if (coords.length) {
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        const bounds = [
          [Math.min(...lngs) - 0.02, Math.min(...lats) - 0.02],
          [Math.max(...lngs) + 0.02, Math.max(...lats) + 0.02],
        ];
        mapInstance.fitBounds(bounds, { padding: 40 });
      }
    }
  }

  // ─── FILTERING ───────────────────────────────────────────────────────────────
  function getCards() {
    return $$("#rentals-wrapper .w-dyn-item");
  }

  function cardMatchesBedrooms(card) {
    if (state.bedrooms === "Any") return true;
    const rooms = card.querySelector(".listings_card-wrapper")?.dataset?.rooms || "";
    if (state.bedrooms === "6+") return parseInt(rooms) >= 6;
    return rooms === state.bedrooms;
  }

  function cardMatchesAvailability(card) {
    if (state.availability === "Any") return true;
    const avail = card.querySelector(".listings_card-wrapper")?.dataset?.availableDate || "";
    const isAvailable = avail.toLowerCase() === "available" || avail === "";
    if (state.availability === "Available") return isAvailable;
    if (state.availability === "Rented") return !isAvailable;
    return true;
  }

  function cardMatchesLocation(card) {
    if (!state.selectedLocations.length) return true;
    const loc = (card.querySelector(".listings_card-wrapper")?.dataset?.location || "").toLowerCase().trim();
    return state.selectedLocations.some((sel) => loc.includes(sel) || sel.includes(loc));
  }

  function cardMatchesPrice(card) {
    const wrapper = card.querySelector(".listings_card-wrapper");
    if (!wrapper) return true;
    const rawPrice = parseFloat(wrapper.dataset?.price || "0");
    const cardCurrency = (wrapper.dataset?.currency || "IDR").toUpperCase();

    // Only filter if currency matches selected currency
    if (cardCurrency !== state.currency) return true;
    return rawPrice >= state.priceMin && rawPrice <= state.priceMax;
  }

  function cardMatchesKeyword(card) {
    if (!state.keyword) return true;
    const wrapper = card.querySelector(".listings_card-wrapper");
    if (!wrapper) return false;
    const name = (wrapper.dataset?.name || "").toLowerCase();
    const code = (wrapper.dataset?.code || "").toLowerCase();
    const location = (wrapper.dataset?.location || "").toLowerCase();
    return name.includes(state.keyword) || code.includes(state.keyword) || location.includes(state.keyword);
  }

  function applyFilters() {
    const cards = getCards();
    let visible = [];

    cards.forEach((card) => {
      const show =
        cardMatchesBedrooms(card) &&
        cardMatchesAvailability(card) &&
        cardMatchesLocation(card) &&
        cardMatchesPrice(card) &&
        cardMatchesKeyword(card);

      card.style.display = show ? "" : "none";
      if (show) visible.push(card);
    });

    state.page = 1;
    applyPagination(visible);
    updateResultsCount(visible.length);
    toggleEmptyState(visible.length === 0);
  }

  function applyPagination(visibleCards) {
    const end = state.page * state.pageSize;
    visibleCards.forEach((card, i) => {
      card.style.display = i < end ? "" : "none";
    });

    const loadMoreBtn = $("#load-more");
    if (loadMoreBtn) {
      loadMoreBtn.style.display = visibleCards.length > end ? "" : "none";
    }
  }

  function updateResultsCount(count) {
    const el = $("#rental-results-count");
    if (el) el.textContent = count + " propert" + (count === 1 ? "y" : "ies");
  }

  function toggleEmptyState(isEmpty) {
    const el = $("#rental-empty-state");
    if (el) el.style.display = isEmpty ? "" : "none";
  }

  // ─── LOAD MORE ───────────────────────────────────────────────────────────────
  function initLoadMore() {
    const btn = $("#load-more");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      state.page++;
      const visible = getCards().filter((c) => c._bhbVisible);
      applyPagination(visible);
    });
  }

  // ─── SEARCH BUTTON ────────────────────────────────────────────────────────────
  function initSearchButton() {
    const btn = $(".filter-button-2");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllDropdowns();
      applyFilters();
    });
  }

  // ─── CLEAR BUTTON ────────────────────────────────────────────────────────────
  function initClearButton() {
    const btn = $(".filter-button-1");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      state.bedrooms = "Any";
      state.availability = "Any";
      state.keyword = "";
      state.currency = "IDR";
      state.selectedLocations = [];

      // Reset bedroom trigger text
      const bedField = $$(".filter-field").find((f) => f.querySelector(".filter-label")?.textContent.trim().startsWith("Bed"));
      if (bedField) {
        const tt = $(".filter-trigger_text", bedField);
        if (tt) tt.textContent = "Any";
        $$(".filter-option", bedField).forEach((o) => o.classList.remove("is-selected"));
      }

      // Reset availability trigger text
      const avField = $$(".filter-field").find((f) => f.querySelector(".filter-label")?.textContent.trim().startsWith("Avail"));
      if (avField) {
        const tt = $(".filter-trigger_text", avField);
        if (tt) tt.textContent = "Any";
        $$(".filter-option", avField).forEach((o) => o.classList.remove("is-selected"));
      }

      // Reset keyword
      const keyInput = $(".keyword-input");
      if (keyInput) keyInput.value = "";

      // Reset currency
      const curField = $$(".filter-field").find((f) => f.querySelector(".filter-label")?.textContent.trim().startsWith("Currency"));
      if (curField) {
        const tt = $(".filter-trigger_text", curField);
        if (tt) tt.textContent = "IDR";
        $$(".filter-option", curField).forEach((o) => o.classList.remove("is-selected"));
        const idrOpt = $$(".filter-option", curField).find((o) => o.dataset.value === "IDR");
        if (idrOpt) idrOpt.classList.add("is-selected");
      }

      // Reset price
      resetPriceSliderForCurrency();
      updateChipLabels();
      $$(".pw-chip").forEach((c) => c.classList.remove("is-active"));

      // Reset location
      renderLocationTree();
      renderLocationPills();
      updateLocationTriggerText($(".location-trigger_text"));

      closeAllDropdowns();
      applyFilters();
    });
  }

  // ─── CLOSE ON OUTSIDE CLICK ──────────────────────────────────────────────────
  function initOutsideClick() {
    document.addEventListener("click", (e) => {
      const inside = e.target.closest(".filter-field, .price-trigger-wrapper");
      if (!inside) closeAllDropdowns();
    });
  }

  // ─── MOBILE CLOSE BUTTON ─────────────────────────────────────────────────────
  function initCloseBtn() {
    const closeBtn = $(".close-btn");
    if (!closeBtn) return;
    closeBtn.addEventListener("click", () => {
      $(".rent-filter_form-block")?.classList.remove("is-open");
    });
  }

  // ─── BACK TO TOP ─────────────────────────────────────────────────────────────
  function initBackToTop() {
    const btn = document.querySelector("[data-back-top]") || document.querySelector("#back-to-top");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────
  function init() {
    initBedrooms();
    initAvailability();
    initKeyword();
    initCurrency();
    initPrice();
    initLocation();
    initSearchButton();
    initClearButton();
    initLoadMore();
    initOutsideClick();
    initCloseBtn();
    initBackToTop();
    updateChipLabels();
    applyFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();