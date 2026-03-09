/* ============================================
   V🕳IDSTV — App Logic
   Galaxy Theme + Grid Layout + Pre-roll Ads
   ============================================ */

(function () {
  'use strict';

  // ---- State ----
  let allMovies = [];
  let activeCategory = 'all';
  let heroMovie = null;
  let deferredInstallPrompt = null;

  // ---- Ad Config ----
  const AD_DURATION = 5; // seconds before skip is available

  // ---- Category Display Names ----
  const CATEGORY_LABELS = {
    action: '🔥 Action & Thrillers',
    drama: '🎭 Drama',
    horror: '👻 Horror',
    comedy: '😂 Comedy',
    scifi: '🚀 Sci-Fi & Fantasy',
    documentary: '📽 Documentaries',
    romance: '💖 Romance',
    noir: '🕵️ Film Noir',
    kids: '🧸 Kids & Family',
  };

  const CATEGORY_ORDER = ['action', 'horror', 'scifi', 'comedy', 'drama', 'romance', 'noir', 'kids', 'documentary'];

  // ---- DOM References ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    loadingScreen: $('#loading-screen'),
    nav: $('#main-nav'),
    navCategories: $('#nav-categories'),
    mobileCatBar: $('#mobile-cat-bar'),
    searchToggle: $('#search-toggle'),
    searchOverlay: $('#search-overlay'),
    searchClose: $('#search-close'),
    searchInput: $('#search-input'),
    searchResults: $('#search-results'),
    heroBackdrop: $('#hero-backdrop'),
    heroTitle: $('#hero-title'),
    heroDesc: $('#hero-desc'),
    heroMeta: $('#hero-meta'),
    heroBadge: $('#hero-badge'),
    heroPlay: $('#hero-play'),
    heroInfo: $('#hero-info'),
    contentArea: $('#content-area'),
    movieModal: $('#movie-modal'),
    modalBackdrop: $('#modal-backdrop'),
    modalPanel: $('#modal-panel'),
    modalClose: $('#modal-close'),
    modalPlayerWrap: $('#modal-player-wrap'),
    modalDetails: $('#modal-details'),
    installBtn: $('#install-btn'),
    logoLink: $('#logo-link'),
  };

  // ---- Init ----
  async function init() {
    try {
      const resp = await fetch('verified_public_domain_movies.json');
      const data = await resp.json();
      allMovies = data.movies || [];
      shuffleArray(allMovies);
    } catch (err) {
      console.error('Failed to load movies:', err);
      allMovies = [];
    }

    setupHero();
    buildCategoryNav();
    renderContent();
    setupEvents();
    setupPWA();

    // Hide loading screen
    setTimeout(() => {
      dom.loadingScreen.classList.add('hidden');
    }, 600);
  }

  // ---- Hero ----
  function setupHero() {
    if (allMovies.length === 0) return;

    const candidates = allMovies.filter(m => m.confidence_score >= 90);
    heroMovie = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : allMovies[0];

    dom.heroBackdrop.style.backgroundImage = `url('${heroMovie.poster}')`;
    dom.heroTitle.textContent = heroMovie.title;
    dom.heroDesc.textContent = heroMovie.creator ? `Directed by ${heroMovie.creator}` : '';
    dom.heroMeta.innerHTML = `
      <span class="year-tag">${heroMovie.year}</span>
      <span class="cat-tag">${heroMovie.category}</span>
      <span>• ${heroMovie.source}</span>
    `;

    dom.heroPlay.onclick = () => openModal(heroMovie, true);
    dom.heroInfo.onclick = () => openModal(heroMovie, false);
  }

  // ---- Category Navigation ----
  function buildCategoryNav() {
    // Desktop nav pills
    const allBtn = createCatButton('all', '🎬 All', true);
    dom.navCategories.appendChild(allBtn);

    CATEGORY_ORDER.forEach((cat) => {
      const btn = createCatButton(cat, CATEGORY_LABELS[cat]);
      dom.navCategories.appendChild(btn);
    });

    // Mobile category bar
    const mAllBtn = createMobileCatButton('all', 'All', true);
    dom.mobileCatBar.appendChild(mAllBtn);

    CATEGORY_ORDER.forEach((cat) => {
      const label = CATEGORY_LABELS[cat].replace(/^[^\s]+\s/, '');
      const btn = createMobileCatButton(cat, label);
      dom.mobileCatBar.appendChild(btn);
    });
  }

  function createCatButton(cat, label, active = false) {
    const btn = document.createElement('button');
    btn.className = 'nav-cat-btn' + (active ? ' active' : '');
    btn.textContent = label;
    btn.dataset.cat = cat;
    btn.onclick = () => setCategory(cat);
    return btn;
  }

  function createMobileCatButton(cat, label, active = false) {
    const btn = document.createElement('button');
    btn.className = 'mobile-cat-btn' + (active ? ' active' : '');
    btn.textContent = label;
    btn.dataset.cat = cat;
    btn.onclick = () => setCategory(cat);
    return btn;
  }

  function setCategory(cat) {
    activeCategory = cat;

    $$('.nav-cat-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });

    $$('.mobile-cat-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });

    renderContent();

    // Scroll to content when selecting a specific category
    if (cat !== 'all') {
      dom.contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---- Render Content ----
  function renderContent() {
    dom.contentArea.innerHTML = '';

    if (activeCategory === 'all') {
      // "All" view: horizontal scroll rows per category
      CATEGORY_ORDER.forEach(cat => {
        const movies = allMovies.filter(m => m.category === cat);
        if (movies.length > 0) {
          dom.contentArea.appendChild(buildCategoryRowSection(cat, movies));
        }
      });
    } else {
      // Single category: grid layout (columns and rows)
      const movies = allMovies.filter(m => m.category === activeCategory);
      if (movies.length > 0) {
        dom.contentArea.appendChild(buildCategoryGridSection(activeCategory, movies));
      } else {
        dom.contentArea.innerHTML = `
          <div class="no-movies">
            <h3>No movies found</h3>
            <p>Try selecting a different category.</p>
          </div>
        `;
      }
    }
  }

  // ---- Horizontal Row (for "All" view) ----
  function buildCategoryRowSection(cat, movies) {
    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('div');
    header.className = 'category-header';

    const title = document.createElement('h2');
    title.className = 'category-title';
    title.innerHTML = `${CATEGORY_LABELS[cat] || cat} <span class="count">(${movies.length})</span>`;

    const rowNav = document.createElement('div');
    rowNav.className = 'row-nav';

    const leftBtn = document.createElement('button');
    leftBtn.innerHTML = '‹';
    leftBtn.setAttribute('aria-label', 'Scroll left');

    const rightBtn = document.createElement('button');
    rightBtn.innerHTML = '›';
    rightBtn.setAttribute('aria-label', 'Scroll right');

    rowNav.appendChild(leftBtn);
    rowNav.appendChild(rightBtn);
    header.appendChild(title);
    header.appendChild(rowNav);
    section.appendChild(header);

    const row = document.createElement('div');
    row.className = 'movie-row';

    movies.forEach(movie => {
      row.appendChild(buildMovieCard(movie));
    });

    section.appendChild(row);

    const scrollAmt = 600;
    leftBtn.onclick = () => row.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
    rightBtn.onclick = () => row.scrollBy({ left: scrollAmt, behavior: 'smooth' });

    return section;
  }

  // ---- Grid Layout (for single category view) ----
  function buildCategoryGridSection(cat, movies) {
    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('div');
    header.className = 'category-header';

    const title = document.createElement('h2');
    title.className = 'category-title';
    title.innerHTML = `${CATEGORY_LABELS[cat] || cat} <span class="count">(${movies.length})</span>`;

    header.appendChild(title);
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'movie-grid';

    movies.forEach(movie => {
      grid.appendChild(buildMovieCard(movie));
    });

    section.appendChild(grid);
    return section;
  }

  // ---- Movie Card ----
  function buildMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => openModal(movie, false);

    card.innerHTML = `
      <div class="card-thumb-wrap">
        <img class="card-thumb" src="${movie.poster}" alt="${escapeHtml(movie.title)}" loading="lazy"
             onerror="this.style.background='linear-gradient(135deg, #0d1b3e, #1a0533)'; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22225%22><rect fill=%22%2312122a%22 width=%22400%22 height=%22225%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22 fill=%22%235a5a7a%22>🎬</text></svg>'">
        <div class="card-overlay">
          <div class="card-title">${escapeHtml(movie.title)}</div>
          <div class="card-meta">
            <span class="card-year">${movie.year}</span>
            <span class="card-cat">${movie.category}</span>
          </div>
        </div>
        <div class="card-play-icon">▶</div>
      </div>
      <div class="card-info-strip">
        <div class="card-strip-title">${escapeHtml(movie.title)}</div>
        <div class="card-strip-meta">${movie.year} • ${capitalize(movie.category)}</div>
      </div>
    `;

    return card;
  }

  // ---- Pre-roll Ad Interstitial ----
  function showAdInterstitial(movie, onComplete) {
    // Ads commented out for now
    onComplete();
    return;

    // Create the ad overlay inside the player wrap
    const ad = document.createElement('div');
    ad.className = 'ad-interstitial';
    ad.id = 'ad-interstitial';

    let remaining = AD_DURATION;

    ad.innerHTML = `
      <div class="ad-label">Advertisement</div>
      <div class="ad-slot" id="preroll-ad-slot">
        <!-- ADSENSE: Replace this with your AdSense ad unit code -->
        <span>Ad loads here</span>
      </div>
      <button class="ad-skip" id="ad-skip-btn">Skip in ${remaining}s</button>
    `;

    dom.modalPlayerWrap.appendChild(ad);

    const skipBtn = document.getElementById('ad-skip-btn');

    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        skipBtn.textContent = 'Skip Ad ▶';
        skipBtn.classList.add('ready');
        skipBtn.onclick = () => {
          ad.remove();
          onComplete();
        };
      } else {
        skipBtn.textContent = `Skip in ${remaining}s`;
      }
    }, 1000);
  }

  // ---- Public Domain Evidence Labels ----
  function formatEvidence(key) {
    const labels = {
      explicit_public_domain_license: 'Explicit Public Domain License',
      release_year_pre_1928: 'Released Before 1928 (Public Domain by Law)',
      trusted_collection: 'Source: Trusted Archive Collection',
      public_domain_subject_tag: 'Metadata Tagged: Public Domain',
      us_government_creator: 'Created by U.S. Government Agency',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // ---- Movie Modal ----
  function openModal(movie, autoPlay) {
    dom.movieModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Clear previous content
    dom.modalPlayerWrap.innerHTML = '';

    if (autoPlay) {
      // Show pre-roll ad, then load the player
      // First, set thumbnail as background
      dom.modalPlayerWrap.innerHTML = `
        <div class="modal-player-placeholder" style="background-image: url('${movie.poster}')">
          <div class="modal-big-play" style="opacity:0.3">▶</div>
        </div>
      `;

      showAdInterstitial(movie, () => {
        dom.modalPlayerWrap.innerHTML = `
          <iframe src="${movie.embed_url}" allowfullscreen webkitallowfullscreen mozallowfullscreen
                  allow="autoplay; fullscreen" title="${escapeHtml(movie.title)}"></iframe>
        `;
      });
    } else {
      dom.modalPlayerWrap.innerHTML = `
        <div class="modal-player-placeholder" style="background-image: url('${movie.poster}')"
             id="modal-play-trigger">
          <div class="modal-big-play">▶</div>
        </div>
      `;

      setTimeout(() => {
        const trigger = document.getElementById('modal-play-trigger');
        if (trigger) {
          trigger.onclick = () => {
            // Show pre-roll ad when user clicks play
            dom.modalPlayerWrap.innerHTML = `
              <div class="modal-player-placeholder" style="background-image: url('${movie.poster}')">
                <div class="modal-big-play" style="opacity:0.3">▶</div>
              </div>
            `;

            showAdInterstitial(movie, () => {
              dom.modalPlayerWrap.innerHTML = `
                <iframe src="${movie.embed_url}" allowfullscreen webkitallowfullscreen mozallowfullscreen
                        allow="autoplay; fullscreen" title="${escapeHtml(movie.title)}"></iframe>
              `;
            });
          };
        }
      }, 50);
    }

    // Details
    const pdEvidence = (movie.public_domain_evidence || [])
      .map(e => `<li>${formatEvidence(e)}</li>`).join('');
    dom.modalDetails.innerHTML = `
      <h2 class="modal-title">${escapeHtml(movie.title)}</h2>
      <div class="modal-meta">
        <span class="modal-year">${movie.year}</span>
        <span class="modal-cat">${capitalize(movie.category || 'drama')}</span>
        ${movie.creator ? `<span>• ${escapeHtml(movie.creator)}</span>` : ''}
      </div>
      <div class="modal-actions">
        <button class="btn-play" id="modal-play-now-btn">▶ Play Now</button>
        <button class="btn-info" onclick="navigator.clipboard.writeText('${movie.source_page}').then(() => this.textContent = '✓ Link Copied!').catch(() => {})">
          🔗 Share
        </button>
      </div>
      <div class="modal-citation">
        <h4>Public Domain Status: <span class="pd-verified">Verified (${movie.confidence_score}% Confidence)</span></h4>
        <ul class="pd-evidence">
          ${pdEvidence}
        </ul>
        <p class="pd-source">
          Source: <a href="${movie.source_page}" target="_blank" rel="noopener">Internet Archive</a>
        </p>
      </div>
    `;

    // Wire up the in-app Play Now button
    setTimeout(() => {
      const playNowBtn = document.getElementById('modal-play-now-btn');
      if (playNowBtn) {
        playNowBtn.onclick = () => {
          dom.modalPlayerWrap.innerHTML = `
            <div class="modal-player-placeholder" style="background-image: url('${movie.poster}')">
              <div class="modal-big-play" style="opacity:0.3">▶</div>
            </div>
          `;
          showAdInterstitial(movie, () => {
            dom.modalPlayerWrap.innerHTML = `
              <iframe src="${movie.embed_url}" allowfullscreen webkitallowfullscreen mozallowfullscreen
                      allow="autoplay; fullscreen" title="${escapeHtml(movie.title)}"></iframe>
            `;
          });
        };
      }
    }, 50);
  }

  function closeModal() {
    dom.movieModal.classList.remove('active');
    document.body.style.overflow = '';
    dom.modalPlayerWrap.innerHTML = '';
    dom.modalDetails.innerHTML = '';
  }

  // ---- Search ----
  function openSearch() {
    dom.searchOverlay.classList.add('active');
    dom.searchInput.value = '';
    dom.searchResults.innerHTML = '';
    setTimeout(() => dom.searchInput.focus(), 200);
  }

  function closeSearch() {
    dom.searchOverlay.classList.remove('active');
    dom.searchInput.value = '';
    dom.searchResults.innerHTML = '';
  }

  function handleSearch() {
    const query = dom.searchInput.value.trim().toLowerCase();
    dom.searchResults.innerHTML = '';

    if (query.length < 2) return;

    const results = allMovies.filter(m => {
      return m.title.toLowerCase().includes(query) ||
        (m.description && m.description.toLowerCase().includes(query)) ||
        m.category.toLowerCase().includes(query);
    }).slice(0, 20);

    if (results.length === 0) {
      dom.searchResults.innerHTML = '<div class="no-movies"><p>No movies found for "' + escapeHtml(query) + '"</p></div>';
      return;
    }

    results.forEach(movie => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <img class="search-result-thumb" src="${movie.poster}" alt="" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2245%22><rect fill=%22%2312122a%22 width=%2280%22 height=%2245%22/></svg>'">
        <div class="search-result-info">
          <h4>${escapeHtml(movie.title)}</h4>
          <span>${movie.year} • ${capitalize(movie.category)}</span>
        </div>
      `;
      item.onclick = () => {
        closeSearch();
        openModal(movie, false);
      };
      dom.searchResults.appendChild(item);
    });
  }

  // ---- Events ----
  function setupEvents() {
    window.addEventListener('scroll', () => {
      dom.nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    dom.searchToggle.onclick = openSearch;
    dom.searchClose.onclick = closeSearch;
    dom.searchInput.addEventListener('input', debounce(handleSearch, 200));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (dom.searchOverlay.classList.contains('active')) closeSearch();
        if (dom.movieModal.classList.contains('active')) closeModal();
      }
    });

    dom.searchOverlay.addEventListener('click', (e) => {
      if (e.target === dom.searchOverlay) closeSearch();
    });

    dom.modalClose.onclick = closeModal;
    dom.modalBackdrop.onclick = closeModal;

    dom.logoLink.onclick = (e) => {
      e.preventDefault();
      setCategory('all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // ---- PWA Install ----
  function setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      dom.installBtn.classList.add('visible');
    });

    dom.installBtn.onclick = async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const result = await deferredInstallPrompt.userChoice;
      if (result.outcome === 'accepted') {
        dom.installBtn.classList.remove('visible');
      }
      deferredInstallPrompt = null;
    };

    window.addEventListener('appinstalled', () => {
      dom.installBtn.classList.remove('visible');
    });
  }

  // ---- Utilities ----
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // ---- Start ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
