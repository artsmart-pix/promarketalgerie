/* ============================================================
   PRO MARKET ALGÉRIE — Main JS (shared utilities + init)
   ============================================================ */

// Detect if we're in frontend/pages/ or frontend/
const IS_SUBPAGE = location.pathname.includes('/pages/');
const BASE = IS_SUBPAGE ? '../' : '';

// ── Page Loading System ──────────────────────────────────────
let pageLoader = null;
let loadProgress = 0;

function createPageLoader() {
  if (document.getElementById('page-loader')) return;

  const loader = document.createElement('div');
  loader.id = 'page-loader';
  loader.className = 'page-loader';
  loader.innerHTML = `
    <div class="loader-bg-glow">
      <div class="loader-glow-1"></div>
      <div class="loader-glow-2"></div>
    </div>
    <div class="loader-particles">
      <div class="loader-particle"></div>
      <div class="loader-particle"></div>
      <div class="loader-particle"></div>
      <div class="loader-particle"></div>
      <div class="loader-particle"></div>
      <div class="loader-particle"></div>
      <div class="loader-particle"></div>
      <div class="loader-particle"></div>
    </div>
    <div class="loader-content">
      <div class="loader-logo">
        <div class="loader-logo-ring"></div>
        <div class="loader-logo-ring"></div>
        <div class="loader-logo-ring"></div>
        <div class="loader-logo-center">
          <i class="fas fa-briefcase"></i>
        </div>
      </div>
      <div class="loader-text">
        <div class="loader-brand">
          <span>Pro</span> Market Algérie
        </div>
        <div class="loader-dots">
          <div class="loader-dot"></div>
          <div class="loader-dot"></div>
          <div class="loader-dot"></div>
        </div>
      </div>
      <div>
        <div class="loader-progress-container">
          <div class="loader-progress-bar" id="loader-progress" style="width: 0%"></div>
        </div>
        <div class="loader-progress-text" id="loader-status">Initialisation...</div>
      </div>
    </div>
  `;

  document.body.insertBefore(loader, document.body.firstChild);
  pageLoader = loader;
  return loader;
}

function updateLoaderProgress(percent, status) {
  const progressBar = document.getElementById('loader-progress');
  const statusText = document.getElementById('loader-status');
  if (progressBar) progressBar.style.width = percent + '%';
  if (statusText && status) statusText.textContent = status;
}

function removePageLoader() {
  if (!pageLoader) return;

  // Final progress update
  updateLoaderProgress(100, 'Prêt !');

  setTimeout(() => {
    pageLoader.classList.add('loaded');

    // Reveal page content
    document.querySelectorAll('.page-wrapper').forEach(wrapper => {
      wrapper.classList.add('loaded');
    });

    // Trigger scroll animations
    setTimeout(() => {
      initScrollAnimations();
    }, 100);

    // Remove from DOM after animation
    setTimeout(() => {
      if (pageLoader && pageLoader.parentNode) {
        pageLoader.parentNode.removeChild(pageLoader);
      }
    }, 1000);
  }, 400);
}

function simulateLoading() {
  const steps = [
    { progress: 15, status: 'Chargement des ressources...', delay: 100 },
    { progress: 30, status: 'Connexion au serveur...', delay: 300 },
    { progress: 50, status: 'Récupération des données...', delay: 500 },
    { progress: 70, status: 'Préparation de l\'interface...', delay: 700 },
    { progress: 85, status: 'Finalisation...', delay: 900 },
    { progress: 95, status: 'Chargement terminé', delay: 1100 }
  ];

  steps.forEach(step => {
    setTimeout(() => {
      updateLoaderProgress(step.progress, step.status);
    }, step.delay);
  });

  // Complete loading when page is ready
  if (document.readyState === 'complete') {
    setTimeout(removePageLoader, 1400);
  } else {
    window.addEventListener('load', () => {
      setTimeout(removePageLoader, 800);
    });
  }
}

function initPageLoader() {
  // Always show content immediately; loader is decorative overlay only
  document.querySelectorAll('.page-wrapper').forEach(w => w.classList.add('loaded'));

  // Don't show loader on back/forward navigation
  const navEntries = window.performance?.getEntriesByType?.('navigation') || [];
  if (navEntries.length && navEntries[0].type === 'back_forward') {
    return;
  }

  createPageLoader();
  simulateLoading();
}

// ── Page Transition System ───────────────────────────────────
function createPageTransition() {
  // Réutilise l'overlay s'il existe déjà (ex. page restaurée depuis le bfcache
  // au retour back/forward). Retourner undefined ici faisait planter
  // pageTransitionOut (overlay.classList.add sur undefined) après preventDefault,
  // ce qui tuait la navigation → liens « pas routés ».
  let overlay = document.getElementById('page-transition');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-transition';
    overlay.className = 'page-transition-overlay';
    document.body.appendChild(overlay);
  }
  return overlay;
}

function pageTransitionOut(callback) {
  const overlay = createPageTransition();
  if (overlay) overlay.classList.add('active');

  setTimeout(() => {
    if (callback) callback();
    if (!overlay) return;
    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.classList.add('exit');
      setTimeout(() => {
        overlay.classList.remove('exit');
      }, 600);
    }, 100);
  }, 400);
}

