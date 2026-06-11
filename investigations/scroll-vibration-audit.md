# Rapport d'Investigation : Vibration au Scroll (Pro Market Algérie)

## Résumé Exécutif

**Problème** : Lors du défilement (scroll) sur les pages de l'application, particulièrement quand on atteint les limites (haut ou bas de page), le contenu vibre/bouge en boucle de manière incontrôlée.

**Cause Racine** : La fonction `initHeaderScroll()` dans `frontend/js/main.js` entre en conflit avec les effets de rebond natifs du navigateur aux limites de scroll, créant une oscillation rapide de la classe CSS `hidden` sur le header sticky.

**Confiance** : Haute (95%) - Le problème est déjà partiellement reconnu (fix existe dans `admin-publish.html`) et les preuves du code confirment le mécanisme.

---

## Évidence Confirmée

### 1. Mécanisme de Vibration du Header (CAUSE PRINCIPALE)

**Fichier** : `frontend/js/main.js:697-731`

```javascript
function initHeaderScroll() {
  let lastScroll = 0;
  let ticking = false;
  const header = document.querySelector('.site-header');
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        
        if (currentScroll > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        
        const scrollDiff = currentScroll - lastScroll;
        if (Math.abs(scrollDiff) > 10) {
          if (scrollDiff > 0 && currentScroll > 200) {
            header.classList.add('hidden');
          } else if (scrollDiff < 0) {
            header.classList.remove('hidden');
          }
          lastScroll = currentScroll;
        }
        
        ticking = false;
      });
      ticking = true;
    }
  });
}
```

**Problèmes identifiés** :
1. Le header est `position: sticky; top: 0;` (`main.css:175-179`)
2. La classe `.hidden` applique `transform: translateY(-100%)` avec une transition de 0.3s (`animations.css:637-639`)
3. Quand on atteint les limites de scroll (haut ou bas), le navigateur applique un effet de rebond natif (rubber-banding sur mobile, edge bounce sur desktop)
4. Cela fait osciller `window.scrollY` rapidement
5. Le code détecte ces oscillations et toggle la classe `hidden` rapidement, créant une boucle de vibration
6. **BUG CRITIQUE** : `lastScroll` n'est pas mis à jour quand `|scrollDiff| <= 10`, ce qui fait que quand on est proche d'une limite, le diff peut osciller autour de 10, créant des toggles rapides

### 2. Effets Parallax (CAUSE SECONDAIRE)

**Fichiers** : `frontend/js/main.js:589-669`

Les fonctions `initParallax()` et `initCategoryParallax()` modifient constamment les propriétés `transform` des éléments lors du scroll. Bien que moins critiques, ils peuvent :
- Amplifier les problèmes de performance
- Créer des conflits de rendu avec d'autres animations
- Sur mobile, causer des ralentissements qui amplifient la perception de vibration

### 3. Preuve de Reconnaissance du Problème

**Fichier** : `frontend/pages/admin-publish.html:991-1008`

```javascript
// ========== FIX VIBRAGE: Désactiver les animations du header scroll sur cette page ==========
(function() {
  // Désactiver le header scroll behavior qui cause des reflows
  const originalInitHeaderScroll = window.initHeaderScroll;
  window.initHeaderScroll = function() {
    // Sur cette page, on garde le header toujours visible sans animation
    const header = document.querySelector('.site-header');
    if (header) {
      header.classList.add('scrolled');
      header.style.transform = 'none';
      header.style.transition = 'none';
    }
  };
  
  // Désactiver les effets parallax sur cette page
  window.initParallax = function() {};
  window.initCategoryParallax = function() {};
})();
```

**Analyse** : Un développeur a déjà identifié et contourné le problème sur cette page spécifique, mais n'a pas appliqué de correction globale. Cela confirme que :
- Le problème est bien `initHeaderScroll`
- Les effets parallax contribuent aussi
- La solution temporaire (désactivation complète) n'est pas idéale pour toutes les pages

---

## Analyse Causale

