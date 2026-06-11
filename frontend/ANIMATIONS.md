# Animation System — Pro Market Algérie

## Fichiers modifiés/créés

- **Nouveau** : `frontend/css/animations.css` — Système d'animations complet (1500+ lignes)
- **Modifié** : `frontend/js/main.js` — Gestion du loader + animations JS
- **Modifié** : Toutes les pages HTML — Intégration du système de loading

---

## 🚀 Page Loading System

### Loader Automatique

Un écran de chargement moderne s'affiche automatiquement au chargement de chaque page :

**Caractéristiques** :
- **Fond** : Dégradé sombre avec glows pulsants
- **Logo** : 3 anneaux tournants + icône centrale avec pulse
- **Barre de progression** : Avec effet shimmer/néon
- **Texte** : "Pro Market Algérie" + dots animés
- **Particules** : 8 particules flottantes en arrière-plan
- **Transition de sortie** : Fade élégant avec scale

**Étapes de chargement** :
1. Initialisation... (0%)
2. Chargement des ressources... (15%)
3. Connexion au serveur... (30%)
4. Récupération des données... (50%)
5. Préparation de l'interface... (70%)
6. Finalisation... (85%)
7. Prêt ! (100%)

### Transition entre pages

- **Curtain overlay** : Rideau qui descend avant la navigation
- **Page wrapper** : Fade-in + scale du contenu après chargement
- **Smooth navigation** : Interception des liens pour transitions fluides

---

## 🎬 Animations disponibles

### 1. Scroll-Triggered Reveals

```html
<div class="reveal">Apparition de bas en haut</div>
<div class="reveal-fade">Fade simple</div>
<div class="reveal-scale">Zoom + fade</div>
<div class="reveal-left">Glisse de gauche</div>
<div class="reveal-right">Glisse de droite</div>
<div class="rotate-in">Rotation + scale</div>
<div class="bounce-in">Rebond</div>
<div class="flip-in">Flip 3D</div>
<div class="clip-reveal">Dévoilement par clip</div>
<div class="mask-reveal">Dévoilement par masque</div>
```

**Délais** : `reveal-delay-1` à `reveal-delay-5`

### 2. Stagger Animation

```html
<div class="stagger-children">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### 3. Text Effects

```html
<!-- Texte gradient animé -->
<span class="gradient-text-anim">Texte coloré</span>

<!-- Effet néon -->
<span class="neon-text">Néon glow</span>

<!-- Effet glitch -->
<span class="glitch-text" data-text="Glitch">Glitch</span>

<!-- Typing effect -->
<span class="typing-text">Texte qui s'écrit...</span>

<!-- Soulignement animé -->
<span class="underline-draw">Soulignement</span>
```

### 4. Card Effects

```html
<!-- Carte avec tilt 3D -->
<div class="tilt-card">
  <div class="tilt-content">Contenu</div>
</div>

<!-- Carte avec flottement -->
<div class="float-anim">Flotte</div>
```

### 5. Button Effects

```html
<!-- Ripple effect -->
<button class="btn btn-ripple">Clic avec onde</button>

<!-- Liquid fill -->
<button class="btn liquid-btn">Remplissage liquide</button>

<!-- Magnetic -->
<button class="btn magnetic-btn">Magnétique</button>
```

### 6. Loading States

```html
<!-- Skeleton loading -->
<div class="skeleton-card">
  <div class="skeleton-img skeleton"></div>
  <div class="skeleton-body">
    <div class="skeleton-title skeleton"></div>
  </div>
</div>

<!-- Skeleton v2 (moderne) -->
<div class="skeleton-v2" style="width:200px;height:20px"></div>
```

### 7. Parallax

```html
<div class="parallax" data-parallax-rate="0.5">
  Contenu avec parallax
</div>
```

### 8. Counter Animation

```html
<span data-counter="1500">0</span>
```

### 9. Scroll Indicator

```html
<div class="scroll-indicator">
  <div class="mouse"></div>
</div>
```

### 10. Wave Separator

```html
<div class="wave-separator">
  <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <path d="M0 80V40C240 0 480 0 720 20C960 40 1200 20 1440 40V80H0Z" fill="#f8fafc"/>
  </svg>
</div>
```

### 11. Morphing Blob

```html
<div class="morphing-blob"></div>
```

### 12. Blur Load

```html
<img class="blur-load" data-src="image.jpg" src="placeholder.jpg">
```

---

## 🎨 Hero Section Animations

- **Titre** : Apparition avec flou → net (blur reveal)
- **Sous-titre** : Fade up
- **Barre de recherche** : Fade up décalé
- **Trust badges** : Fade up décalé
- **Particules flottantes** : 5 particules animées
- **Scroll indicator** : Souris animée avec wheel
- **Wave separator** : Vague animée en bas du hero

---

## 📱 Performance

- **will-change** : Utilisé sur les éléments animés
- **requestAnimationFrame** : Pour le parallax
- **Intersection Observer** : Déclenchement au scroll
- **Hardware acceleration** : Transform et opacity uniquement
- **Reduced motion** : Respecte `prefers-reduced-motion`

---

## 🔧 Fonctions JavaScript

### Page Loader

```javascript
// Créer le loader manuellement
initPageLoader();

// Retirer le loader
removePageLoader();

// Mettre à jour la progression
updateLoaderProgress(50, 'Chargement...');
```

### Skeleton Loading

```javascript
// Afficher des skeleton cards
showSkeletonGrid(document.getElementById('grid'), 6);

// Créer un skeleton card
const html = createSkeletonCard();
```

### Counter

```javascript
// Animer un compteur
animateCounter(element, 1500, 2000);
```

---

## 📖 Utilisation rapide

### Animer une section au scroll

```html
<section class="reveal">
  <h2>Titre</h2>
</section>
```

### Animer une grille avec stagger

```html
<div class="stagger-children">
  <!-- items -->
</div>
```

### Ajouter un compteur animé

```html
<div class="stat-val" data-counter="1250">0</div>
```

---

## 🌐 Compatibilité

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

---

## ♿ Accessibilité

- `prefers-reduced-motion` : Désactive toutes les animations
- Focus visible sur tous les éléments interactifs
- Contraste respecté

---

## 📄 Pages mises à jour

- ✅ `frontend/index.html`
- ✅ `frontend/pages/login.html`
- ✅ `frontend/pages/register.html`
- ✅ `frontend/pages/category.html`
- ✅ `frontend/pages/listing-detail.html`
- ✅ `frontend/pages/dashboard.html`
- ✅ `frontend/pages/create-listing.html`
- ✅ `frontend/pages/subscriptions.html`
- ✅ `frontend/pages/admin.html`