// Intercept link clicks for smooth transitions
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http') || href.startsWith('//')) return;
  if (link.hasAttribute('download')) return;
  if (link.target === '_blank') return;

  e.preventDefault();
  pageTransitionOut(() => {
    window.location.href = href;
  });
});

// Page restaurée depuis le bfcache (retour navigateur) : on nettoie l'overlay
// de transition pour qu'il ne reste pas figé/visible.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.getElementById('page-transition')?.classList.remove('active', 'exit');
});

// ── Language / RTL ───────────────────────────────────────────
const LANG = localStorage.getItem('pm_lang') || 'fr';

function setLanguage(lang) {
  localStorage.setItem('pm_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  const rtlLink = document.getElementById('rtl-css');
  if (lang === 'ar' && !rtlLink) {
    const link = document.createElement('link');
    link.id = 'rtl-css'; link.rel = 'stylesheet';
    link.href = `${BASE}css/rtl.css`;
    document.head.appendChild(link);
  } else if (lang !== 'ar' && rtlLink) {
    rtlLink.remove();
  }
  updateLangButtons(lang);
  // Update title suffix based on language
  const suffix = lang === 'ar' ? ' | عربي' : ' | FR';
  if (!document.title.includes(' | ')) {
    document.title = document.title + suffix;
  } else {
    document.title = document.title.replace(/ \| (FR|عربي)$/, suffix);
  }
}

function updateLangButtons(lang) {
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.langBtn === lang);
  });
}

// ── Toast notifications ───────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity .3s, transform .3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

// ── Format helpers ────────────────────────────────────────────
function formatPrice(price, currency = 'DZD', priceOnContact = false) {
  if (priceOnContact) return '<span class="price contact"><i class="fas fa-phone-alt"></i> Prix après contact</span>';
  if (!price) return '<span class="price contact">Non précisé</span>';
  const fmt = new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0 }).format(price);
  return `<span class="price">${fmt} ${currency}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr);
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'À l\'instant';
  if (mins  < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days  < 7)  return `Il y a ${days}j`;
  return formatDate(dateStr);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// IMPORTANT: remplacer par le numéro WhatsApp du client avant mise en production
window.WHATSAPP_NUMBER = '213549129811';

function getWhatsAppPublishUrl() {
  return `https://wa.me/${window.WHATSAPP_NUMBER}?text=Bonjour,%20je%20souhaite%20publier%20une%20annonce%20sur%20Pro%20Market%20Algérie`;
}

function whatsappUrl(phone, listingTitle) {
  const msg = encodeURIComponent(`Bonjour, je suis intéressé(e) par votre annonce sur Pro Market Algérie : "${listingTitle}". Pouvez-vous me donner plus d'informations ?`);
  return `https://wa.me/${phone.replace(/\D/g,'')}?text=${msg}`;
}