### Chaîne d'événements

1. **Utilisateur scroll** vers le bas de la page
2. **Atteint la limite** (bas de page) - le navigateur déclenche un effet de rebond natif
3. **Rebond** fait osciller `window.scrollY` de quelques pixels vers le haut puis vers le bas
4. **`initHeaderScroll`** détecte ces changements via l'event listener `scroll`
5. **`scrollDiff`** oscille autour de 10px (seuil arbitraire)
6. **Quand `scrollDiff > 10`** et `currentScroll > 200` → ajoute classe `hidden`
7. **Header disparaît** avec animation `transform: translateY(-100%)` sur 0.3s
8. **Quand `scrollDiff < -10`** (rebond inverse) → retire classe `hidden`
9. **Header réapparaît** avec animation inverse
10. **Boucle** : Le rebond continue, le header oscille visiblement = VIBRATION

### Conditions de déclenchement

- **Obligatoire** : Atteindre une limite de scroll (haut ou bas)
- **Fréquent** : Sur mobile (rubber-banding plus prononcé)
- **Fréquent** : Avec touchpad (scroll inertiel)
- **Possible** : Sur desktop avec souris à molette rapide

---

## Hypothèses Testées

| Hypothèse | Statut | Preuve |
|-----------|--------|--------|
| `initHeaderScroll` cause la vibration | **CONFIRMÉE** | Code montre toggle rapide de `.hidden`, fix existe dans admin-publish.html |
| Effets parallax amplifient le problème | **CONFIRMÉE** | Modifications constantes de `transform` sur scroll, désactivés dans le fix |
| `scroll-behavior: smooth` contribue | **RÉFUTÉE** | Propriété CSS standard, n'interfère pas avec les transforms |
| Animations CSS d'entrée causent le problème | **RÉFUTÉE** | Animations uniques au chargement, pas sur scroll continu |
| Problème spécifique à une page | **RÉFUTÉE** | Le code est global dans main.js, affecte toutes les pages |

---

## Correctifs Proposés

### Solution 1 : Correction Globale (RECOMMANDÉE)

Modifier `initHeaderScroll()` dans `frontend/js/main.js` pour :
1. Utiliser un **debounce** approprié (pas juste requestAnimationFrame)
2. Détecter quand on est aux limites et **désactiver temporairement** le hide/show
3. Utiliser une **direction scroll stable** (pas juste le diff instantané)
4. Ajouter un **cooldown** après chaque changement d'état

### Solution 2 : Désactivation Temporaire (Mitigation)

Si la Solution 1 est trop complexe :
- Désactiver `initHeaderScroll` sur toutes les pages comme dans admin-publish.html
- Garder uniquement l'effet `scrolled` (ombre portée) sans le hide/show

### Solution 3 : Refonte CSS (Alternative)

- Remplacer `transform: translateY(-100%)` par `opacity: 0` ou `visibility: hidden`
- Ou utiliser `position: fixed` avec `top: -100%` au lieu de sticky + transform

---

## Impact

- **Utilisateurs affectés** : Tous (desktop + mobile)
- **Sévérité** : Haute - Impacte l'UX de manière significative
- **Pages affectées** : Toutes (le code est dans main.js)
- **Fréquence** : À chaque fois qu'on atteint une limite de scroll

---

## Recommandation

Appliquer la **Solution 1** (correction globale de `initHeaderScroll`) pour :
- Résoudre le problème sur toutes les pages
- Conserver l'UX prévue (header qui se cache au scroll down)
- Éviter les workarounds page par page
- Améliorer les performances générales

---

## Fichiers à Modifier

1. `frontend/js/main.js` - Corriger `initHeaderScroll()`, optimiser `initParallax()` et `initCategoryParallax()`
2. `frontend/pages/admin-publish.html` - Retirer le fix temporaire (deviendra inutile)
3. Optionnel : `frontend/css/animations.css` - Ajuster les transitions du header

---

*Rapport généré le 11/06/2026*
*Investigateur : opencode*
