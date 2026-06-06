let lang = localStorage.getItem('site-lang') || 'pl';
let theme = localStorage.getItem('site-theme') || 'dark';
let contrast = localStorage.getItem('site-contrast') || 'normal';
let fontScale = localStorage.getItem('site-font-scale') || 'normal';

const root = document.documentElement;
const translations = document.querySelectorAll('[data-pl]');
const langBtn = document.getElementById('langToggle');
const themeBtn = document.getElementById('themeToggle');
const accessibilityToggle = document.getElementById('accessibilityToggle');
const accessibilityMenu = document.getElementById('accessibilityMenu');
const contrastBtn = document.getElementById('contrastToggle');
const fontBtn = document.getElementById('fontToggle');
const revealTargets = document.querySelectorAll(
  '.section-header, .journey-card, .results-box, .result-item, .ai-note, .analysis-card, .about-text p, .skills-list .skill-item, .looking-for, .looking-item, .contact-heading, .contact-sub, .contact-link, .cv-download, .preview-card, .info-card, .footer .footer-text, .micro-note, .stat-item'
);

function updateControlState() {
  root.dataset.theme = theme;
  root.dataset.contrast = contrast;
  root.dataset.fontScale = fontScale;

  if (langBtn) {
    langBtn.textContent = lang === 'pl' ? 'EN' : 'PL';
    langBtn.setAttribute('aria-label', lang === 'pl' ? 'Switch to English' : 'Przełącz na polski');
  }

  if (themeBtn) {
    const isLight = theme === 'light';
    themeBtn.setAttribute('aria-pressed', String(isLight));
    themeBtn.setAttribute('aria-label', lang === 'pl'
      ? (isLight ? 'Przełącz na ciemny motyw' : 'Przełącz na jasny motyw')
      : (isLight ? 'Switch to dark mode' : 'Switch to light mode'));
  }

  if (accessibilityToggle) {
    accessibilityToggle.setAttribute('aria-label', lang === 'pl' ? 'Ustawienia dostępności' : 'Accessibility settings');
  }

  if (contrastBtn) {
    const isHighContrast = contrast === 'high';
    contrastBtn.setAttribute('aria-pressed', String(isHighContrast));
  }

  if (fontBtn) {
    const isLargeFont = fontScale === 'large';
    fontBtn.setAttribute('aria-pressed', String(isLargeFont));
  }
}

function setAccessibilityMenuState(isOpen) {
  if (!accessibilityToggle || !accessibilityMenu) {
    return;
  }

  accessibilityToggle.setAttribute('aria-expanded', String(isOpen));
  accessibilityMenu.hidden = !isOpen;
}

function applyLanguage(nextLang) {
  lang = nextLang;
  root.lang = lang;
  localStorage.setItem('site-lang', lang);

  translations.forEach((element) => {
    const text = element.getAttribute(`data-${lang}`);

    if (text) {
      element.innerHTML = text;
    }
  });

  updateControlState();
}

function applyTheme(nextTheme) {
  theme = nextTheme;
  localStorage.setItem('site-theme', theme);
  updateControlState();
}

function applyContrast(nextContrast) {
  contrast = nextContrast;
  localStorage.setItem('site-contrast', contrast);
  updateControlState();
}

function applyFontScale(nextScale) {
  fontScale = nextScale;
  localStorage.setItem('site-font-scale', fontScale);
  updateControlState();
}

if (langBtn) {
  langBtn.addEventListener('click', () => {
    applyLanguage(lang === 'pl' ? 'en' : 'pl');
  });
}

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  });
}

if (accessibilityToggle) {
  accessibilityToggle.addEventListener('click', () => {
    const isOpen = accessibilityToggle.getAttribute('aria-expanded') === 'true';
    setAccessibilityMenuState(!isOpen);
  });
}

if (contrastBtn) {
  contrastBtn.addEventListener('click', () => {
    applyContrast(contrast === 'normal' ? 'high' : 'normal');
  });
}

if (fontBtn) {
  fontBtn.addEventListener('click', () => {
    applyFontScale(fontScale === 'normal' ? 'large' : 'normal');
  });
}

document.addEventListener('click', (event) => {
  if (!accessibilityToggle || !accessibilityMenu) {
    return;
  }

  if (accessibilityToggle.contains(event.target) || accessibilityMenu.contains(event.target)) {
    return;
  }

  setAccessibilityMenuState(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setAccessibilityMenuState(false);
  }
});

if (revealTargets.length > 0) {
  revealTargets.forEach((element, index) => {
    element.classList.add('reveal-on-scroll');
    element.classList.add(`reveal-delay-${(index % 3) + 1}`);
  });

  const markVisibleIfInViewport = (element) => {
    const rect = element.getBoundingClientRect();
    const visibleThreshold = window.innerHeight * 0.92;

    if (rect.top < visibleThreshold && rect.bottom > 0) {
      element.classList.add('is-visible');
      return true;
    }

    return false;
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px'
  });

  revealTargets.forEach((element) => {
    if (markVisibleIfInViewport(element)) {
      return;
    }

    revealObserver.observe(element);
  });
}

updateControlState();
setAccessibilityMenuState(false);
applyLanguage(lang);