// ── Header ────────────────────────────────────────────────────
function renderHeader() {
  const headerEl = document.getElementById('site-header');
  if (!headerEl) return;
  const user = Auth.getUser();

  headerEl.innerHTML = `
    <nav class="site-header">
      <div class="container">
        <div class="header-top">
          <a href="${BASE}index.html" class="site-logo" aria-label="Pro Market Algérie">
            <div class="logo-box">
              <div class="logo-wordrow">
                <span class="logo-s lo">pr</span><svg class="logo-icon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20,3 A17,17 0 1,1 7,9" fill="none" stroke="#f26522" stroke-width="5.5" stroke-linecap="round"/><polygon points="7,9 7,15 1,10" fill="#f26522"/></svg><span class="logo-s lw">market</span><span class="logo-s lo">&nbsp;algerie</span>
              </div>
              <div class="logo-sub">VENTE OUTILLAGE PROFESSIONNEL</div>
            </div>
          </a>
          
          <div class="header-nav">
            <a href="${BASE}index.html" class="header-nav-link ${location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname === '/frontend/' ? 'active' : ''}">
              <i class="fas fa-home"></i>
              <span>Accueil</span>
            </a>
            <a href="${BASE}pages/category.html" class="header-nav-link ${location.pathname.includes('category') ? 'active' : ''}">
              <i class="fas fa-th-list"></i>
              <span>Annonces</span>
            </a>
          </div>
          
          <div class="header-actions">
            ${user?.role === 'admin' ? `
              <a href="${BASE}pages/admin-publish.html" class="header-action-btn" style="background:var(--orange);color:#fff;border-radius:8px">
                <i class="fas fa-plus-circle"></i>
                <span class="lbl">Publier</span>
              </a>
              <a href="${BASE}pages/admin.html" class="header-action-btn" style="background:var(--red);color:#fff;border-radius:8px">
                <i class="fas fa-shield-alt"></i>
                <span class="lbl">Admin</span>
              </a>
              <button onclick="Auth.logout()" class="header-action-btn">
                <i class="fas fa-sign-out-alt"></i>
                <span class="lbl">Déconnexion</span>
              </button>
            ` : ''}
            
            ${user?.role === 'admin' ? '' : `
              <a href="https://wa.me/${window.WHATSAPP_NUMBER}?text=Bonjour,%20je%20souhaite%20publier%20une%20annonce%20sur%20Pro%20Market%20Algérie" 
                 class="btn-deposer btn-ripple" 
                 target="_blank" rel="noopener noreferrer"
                 style="background:#25D366">
                <i class="fab fa-whatsapp"></i>
                <span>Publier</span>
              </a>
            `}
            
            <button class="header-mobile-toggle" onclick="toggleMobileMenu()">
              <i class="fas fa-bars"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div class="cat-nav" id="cat-nav">
        <div class="container">
          <!-- Mobile : bouton qui déroule la liste des rubriques (la barre
               horizontale est masquée en CSS ≤768px) -->
          <button class="cat-dropdown-toggle" id="cat-dropdown-toggle" type="button"
                  aria-expanded="false" aria-controls="cat-nav-list" onclick="toggleCatDropdown()">
            <span class="cat-dropdown-label"><i class="fas fa-layer-group"></i> Choisir une catégorie</span>
            <i class="fas fa-chevron-down cat-dropdown-caret"></i>
          </button>
          <div class="cat-nav-wrap">
            <button class="cat-nav-arrow cat-nav-arrow-left" id="cat-nav-prev" type="button" aria-label="Catégories précédentes">
              <i class="fas fa-chevron-left"></i>
            </button>
            <ul class="cat-nav-list" id="cat-nav-list">
              <!-- Categories loaded dynamically -->
            </ul>
            <button class="cat-nav-arrow cat-nav-arrow-right" id="cat-nav-next" type="button" aria-label="Catégories suivantes">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
      
    </nav>

      <!-- Mobile Menu (hors du <nav> sticky : sinon piégé dans son contexte
           d'empilement → sous l'overlay sombre, clics captés par l'overlay) -->
      <div class="header-mobile-menu" id="header-mobile-menu">
        <div class="mobile-menu-header">
          <span class="mobile-menu-title">Menu</span>
          <button class="mobile-menu-close" onclick="toggleMobileMenu()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="mobile-menu-content">
          <a href="${BASE}index.html" class="mobile-menu-link">
            <i class="fas fa-home"></i> Accueil
          </a>
          <a href="${BASE}pages/category.html" class="mobile-menu-link">
            <i class="fas fa-th-list"></i> Toutes les annonces
          </a>

          <div class="mobile-menu-divider"></div>
          <span class="mobile-menu-section-title">Rubriques</span>
          <div class="mobile-menu-cats" id="mobile-menu-cats">
            <!-- Catégories injectées dynamiquement (CategoriesAPI.list) -->
          </div>
          <div class="mobile-menu-divider"></div>

          <a href="https://wa.me/${window.WHATSAPP_NUMBER}?text=Bonjour,%20je%20souhaite%20publier%20une%20annonce%20sur%20Pro%20Market%20Algérie"
             class="mobile-menu-link mobile-menu-link-cta" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-whatsapp"></i> Publier via WhatsApp
          </a>
          ${user?.role === 'admin' ? `
            <div class="mobile-menu-divider"></div>
            <a href="${BASE}pages/admin.html" class="mobile-menu-link">
              <i class="fas fa-shield-alt"></i> Administration
            </a>
            <button onclick="Auth.logout()" class="mobile-menu-link" style="width:100%;text-align:left;background:none;border:none;color:var(--red)">
              <i class="fas fa-sign-out-alt"></i> Déconnexion
            </button>
          ` : ''}
        </div>
      </div>
      
      <!-- Bottom Navigation (Mobile Only) -->
      <div class="bottom-nav">
        <a href="${BASE}index.html" class="bottom-nav-item ${location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname === '/frontend/' ? 'active' : ''}">
          <i class="fas fa-home"></i>
          <span>Accueil</span>
        </a>
        <a href="${BASE}pages/category.html" class="bottom-nav-item ${location.pathname.includes('category') ? 'active' : ''}">
          <i class="fas fa-th-list"></i>
          <span>Annonces</span>
        </a>
        <a href="https://wa.me/${window.WHATSAPP_NUMBER}?text=Bonjour,%20je%20souhaite%20publier%20une%20annonce%20sur%20Pro%20Market%20Alg%C3%A9rie" 
           class="bottom-nav-item bottom-nav-cta" target="_blank" rel="noopener noreferrer">
          <i class="fab fa-whatsapp"></i>
          <span>Publier</span>
        </a>
        <button class="bottom-nav-item" onclick="toggleMobileMenu()">
          <i class="fas fa-bars"></i>
          <span>Menu</span>
        </button>
      </div>`;

  // Load categories into nav
  CategoriesAPI.list().then(cats => {
    const navList = document.getElementById('cat-nav-list');
    const catMenu = document.getElementById('mobile-menu-cats');
    cats.forEach(c => {
      const href = `${BASE}pages/category.html?slug=${escapeHtml(c.slug)}`;
      navList?.insertAdjacentHTML('beforeend',
        `<li><a href="${href}">
          <i class="fas ${escapeHtml(c.icon)}"></i> ${escapeHtml(c.name_fr)}
         </a></li>`);
      // Même liste de rubriques dans le menu mobile
      catMenu?.insertAdjacentHTML('beforeend',
        `<a href="${href}" class="mobile-menu-link mobile-menu-cat">
          <i class="fas ${escapeHtml(c.icon)}"></i> ${escapeHtml(c.name_fr)}
         </a>`);
    });
    const urlSlug = new URLSearchParams(location.search).get('slug');
    navList?.querySelectorAll('a').forEach(a => {
      if (urlSlug && a.href.includes(urlSlug)) a.classList.add('active');
    });
    // Sur une page catégorie : le bouton mobile affiche la rubrique courante
    const activeCat = urlSlug && cats.find(c => c.slug === urlSlug);
    if (activeCat) {
      const lbl = document.querySelector('#cat-dropdown-toggle .cat-dropdown-label');
      if (lbl) lbl.innerHTML = `<i class="fas ${escapeHtml(activeCat.icon)}"></i> ${escapeHtml(activeCat.name_fr)}`;
    }
    setupCatNavScroll();
    // Centre la catégorie active si elle déborde hors écran
    navList?.querySelector('a.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }).catch(() => {});
}

// Pilote un conteneur à défilement horizontal via deux boutons ‹ › ;
// les boutons ne s'affichent (.is-visible) que lorsque le contenu déborde.
function setupHScroll(list, prev, next) {
  if (!list || !prev || !next) return;

  const update = () => {
    const max = list.scrollWidth - list.clientWidth;
    const scrollable = max > 4;
    prev.classList.toggle('is-visible', scrollable && list.scrollLeft > 4);
    next.classList.toggle('is-visible', scrollable && list.scrollLeft < max - 4);
  };
  const step = () => Math.max(160, list.clientWidth * 0.7);

  prev.addEventListener('click', () => list.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => list.scrollBy({ left:  step(), behavior: 'smooth' }));
  list.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // Recalcule une fois la mise en page stabilisée (icônes Font Awesome)
  requestAnimationFrame(update);
  setTimeout(update, 400);
}
window.setupHScroll = setupHScroll;

// Défilement horizontal de la top bar catégories
function setupCatNavScroll() {
  setupHScroll(
    document.getElementById('cat-nav-list'),
    document.getElementById('cat-nav-prev'),
    document.getElementById('cat-nav-next'),
  );
}

// ── Liste déroulante des rubriques (mobile) ───────────────────
// Le bouton « Choisir une catégorie » déroule/replie #cat-nav-list.
function closeCatDropdown() {
  const nav = document.getElementById('cat-nav');
  if (!nav) return;
  nav.classList.remove('open');
  document.getElementById('cat-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', onCatDropdownOutsideClick);
}

function onCatDropdownOutsideClick(e) {
  const nav = document.getElementById('cat-nav');
  if (!nav) return;
  // Ferme si on clique hors du panneau, OU sur une rubrique (un <a> → navigation)
  if (!nav.contains(e.target) || e.target.closest('.cat-nav-list a')) closeCatDropdown();
}

function toggleCatDropdown() {
  const nav = document.getElementById('cat-nav');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  document.getElementById('cat-dropdown-toggle')?.setAttribute('aria-expanded', String(open));
  if (open) {
    // setTimeout(0) : laisse le clic d'ouverture finir de remonter avant d'écouter
    setTimeout(() => document.addEventListener('click', onCatDropdownOutsideClick), 0);
  } else {
    document.removeEventListener('click', onCatDropdownOutsideClick);
  }
}
window.toggleCatDropdown = toggleCatDropdown;

function toggleLanguage() {
  setLanguage(LANG === 'fr' ? 'ar' : 'fr');
  location.reload();
}

function toggleUserMenu(btn) {
  const dropdown = btn.nextElementSibling;
  dropdown.classList.toggle('open');
  
  // Close when clicking outside
  const closeMenu = (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      document.removeEventListener('click', closeMenu);
    }
  };
  
  if (dropdown.classList.contains('open')) {
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }
}

// Ferme le menu si on clique sur l'overlay sombre (hors panneau) ou sur un
// lien à l'intérieur du menu (navigation / WhatsApp ouvert dans un onglet).
function onMobileMenuOutsideClick(e) {
  const menu = document.getElementById('header-mobile-menu');
  if (!menu) return;
  if (!menu.contains(e.target) || e.target.closest('a')) closeMobileMenu();
}

function openMobileMenu() {
  const menu = document.getElementById('header-mobile-menu');
  if (!menu) return;
  menu.classList.add('open');
  document.body.classList.add('menu-open');
  // setTimeout(0) : laisse le clic d'ouverture finir de remonter avant
  // d'écouter, sinon il refermerait aussitôt le menu.
  setTimeout(() => document.addEventListener('click', onMobileMenuOutsideClick), 0);
}

function closeMobileMenu() {
  const menu = document.getElementById('header-mobile-menu');
  if (!menu) return;
  menu.classList.remove('open');
  document.body.classList.remove('menu-open');
  document.removeEventListener('click', onMobileMenuOutsideClick);
}

function toggleMobileMenu() {
  const menu = document.getElementById('header-mobile-menu');
  if (!menu) return;
  if (menu.classList.contains('open')) closeMobileMenu();
  else openMobileMenu();
}

// ── Footer ────────────────────────────────────────────────────
function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            <a href="${BASE}index.html" class="site-logo" style="margin-bottom:14px" aria-label="Pro Market Algérie">
              <div class="logo-box">
                <div class="logo-wordrow">
                  <span class="logo-s lo">pr</span><svg class="logo-icon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20,3 A17,17 0 1,1 7,9" fill="none" stroke="#f26522" stroke-width="5.5" stroke-linecap="round"/><polygon points="7,9 7,15 1,10" fill="#f26522"/></svg><span class="logo-s lw">market</span><span class="logo-s lo">&nbsp;algerie</span>
                </div>
                <div class="logo-sub">VENTE OUTILLAGE PROFESSIONNEL</div>
              </div>
            </a>
            <p style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.8;margin-top:4px">
              Achetez, vendez, entreprenez plus facilement.<br>
              La marketplace B2B de référence en Algérie.
            </p>
          </div>
          <div class="footer-col">
            <h4>Rubriques</h4>
            <a href="${BASE}pages/category.html?slug=industrie-usines">Industrie & Usines</a>
            <a href="${BASE}pages/category.html?slug=construction-btp">Construction & BTP</a>
            <a href="${BASE}pages/category.html?slug=transport-logistique">Transport & Logistique</a>
            <a href="${BASE}pages/category.html?slug=agriculture-peche">Agriculture & Pêche</a>
            <a href="${BASE}pages/category.html?slug=restauration-hotellerie">Restauration</a>
          </div>
          <div class="footer-col">
            <h4>Services</h4>
            <a href="https://wa.me/${window.WHATSAPP_NUMBER}?text=Bonjour,%20je%20souhaite%20publier%20une%20annonce%20sur%20Pro%20Market%20Algérie" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp"></i> Publier une annonce</a>
            <a href="${BASE}pages/category.html">Toutes les annonces</a>
            <a href="${BASE}pages/login.html"><i class="fas fa-lock"></i> Espace Admin</a>
          </div>
          <div class="footer-col">
            <h4>Contact</h4>
            <a href="mailto:contact@promarketalgerie.com">
              <i class="fas fa-envelope"></i> contact@promarketalgerie.com
            </a>
            <a href="tel:+${window.WHATSAPP_NUMBER}">
              <i class="fas fa-phone"></i> +213 555 000 000
            </a>
            <a href="#" onclick="showToast('Page Facebook bientôt disponible','info');return false;"><i class="fab fa-facebook"></i> Facebook</a>
            <a href="#" onclick="showToast('Page Instagram bientôt disponible','info');return false;"><i class="fab fa-instagram"></i> Instagram</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Pro Market Algérie — Tous droits réservés</span>
          <div style="display:flex;gap:12px">
            <a href="#" onclick="showToast('Page bientôt disponible','info');return false;">Conditions d'utilisation</a>
            <a href="#" onclick="showToast('Page bientôt disponible','info');return false;">Confidentialité</a>
            <a href="#" onclick="showToast('Page bientôt disponible','info');return false;">Aide</a>
          </div>
        </div>
      </div>
    </footer>`;
}

// ── Listing card HTML ─────────────────────────────────────────
function renderListingCard(listing) {
  const img = listing.cover_image
    ? `<img src="${escapeHtml(listing.cover_image)}" alt="${escapeHtml(listing.title_fr)}" loading="lazy">`
    : `<div class="no-img"><i class="fas fa-image"></i></div>`;

  const badges = [];
  if (listing.is_boosted) badges.push('<span class="badge badge-orange">⬆ Top</span>');
  if (listing.is_premium) badges.push('<span class="badge badge-premium">★ Premium</span>');
  if (listing.seller_certified) badges.push('<span class="badge badge-blue"><i class="fas fa-shield-alt"></i> Certifié</span>');

  return `
    <a class="listing-card ${listing.is_premium ? 'is-premium' : ''}"
       href="${BASE}pages/listing-detail.html?id=${listing.id}">
      <div class="listing-card-img">
        ${img}
         ${badges.length ? `<div class="badges">${badges.join('')}</div>` : ''}
        <div class="listing-card-shine"></div>
      </div>
      <div class="listing-card-body">
        <div class="title">${escapeHtml(listing.title_fr)}</div>
        ${formatPrice(listing.price, listing.currency, listing.price_on_contact)}
        <div class="meta">
          ${listing.wilaya_name ? `<span class="meta-item"><i class="fas fa-map-marker-alt" style="color:var(--orange)"></i> ${escapeHtml(listing.wilaya_name)}</span>` : ''}
          ${listing.condition   ? `<span class="meta-item"><i class="fas fa-star"></i> ${escapeHtml(listing.condition)}</span>` : ''}
          ${listing.year        ? `<span class="meta-item"><i class="fas fa-calendar-alt"></i> ${listing.year}</span>` : ''}
        </div>
        <div class="seller-row">
          <span class="seller-name"><i class="fas fa-user"></i> ${escapeHtml(listing.seller_name || listing.company_name || 'Vendeur')}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--gray-400)">${timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </a>`;
}

