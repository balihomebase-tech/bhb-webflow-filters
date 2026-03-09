# bhb-webflow-filters

Custom JavaScript filters for the [Bali Home Base](https://balihomebase.com) Webflow site. Three independent filter scripts — one per listings page — plus shared CSS.

---

## Files & Modular Structure

The codebase has been refactored into a modular architecture for maintainability and code reuse:

```
js/
  configs/               → Configuration per page
    land-config.js       → Land page config (AREA_RULES, LOC_COORDS, CHIP_PRESETS)
    rentals-config.js    → Rentals page config
    villas-config.js     → Villas page config
  
  core/                  → Shared core logic
    filter-engine.js     → Filter pipeline, pagination, dropdown helpers
  
  pages/                 → Page-specific implementations
    land.js              → Land page script
    rentals.js           → Rentals page script
    villas.js            → Villas page script
  
  utils/                 → Shared utilities
    currency.js          → Currency conversion, formatting, normalization
    map.js               → Map initialization, markers, bounds

css/
  filter.css             → Shared styles
```

**Location Grouping** is defined in each config's `AREA_RULES`. All three now use the same area structure for consistency.

---

## CDN URLs (jsDelivr)

Each page loads its config + core + page script in order:

**Rentals**
```html
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/configs/rentals-config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/utils/currency.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/utils/map.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/core/filter-engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/pages/rentals.js"></script>
```

**Villas**
```html
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/configs/villas-config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/utils/currency.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/utils/map.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/core/filter-engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/pages/villas.js"></script>
```

**Lands**
```html
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/configs/land-config.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/utils/currency.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/utils/map.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/core/filter-engine.js"></script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/js/pages/land.js"></script>
```

**CSS (add to <head>)**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/USERNAME/bhb-webflow-filters@main/css/filter.css">
```

Replace `USERNAME` with your GitHub username.

> **Script order matters**: Config → Utils → Core → Page script. This ensures utilities and filter logic are available before the page script runs.

> **Cache note:** jsDelivr caches aggressively. To bust cache after an update, use a version tag instead of `@main`:
> `@v1.0.1` → bump the tag on each release.

---

## Features

All three filters share the same core architecture:

| Feature | Rentals | Villas | Lands |
|---|---|---|---|
| Price slider + chips | ✅ | ✅ | ✅ |
| Currency switcher (IDR/USD/EUR) | ✅ | ✅ | ✅ |
| Location map (MapTiler) | ✅ | ✅ | ✅ |
| Keyword search | ✅ | ✅ | ✅ |
| Load more + back to top | ✅ | ✅ | ✅ |
| Availability (Available/Rented) | ✅ | — | — |
| Bedrooms | ✅ | ✅ | — |
| Ownership (Leasehold/Freehold) | — | ✅ | ✅ |
| Lease duration | — | ✅ | ✅ |
| Land size | — | — | ✅ |
| Price per are | — | — | ✅ |

---

## Data Attributes

Each listing card wrapper (`.listings_card-wrapper`) needs these attributes set in Webflow CMS:

**Rentals**
```
data-name             → listing name
data-code             → listing code / ID
data-location         → location name (e.g. "Canggu")
data-rooms            → number of bedrooms (integer)
data-price            → price in listing currency
data-currency         → IDR | USD | EUR
data-available-date   → availability date string
```

**Villas**
```
data-name
data-code
data-location
data-rooms
data-price
data-currency
data-available        → "Leasehold" | "Freehold"
```
Lease years are read from `.leasehold-year-container .u-txt-bold` in the card DOM.

**Lands**
```
data-name
data-code
data-location
data-size             → land size in are (m²)
data-price-are        → price per are (primary)
data-price-total      → total price (fallback if data-price-are missing)
data-currency
data-available        → "Leasehold" | "Freehold"
```
Lease years are read from `.leasehold-year-container .u-txt-bold`.

---

## Area Groups

Locations are grouped into areas for the map and location picker. All three pages (Rentals, Villas, Lands) now use the **same area structure** for consistency:

| Area | Locations |
|---|---|
| Canggu area | Canggu, Pererenan, Seseh, Cemagi, **Buduk**, Kaba Kaba, Kaba-Kaba, Cepaka, Tumbak Bayuh, Buwit, Dalung |
| Uluwatu area | **Bingin**, Uluwatu, Uluwatu Center, Ungasan |
| Ubud area | Ubud, **Ubud Center** |
| Tabanan area | Kedungu, Nyanyi, **Pandak Gede**, **Nyambu**, Tanah Lot |

**Configuration**: Edit `AREA_RULES` in the respective config file (`configs/land-config.js`, `configs/rentals-config.js`, or `configs/villas-config.js`).

To add a new location:
1. Add it to the proper `keys` array in `AREA_RULES` 
2. Add its coordinates to `LOC_COORDS` in the same config file

---

## Price Chips

**Rentals & Villas**
| Currency | Low | Mid | High |
|---|---|---|---|
| IDR | < Rp3B | Rp3B – Rp10B | > Rp10B |
| USD | < $250k | $250k – $600k | > $600k |
| EUR | < €250k | €250k – €600k | > €600k |

**Lands (price per are)**
| Currency | Low | Mid | High |
|---|---|---|---|
| IDR | < Rp8jt/are | Rp8jt – Rp15jt/are | > Rp15jt/are |
| USD | < $500/are | $500 – $950/are | > $950/are |
| EUR | < €450/are | €450 – €900/are | > €900/are |

---

## Required DOM IDs

| ID | Used by |
|---|---|
| `rentals-wrapper` | Rentals grid container |
| `villas-wrapper` | Villas grid container |
| `lands-wrapper` | Lands grid container |
| `rental-results-count` | Result count display (all pages) |
| `rental-empty-state` | Empty state element (all pages) |
| `load-more` | Load more button (rentals, lands) |
| `bhbMap` | Map container inside location dropdown |
| `pwFill` | Slider fill bar |
| `pwMin` / `pwMax` | Native range inputs (hidden) |
| `pwMinText` / `pwMaxText` | Price text inputs |
| `pwRangeText` | Price range label |
| `pwScaleMin` / `pwScaleMax` | Slider scale labels |

Villas load more uses class `.villas-load-more` instead of an ID.

---

## Filter Panel Selectors

| Page | Panel class |
|---|---|
| Rentals | `.rent-filter_form-block` |
| Villas | `.villas-filter_form-block` |
| Lands | `.rent-filter_form-block` |

---

## Currency Conversion

The scripts call `window.debugCurrency.convertAmount(amount, from, to)` and `window.debugCurrency.setCurrency(c)` if available. Hook your site's currency switcher into these to get live conversion on the price slider and chips.

---

## Modular Architecture

The refactored structure separates concerns for better maintainability:

### configs/
Each page has a configuration file defining:
- `CFG`: Grid ID, card selector, pagination step
- `AREA_RULES`: Location groupings (standardized across all pages)
- `LOC_COORDS`: Map coordinates for each location
- `CHIP_PRESETS`: Price range presets per currency
- `MAPTILER_KEY`, `MAP_STYLE`, `PIN_URL`: Map settings
- `FILTER_PANEL`: Page-specific filter form selector

### core/filter-engine.js
Shared core logic:
- `applyFilters()`: Main filter pipeline
- `passes()`: Individual card filter checks (per-page)
- `closeAll()`, `toggleDrop()`: Dropdown management
- `showNext()`, `updateUI()`: Pagination and display
- `injectBackToTop()`, `updateLoadMore()`: UI enhancements

### pages/
Page-specific code that:
- Initializes page-specific DOM elements and state
- Implements page-specific filters (e.g., `passesAvailability()` for rentals, `passesLeaseYear()` for villas)
- Handles price slider with page-specific logic
- Creates and manages location dropdowns and map

### utils/
Reusable utility functions:

**currency.js**: String and currency utilities
- `norm()`: Normalize strings for comparison
- `normCurrency()`: Validate currency codes
- `convertAmount()`: Price conversion
- `symFor()`: Get currency symbol
- `short()`: Format large numbers
- `savedCurrency()`: Read from localStorage

**map.js**: Map initialization and markers
- `initMap()`: Set up MapTiler map
- `syncMapWith()`: Update markers for location filter
- `makePin()`: Create custom marker HTML
- `clearMarkers()`: Remove all markers

---

## Updating

1. Edit the relevant file locally (config, utility, core, or page script)
2. Commit and push to `main`
3. Create a new git tag: `git tag v1.x.x && git push --tags`
4. Update jsDelivr URLs in Webflow to the new tag (if using version tags instead of `@main`)

**Tips for common updates**:
- **Add a new location**: Edit `AREA_RULES` in the config file(s)
- **Change price presets**: Edit `CHIP_PRESETS` in the config file(s)
- **Fix a filter bug**: Update the page-specific script or core filter logic
- **Adjust map behavior**: Edit `utils/map.js`
- **Add currency support**: Update `utils/currency.js` and config presets

---

## Dependencies

- [MapTiler SDK JS v3.10.2](https://docs.maptiler.com/sdk-js/) — loaded dynamically, no install needed
- No other external dependencies