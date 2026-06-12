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
  if (document.getElementById('page-transition')) return;

  const overlay = document.createElement('div');
  overlay.id = 'page-transition';
  overlay.className = 'page-transition-overlay';
  document.body.appendChild(overlay);
  return overlay;
}

function pageTransitionOut(callback) {
  const overlay = createPageTransition();
  overlay.classList.add('active');

  setTimeout(() => {
    if (callback) callback();
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
            ${user?.role === 'admin' ? `
              <a href="${BASE}pages/admin-publish.html" class="header-nav-link ${location.pathname.includes('admin-publish') ? 'active' : ''}">
                <i class="fas fa-plus-circle"></i>
                <span>Publier</span>
              </a>
              <a href="${BASE}pages/admin.html" class="header-nav-link ${location.pathname.includes('admin') && !location.pathname.includes('admin-publish') ? 'active' : ''}">
                <i class="fas fa-shield-alt"></i>
                <span>Admin</span>
              </a>
            ` : ''}
          </div>
          
          <div class="header-actions">
            <button onclick="toggleLanguage()" class="header-action-btn" title="عربي / Français">
              <i class="fas fa-language"></i>
              <span class="lbl">ع/FR</span>
            </button>
            
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
      
      <div class="cat-nav">
        <div class="container">
          <ul class="cat-nav-list" id="cat-nav-list">
            <!-- Categories loaded dynamically -->
          </ul>
        </div>
      </div>
      
      <!-- Mobile Menu -->
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
          <a href="https://wa.me/${window.WHATSAPP_NUMBER}?text=Bonjour,%20je%20souhaite%20publier%20une%20annonce%20sur%20Pro%20Market%20Algérie" 
             class="mobile-menu-link" target="_blank" rel="noopener noreferrer">
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
      </div>
    </nav>`;

  // Load categories into nav
  CategoriesAPI.list().then(cats => {
    const navList = document.getElementById('cat-nav-list');
    cats.forEach(c => {
      navList?.insertAdjacentHTML('beforeend',
        `<li><a href="${BASE}pages/category.html?slug=${escapeHtml(c.slug)}">
          <i class="fas ${escapeHtml(c.icon)}"></i> ${escapeHtml(c.name_fr)}
         </a></li>`);
    });
    const urlSlug = new URLSearchParams(location.search).get('slug');
    navList?.querySelectorAll('a').forEach(a => {
      if (urlSlug && a.href.includes(urlSlug)) a.classList.add('active');
    });
  }).catch(() => {});
}

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

function toggleMobileMenu() {
  const menu = document.getElementById('header-mobile-menu');
  menu.classList.toggle('open');
  document.body.classList.toggle('menu-open');
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