// ── Scroll-Triggered Animations ─────────────────────────────
function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Optionally unobserve after animation
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all reveal elements
  document.querySelectorAll('.reveal, .reveal-fade, .reveal-scale, .reveal-left, .reveal-right, .stagger-children').forEach(el => {
    observer.observe(el);
  });
}

// ── Parallax Effect ──────────────────────────────────────────
function initParallax() {
  let ticking = false;
  let lastScrollY = window.scrollY;
  
  function updateParallax() {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;
    
    // Ne mettre à jour que si le scroll a significativement changé
    if (Math.abs(scrollDelta) < 1) {
      ticking = false;
      return;
    }
    
    lastScrollY = currentScrollY;
    
    const parallaxElements = document.querySelectorAll('.parallax');
    parallaxElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const rate = el.dataset.parallaxRate || 0.5;
      
      // Vérifier si l'élément est visible dans le viewport (avec marge)
      const margin = 200;
      if (rect.top < window.innerHeight + margin && rect.bottom > -margin) {
        const yPos = -(currentScrollY * rate);
        // Utiliser translate3d pour forcer l'accélération GPU
        el.style.transform = `translate3d(0, ${yPos}px, 0)`;
      }
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
}

// ── Category Cards 3D Tilt Effect ────────────────────────────
function initCategoryCards() {
  const cards = document.querySelectorAll('.cat-card');
  
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px) scale(1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
    });
  });
}

