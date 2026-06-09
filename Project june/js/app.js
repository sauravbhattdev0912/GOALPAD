/* GoalPad Application Coordinator and Interactivity script */

// Global page loading transitions
document.addEventListener('click', e => {
  const link = e.target.closest('a[href]');
  if (link && link.href.includes('.html') && !link.href.includes('#')) {
    // Avoid intercepting download triggers or links that open in new tabs
    if (link.getAttribute('target') === '_blank' || link.getAttribute('download') !== null) {
      return;
    }
    e.preventDefault();
    document.body.classList.add('page-exit');
    setTimeout(() => {
      window.location.href = link.href;
    }, 250);
  }
});

window.addEventListener('load', () => {
  document.body.classList.add('page-enter');
  setTimeout(() => {
    document.body.classList.remove('page-enter');
  }, 300);
});

// Click ripples for buttons
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// Theme switcher
function toggleTheme(e) {
  const settings = getSettings();
  const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
  settings.theme = nextTheme;
  saveSettings(settings);
  
  // Create theme-change ripple at click coordinates if event exists
  if (e) {
    const ripple = document.createElement('div');
    ripple.className = 'theme-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }
  
  document.body.setAttribute('data-theme', nextTheme);
  
  // Rotate the settings cog/theme icon
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.classList.add('theme-icon-rotate');
    setTimeout(() => icon.classList.remove('theme-icon-rotate'), 400);
    
    // Toggle icon shapes
    if (nextTheme === 'light') {
      icon.className = 'fa-solid fa-moon';
    } else {
      icon.className = 'fa-solid fa-sun';
    }
  }
  
  // Inform Chart canvases to update grid lines colors
  if (typeof updateChartsTheme === 'function') {
    updateChartsTheme();
  }
}

// Translations controller: English / Hindi mappings
function toggleLanguage() {
  const settings = getSettings();
  const nextLang = settings.language === 'en' ? 'hi' : 'en';
  settings.language = nextLang;
  saveSettings(settings);
  
  applyLanguage(nextLang);
  
  // Set toggle button labels
  const btn = document.getElementById('langToggleBtn');
  if (btn) {
    btn.textContent = nextLang === 'en' ? 'हिन्दी (Hindi)' : 'English';
  }
}

function applyLanguage(lang) {
  // Elements translation
  document.querySelectorAll('[data-en]').forEach(el => {
    const text = lang === 'hi' ? el.getAttribute('data-hi') : el.getAttribute('data-en');
    
    // Check if element has child nodes (like icons) to avoid overwriting them
    const icon = el.querySelector('i');
    if (icon) {
      // Remove text nodes and append new translated text
      const iconHtml = icon.outerHTML;
      el.innerHTML = `${iconHtml} ${text}`;
    } else {
      el.textContent = text;
    }
  });
  
  // Placeholders translation
  document.querySelectorAll('[data-placeholder-en]').forEach(el => {
    el.placeholder = lang === 'hi' ? el.getAttribute('data-placeholder-hi') : el.getAttribute('data-placeholder-en');
  });
}

// Sidebar User details loader
function loadSidebarUser() {
  const user = getCurrentUser();
  
  const nameEls = document.querySelectorAll('.sidebar-user-name, .profile-display-name');
  const emailEls = document.querySelectorAll('.sidebar-user-email, .profile-display-email');
  const avatarContainers = document.querySelectorAll('.sidebar-avatar, .profile-display-avatar');
  
  if (user) {
    nameEls.forEach(el => el.textContent = user.fullName);
    emailEls.forEach(el => el.textContent = user.email);
    
    avatarContainers.forEach(container => {
      container.innerHTML = `<img src="${user.photo}" alt="${user.fullName}">`;
    });
  } else {
    nameEls.forEach(el => el.textContent = 'Guest User');
    emailEls.forEach(el => el.textContent = 'guest@goalpad.io');
    avatarContainers.forEach(container => {
      container.innerHTML = '<i class="fa-solid fa-user-circle" style="font-size: 2.2rem; color: var(--muted)"></i>';
    });
  }
}

// Apply theme settings on page start
function applySavedTheme() {
  const settings = getSettings();
  document.body.setAttribute('data-theme', settings.theme);
  
  const icon = document.getElementById('themeIcon');
  if (icon) {
    if (settings.theme === 'light') {
      icon.className = 'fa-solid fa-moon';
    } else {
      icon.className = 'fa-solid fa-sun';
    }
  }
}

// Apply language settings on page start
function applySavedLanguage() {
  const settings = getSettings();
  applyLanguage(settings.language);
  
  const btn = document.getElementById('langToggleBtn');
  if (btn) {
    btn.textContent = settings.language === 'en' ? 'हिन्दी (Hindi)' : 'English';
  }
}

// Page load card stagger reveal
function staggerCards() {
  document.querySelectorAll('.card, .goal-card, .stat-card, .reminder-item').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.08}s`;
    card.classList.add('card-reveal');
  });
}

// Numbers count-up animation
function animateCount(el, target, duration = 800) {
  if (!el) return;
  let start = 0;
  const end = parseInt(target, 10);
  
  if (isNaN(end) || start === end) {
    el.textContent = target;
    return;
  }
  
  const range = end - start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.max(Math.floor(duration / Math.abs(range)), 15);
  
  const timer = setInterval(() => {
    start += increment;
    el.textContent = start;
    if (start === end) {
      clearInterval(timer);
    }
  }, stepTime);
}

// Start and load all engines
document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  applySavedLanguage();
  loadSidebarUser();
  staggerCards();
  
  // Theme switcher toggle bind
  const themeToggle = document.getElementById('themeToggleBtn');
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => toggleTheme(e));
  }
  
  // Language switcher toggle bind
  const langToggle = document.getElementById('langToggleBtn');
  if (langToggle) {
    langToggle.addEventListener('click', toggleLanguage);
  }
});