// ── Section Parallax for Categories ──────────────────────────
function initCategoryParallax() {
  const section = document.querySelector('.categories-section');
  if (!section) return;
  
  let ticking = false;
  let lastScrollY = window.scrollY;
  
  function update() {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;
    
    // Ne mettre à jour que si le scroll a significativement changé
    if (Math.abs(scrollDelta) < 1) {
      ticking = false;
      return;
    }
    
    lastScrollY = currentScrollY;
    
    const rect = section.getBoundingClientRect();
    const rate = 0.03;
    
    // Vérifier si la section est visible (avec marge)
    const margin = 300;
    if (rect.top < window.innerHeight + margin && rect.bottom > -margin) {
      const blobs = section.querySelectorAll('.cat-bg-blob');
      blobs.forEach((blob, index) => {
        const speed = (index + 1) * rate;
        const yPos = (currentScrollY - section.offsetTop) * speed;
        // Utiliser translate3d pour forcer l'accélération GPU
        blob.style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
    }
    ticking = false;
  }
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}

// ── Listing Cards 3D Tilt Effect ─────────────────────────────
function initListingCards() {
  const cards = document.querySelectorAll('.listings-animated-grid .listing-card');
  
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
    });
  });
}

// ── Header Scroll Behavior ───────────────────────────────────
function initHeaderScroll() {
  let lastScroll = 0;
  let ticking = false;
  let scrollDirection = 'none';
  let directionStability = 0;
  let lastToggleTime = 0;
  const header = document.querySelector('.site-header');
  
  if (!header) return;
  
  // Configuration anti-vibration
  const CONFIG = {
    SCROLL_THRESHOLD: 10,        // Pixels minimum pour détecter un changement
    DIRECTION_STABILITY: 3,      // Frames consécutives pour confirmer la direction
    COOLDOWN_MS: 300,           // Délai minimum entre chaque toggle
    HIDE_AFTER_SCROLL: 200,      // Scroll minimum avant de cacher
    EDGE_TOLERANCE: 50          // Zone tampon aux limites de page
  };
  
  function isNearEdge() {
    const scrollTop = window.scrollY;
    const scrollBottom = scrollTop + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    
    // Désactiver le hide/show quand on est proche du haut ou du bas
    return scrollTop < CONFIG.EDGE_TOLERANCE || 
           (docHeight - scrollBottom) < CONFIG.EDGE_TOLERANCE;
  }
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        const now = Date.now();
        
        // Gestion de l'effet scrolled (ombre portée)
        if (currentScroll > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        
        // Ne pas cacher/montrer le header si on est aux limites de la page
        if (isNearEdge()) {
          lastScroll = currentScroll;
          ticking = false;
          return;
        }
        
        // Calcul de la direction
        const scrollDiff = currentScroll - lastScroll;
        const newDirection = scrollDiff > 0 ? 'down' : (scrollDiff < 0 ? 'up' : 'none');
        
        // Stabilisation de la direction (évite les oscillations)
        if (newDirection === scrollDirection && newDirection !== 'none') {
          directionStability++;
        } else {
          scrollDirection = newDirection;
          directionStability = 0;
        }
        
        // Vérifier le cooldown
        const timeSinceLastToggle = now - lastToggleTime;
        if (timeSinceLastToggle < CONFIG.COOLDOWN_MS) {
          lastScroll = currentScroll;
          ticking = false;
          return;
        }
        
        // Appliquer le changement uniquement si la direction est stable
        if (directionStability >= CONFIG.DIRECTION_STABILITY && Math.abs(scrollDiff) > CONFIG.SCROLL_THRESHOLD) {
          if (scrollDirection === 'down' && currentScroll > CONFIG.HIDE_AFTER_SCROLL) {
            if (!header.classList.contains('hidden')) {
              header.classList.add('hidden');
              lastToggleTime = now;
            }
          } else if (scrollDirection === 'up') {
            if (header.classList.contains('hidden')) {
              header.classList.remove('hidden');
              lastToggleTime = now;
            }
          }
          lastScroll = currentScroll;
        }
        
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ── Button Ripple Effect ─────────────────────────────────────
function initRippleEffect() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-ripple, .btn');
    if (!btn) return;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    btn.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
}

// ── Image Lazy Loading with Fade ────────────────────────────
function initLazyImages() {
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.classList.add('img-loading');
        
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        
        img.onload = () => {
          img.classList.remove('img-loading');
          img.classList.add('img-loaded');
        };
        
        imgObserver.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imgObserver.observe(img);
  });
}

// ── Smooth Scroll for Anchor Links ───────────────────────────
function initSmoothScroll() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
}

// ── Counter Animation ────────────────────────────────────────
function animateCounter(el, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = target.toLocaleString('fr-DZ');
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current).toLocaleString('fr-DZ');
    }
  }, 16);
}

function initCounters() {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.counter);
        if (!isNaN(target)) {
          animateCounter(el, target);
          counterObserver.unobserve(el);
        }
      }
    });
  });

  document.querySelectorAll('[data-counter]').forEach(el => {
    counterObserver.observe(el);
  });
}

// ── Skeleton Loading Helper ──────────────────────────────────
function createSkeletonCard() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-img skeleton"></div>
      <div class="skeleton-body">
        <div class="skeleton-title skeleton"></div>
        <div class="skeleton-price skeleton"></div>
        <div class="skeleton-meta skeleton"></div>
      </div>
    </div>`;
}

function showSkeletonGrid(container, count = 6) {
  if (!container) return;
  container.innerHTML = Array(count).fill(createSkeletonCard()).join('');
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(LANG);
  renderHeader();
  renderFooter();

  // Initialize page loader
  initPageLoader();

  // Initialize mobile utilities
  initMobileUtils();

  // Initialize other animations after a short delay
  setTimeout(() => {
    initParallax();
    initHeaderScroll();
    initRippleEffect();
    initLazyImages();
    initSmoothScroll();
    initCounters();
    initCategoryCards();
    initCategoryParallax();
    initListingCards();
  }, 1500);
});

// Expose globals
window.showToast       = showToast;
window.openModal       = openModal;
window.closeModal      = closeModal;
window.formatPrice     = formatPrice;
window.formatDate      = formatDate;
window.timeAgo         = timeAgo;
window.escapeHtml      = escapeHtml;
window.whatsappUrl     = whatsappUrl;
window.renderListingCard = renderListingCard;

window.toggleLanguage  = toggleLanguage;
window.BASE            = BASE;
window.showSkeletonGrid = showSkeletonGrid;
window.createSkeletonCard = createSkeletonCard;
window.initPageLoader  = initPageLoader;
window.removePageLoader = removePageLoader;
window.toggleUserMenu  = toggleUserMenu;
window.toggleMobileMenu = toggleMobileMenu;
window.initCategoryCards = initCategoryCards;
window.initCategoryParallax = initCategoryParallax;
window.initListingCards = initListingCards;
window.initMobileUtils = initMobileUtils;

// ── Mobile Utilities ─────────────────────────────────────────
function initMobileUtils() {
  // Fix iOS viewport height
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  setVh();
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);

  // Prevent zoom on iOS inputs
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      document.body.classList.add('input-focused');
    });
    input.addEventListener('blur', () => {
      document.body.classList.remove('input-focused');
    });
  });

  // Close mobile menu on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      const menu = document.getElementById('header-mobile-menu');
      if (menu && menu.classList.contains('open')) {
        toggleMobileMenu();
      }
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   CSELECT — enrichit les <select> en dropdown stylé (partagé)
   Le <select> natif reste dans le DOM (caché) comme source de vérité :
   on dessine par-dessus un bouton + une liste 100% stylée et positionnée
   par nos soins → plus de liste native décalée hors écran sur mobile.
   Auto-appliqué à tous les `select.form-control` ; reconstruit ses
   options quand le JS de la page les injecte (wilayas/communes/API…).
   Config par data-attributs : data-cselect-icon, data-cselect-variant,
   data-cselect-search ("true"/"false"), data-cselect-search-ph,
   data-no-cselect (pour exclure).
   ════════════════════════════════════════════════════════════════ */
(function () {
  let uidc = 0;
  const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function enhanceSelect(select, opts) {
    if (!select || select.dataset.enhanced === '1') return;
    opts = opts || {};
    const d = select.dataset;
    const cfg = {
      icon: opts.icon || d.cselectIcon || '',
      variant: opts.variant || d.cselectVariant || '',
      searchable: opts.searchable != null ? opts.searchable
                : (d.cselectSearch != null ? d.cselectSearch !== 'false' : null),
      searchPlaceholder: opts.searchPlaceholder || d.cselectSearchPh || 'Rechercher…',
    };
    select.dataset.enhanced = '1';
    const uid = 'cs' + (++uidc);
    const wrap = select.closest('.filter-select-wrap') || select.parentElement;

    // Récupère/masque une icône sœur éventuelle, réutilise sa classe
    let iconClass = cfg.icon;
    const oldIcon = Array.from(wrap.children).find(c => c.tagName === 'I');
    if (oldIcon) { if (!iconClass) iconClass = oldIcon.className; oldIcon.style.display = 'none'; }
    select.classList.add('cselect-native');

    const root = document.createElement('div');
    root.className = 'cselect' + (cfg.variant ? ' cselect--' + cfg.variant : '');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cselect-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', uid);
    let iconEl = null;
    if (iconClass) { iconEl = document.createElement('i'); iconEl.className = 'cselect-icon ' + iconClass; btn.appendChild(iconEl); }
    const labelSpan = document.createElement('span');
    labelSpan.className = 'cselect-label';
    btn.appendChild(labelSpan);
    const caret = document.createElement('i');
    caret.className = 'cselect-caret fas fa-chevron-down';
    btn.appendChild(caret);

    const panel = document.createElement('div');
    panel.className = 'cselect-panel';
    panel.id = uid;
    panel.setAttribute('role', 'listbox');

    root.appendChild(btn);
    root.appendChild(panel);
    select.parentNode.insertBefore(root, select.nextSibling);

    let liEls = [], searchInput = null, optionEls = [];

    function syncFromSelect() {
      const opt = optionEls.find(o => o.value === select.value) || optionEls[0];
      labelSpan.textContent = opt ? opt.text : '';
      labelSpan.classList.toggle('is-placeholder', select.value === '' || select.value == null);
      liEls.forEach(li => li.setAttribute('aria-selected', String(li.dataset.value === select.value)));
    }
    select._refreshCustom = syncFromSelect;

    const visibleOpts = () => liEls.filter(li => !li.classList.contains('is-hidden'));
    function setActive(li) {
      panel.querySelectorAll('.cselect-opt.active').forEach(x => x.classList.remove('active'));
      if (li) { li.classList.add('active'); li.scrollIntoView({ block: 'nearest' }); }
    }
    let empty = null;
    function filterList(q) {
      const nq = norm(q);
      let any = false;
      liEls.forEach(li => {
        const match = !nq || norm(li.textContent).includes(nq);
        li.classList.toggle('is-hidden', !match);
        if (match) any = true;
      });
      if (empty) empty.classList.toggle('is-hidden', any);
      setActive(visibleOpts()[0] || null);
    }

    function choose(val) {
      select.value = val;
      syncFromSelect();
      close();
      btn.focus();
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // (Re)construit la liste depuis les <option> courantes du <select>
    function rebuild() {
      optionEls = Array.from(select.options);
      const searchable = cfg.searchable != null ? cfg.searchable : optionEls.length > 8;
      panel.textContent = '';
      searchInput = null;
      if (searchable) {
        const sb = document.createElement('div');
        sb.className = 'cselect-search';
        const si = document.createElement('i'); si.className = 'fas fa-search'; sb.appendChild(si);
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = cfg.searchPlaceholder;
        searchInput.setAttribute('aria-label', cfg.searchPlaceholder);
        searchInput.addEventListener('input', () => filterList(searchInput.value));
        sb.appendChild(searchInput);
        panel.appendChild(sb);
      }
      const list = document.createElement('ul');
      list.className = 'cselect-list';
      liEls = optionEls.map(o => {
        const li = document.createElement('li');
        li.className = 'cselect-opt';
        li.setAttribute('role', 'option');
        li.dataset.value = o.value;
        li.textContent = o.text;
        li.addEventListener('click', () => choose(o.value));
        list.appendChild(li);
        return li;
      });
      empty = document.createElement('li');
      empty.className = 'cselect-empty is-hidden';
      empty.textContent = 'Aucun résultat';
      list.appendChild(empty);
      panel.appendChild(list);
      syncFromSelect();
    }

    function open() {
      if (root.classList.contains('open')) return;
      document.querySelectorAll('.cselect.open').forEach(c => c !== root && c._close && c._close());
      root.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      if (searchInput) { searchInput.value = ''; filterList(''); }
      setActive(liEls.find(li => li.dataset.value === select.value) || visibleOpts()[0] || null);
      setTimeout(() => {
        document.addEventListener('click', onOutside, true);
        (searchInput || btn).focus();
      }, 0);
    }
    function close() {
      if (!root.classList.contains('open')) return;
      root.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onOutside, true);
    }
    root._close = close;
    function onOutside(e) { if (!root.contains(e.target)) close(); }

    btn.addEventListener('click', () => root.classList.contains('open') ? close() : open());
    btn.addEventListener('keydown', e => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key) && !root.classList.contains('open')) {
        e.preventDefault(); open();
      }
    });
    root.addEventListener('keydown', e => {
      if (!root.classList.contains('open')) return;
      const vis = visibleOpts();
      const cur = panel.querySelector('.cselect-opt.active');
      const idx = vis.indexOf(cur);
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(vis[Math.min(idx + 1, vis.length - 1)] || vis[0]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(vis[Math.max(idx - 1, 0)] || vis[vis.length - 1]); }
      else if (e.key === 'Enter') { e.preventDefault(); if (cur) choose(cur.dataset.value); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); btn.focus(); }
      else if (e.key === 'Tab') { close(); }
    });

    rebuild();
    // Reconstruit quand la page (ré)injecte des <option> (API wilayas/communes…)
    new MutationObserver(() => rebuild()).observe(select, { childList: true });
  }

  function enhanceAll(rootEl) {
    (rootEl || document).querySelectorAll('select.form-control:not([data-enhanced]):not([data-no-cselect])')
      .forEach(s => enhanceSelect(s));
  }

  window.enhanceSelect = enhanceSelect;
  window.enhanceAllSelects = enhanceAll;

  document.addEventListener('DOMContentLoaded', () => {
    enhanceAll(document);
    // Enrichit aussi les <select> ajoutés au DOM après coup (formulaires dynamiques)
    new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches('select.form-control')) enhanceSelect(n);
        if (n.querySelectorAll) n.querySelectorAll('select.form-control:not([data-enhanced]):not([data-no-cselect])').forEach(s => enhanceSelect(s));
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
