// ===========================
// COPY TO CLIPBOARD FUNCTIONALITY
// ===========================
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Skopiowano do schowka!', 'success');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showNotification('Skopiowano do schowka!', 'success');
    } catch (err) {
        showNotification('Nie udało się skopiować', 'error');
    }

    document.body.removeChild(textArea);
}

// ===========================
// NOTIFICATION SYSTEM
// ===========================
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;

    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
    `;

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    return colors[type] || colors.info;
}

// ===========================
// SMOOTH SCROLLING
// ===========================
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ===========================
// BACK TO TOP BUTTON
// ===========================
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
}

// ===========================
// HEADER SCROLL EFFECT
// ===========================
function initHeaderScroll() {
    const header = document.querySelector('.header');
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.backdropFilter = 'blur(10px)';
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
            header.style.boxShadow = 'none';
        }

        lastScrollTop = scrollTop;
    });
}

// ===========================
// NAVIGATION HIGHLIGHTING
// ===========================
function initNavigationHighlight() {
    const navLinks = document.querySelectorAll('.nav a');
    const sections = document.querySelectorAll('section[id]');

    function updateActiveNav() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav(); // Initial call
}

// ===========================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ===========================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .requirement-item, .setup-card, .faq-item, .step');

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
}

// ===========================
// COPY BUTTON ENHANCEMENT
// ===========================
function initCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');

    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const codeBlock = btn.parentElement;
            const code = codeBlock.querySelector('code');
            const text = code.textContent;

            copyToClipboard(text);

            // Visual feedback
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.background = 'rgba(40, 167, 69, 0.8)';

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
            }, 2000);
        });
    });
}

// ===========================
// MOBILE MENU (if needed)
// ===========================
function initMobileMenu() {
    // Add mobile menu toggle if screen is small
    if (window.innerWidth <= 768) {
        const nav = document.querySelector('.nav');
        const headerContent = document.querySelector('.header-content');

        // Create mobile menu button
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        mobileMenuBtn.style.cssText = `
            display: block;
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--primary-color);
            cursor: pointer;
            padding: 8px;
        `;

        // Initially hide nav on mobile
        nav.style.display = 'none';

        // Add button to header
        headerContent.appendChild(mobileMenuBtn);

        // Toggle functionality
        mobileMenuBtn.addEventListener('click', () => {
            if (nav.style.display === 'none') {
                nav.style.display = 'flex';
                nav.style.flexDirection = 'column';
                nav.style.position = 'absolute';
                nav.style.top = '100%';
                nav.style.left = '0';
                nav.style.right = '0';
                nav.style.background = 'white';
                nav.style.padding = '1rem';
                nav.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                nav.style.display = 'none';
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // Close menu when clicking nav links
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.style.display = 'none';
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }
}

// ===========================
// EXTERNAL LINK HANDLING
// ===========================
function initExternalLinks() {
    const externalLinks = document.querySelectorAll('a[href^="http"]');

    externalLinks.forEach(link => {
        // Add external link icon if not already present
        if (!link.querySelector('.fas.fa-external-link-alt') && link.target === '_blank') {
            link.innerHTML += ' <i class="fas fa-external-link-alt" style="font-size: 0.8em; opacity: 0.7;"></i>';
        }

        // Add click tracking (optional)
        link.addEventListener('click', (e) => {
            // Analytics tracking could go here
            console.log('External link clicked:', link.href);
        });
    });
}

// ===========================
// FEATURE CARDS HOVER EFFECT
// ===========================
function initFeatureCards() {
    const featureCards = document.querySelectorAll('.feature-card');

    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// ===========================
// FAQ TOGGLE FUNCTIONALITY
// ===========================
function initFAQToggle() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const header = item.querySelector('h3');
        const answer = item.querySelector('.faq-answer');

        // Initially collapse all answers
        answer.style.maxHeight = '0';
        answer.style.overflow = 'hidden';
        answer.style.transition = 'max-height 0.3s ease-out';

        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            const isOpen = answer.style.maxHeight !== '0px';

            if (isOpen) {
                answer.style.maxHeight = '0';
            } else {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }

            // Rotate icon
            const icon = header.querySelector('i');
            if (icon) {
                icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
                icon.style.transition = 'transform 0.3s ease';
            }
        });
    });
}

// ===========================
// DOWNLOAD TRACKING
// ===========================
function initDownloadTracking() {
    const downloadButtons = document.querySelectorAll('a[href*=".zip"], a[href*="github.com"]');

    downloadButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const buttonText = button.textContent.trim();
            const href = button.href;

            console.log('Download/link clicked:', { buttonText, href });

            // You could send analytics data here
            // gtag('event', 'download', { 'file_name': href });

            // Show confirmation for downloads
            if (href.includes('.zip')) {
                showNotification('Pobieranie rozpoczęte! Sprawdź folder Pobrane.', 'success');
            }
        });
    });
}

// ===========================
// PERFORMANCE OPTIMIZATION
// ===========================
function initPerformanceOptimizations() {
    // Lazy load images
    const images = document.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }

    // Debounced scroll handler
    let scrollTimeout;
    const originalScrollHandler = window.onscroll;

    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(() => {
            if (originalScrollHandler) {
                originalScrollHandler();
            }
        }, 16); // ~60fps
    });
}

// ===========================
// FORM VALIDATION (if forms are added)
// ===========================
function initFormValidation() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const inputs = form.querySelectorAll('input[required], textarea[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#dc3545';
                    input.style.background = 'rgba(220, 53, 69, 0.1)';
                } else {
                    input.style.borderColor = '';
                    input.style.background = '';
                }
            });

            if (!isValid) {
                e.preventDefault();
                showNotification('Wypełnij wszystkie wymagane pola', 'error');
            }
        });
    });
}

// ===========================
// KEYBOARD SHORTCUTS
// ===========================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Escape key to close any open modals/menus
        if (e.key === 'Escape') {
            const mobileNav = document.querySelector('.nav');
            if (mobileNav && mobileNav.style.display !== 'none') {
                mobileNav.style.display = 'none';
                const menuBtn = document.querySelector('.mobile-menu-btn');
                if (menuBtn) {
                    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                }
            }
        }

        // Ctrl+/ or Cmd+/ to focus search (if search is added)
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
}

// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 Teams Automation website loaded');

    // Initialize all functionality
    initBackToTop();
    initHeaderScroll();
    initNavigationHighlight();
    initScrollAnimations();
    initCopyButtons();
    initMobileMenu();
    initExternalLinks();
    initFeatureCards();
    initFAQToggle();
    initDownloadTracking();
    initPerformanceOptimizations();
    initFormValidation();
    initKeyboardShortcuts();

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        .nav a.active {
            color: var(--primary-color) !important;
        }

        .nav a.active::after {
            width: 100% !important;
        }
    `;
    document.head.appendChild(style);

    // Welcome message
    setTimeout(() => {
        showNotification('Witaj na stronie Teams Automation! 🤖', 'info');
    }, 1000);
});

// ===========================
// ERROR HANDLING
// ===========================
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
    // Don't show error notifications to users in production
});

// ===========================
// RESIZE HANDLER
// ===========================
window.addEventListener('resize', () => {
    // Reinitialize mobile menu on resize
    if (window.innerWidth > 768) {
        const nav = document.querySelector('.nav');
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');

        if (nav) {
            nav.style.display = 'flex';
            nav.style.flexDirection = 'row';
            nav.style.position = 'static';
            nav.style.background = 'transparent';
            nav.style.padding = '0';
            nav.style.boxShadow = 'none';
        }

        if (mobileMenuBtn) {
            mobileMenuBtn.remove();
        }
    } else {
        initMobileMenu();
    }
});

// ===========================
// VERSION SELECTION MODAL
// ===========================

// Check for saved version preference
let selectedVersion = localStorage.getItem('selectedVersion');

// Show modal on first visit or if no version is saved
document.addEventListener('DOMContentLoaded', () => {
    if (!selectedVersion) {
        setTimeout(() => {
            showVersionModal();
        }, 1500); // Show after welcome animation
    } else {
        applyVersionPreference(selectedVersion);
    }
});

function showVersionModal() {
    const modal = document.getElementById('versionModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideVersionModal() {
    const modal = document.getElementById('versionModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function selectVersion(version) {
    selectedVersion = version;
    localStorage.setItem('selectedVersion', version);

    // Apply version preference
    applyVersionPreference(version);

    // Hide modal
    hideVersionModal();

    // Show confirmation
    const versionName = version === 'local' ? 'Local' : 'Firebase';
    showNotification(`✅ ${versionName} version selected! Instructions updated below.`, 'success');

    // Add version toggle button
    addVersionToggleButton();
}

function applyVersionPreference(version) {
    // Add version class to body
    document.body.className = document.body.className.replace(/version-\w+/g, '');
    document.body.classList.add(`version-${version}`);

    // Update installation instructions based on version
    updateInstallationInstructions(version);

    // Add version toggle button
    addVersionToggleButton();
}

function addVersionToggleButton() {
    // Remove existing button if any
    const existingBtn = document.querySelector('.version-toggle-button');
    if (existingBtn) {
        existingBtn.remove();
    }

    // Create new toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'version-toggle-button';
    toggleBtn.innerHTML = `<i class="fas fa-code-branch"></i> Switch Version`;
    toggleBtn.onclick = showVersionModal;

    document.body.appendChild(toggleBtn);
}

function updateInstallationInstructions(version) {
    // Update requirements section
    const requirementsSection = document.querySelector('#installation');
    if (requirementsSection) {
        const firebaseRequirement = requirementsSection.querySelector('.content-firebase');
        const localNote = requirementsSection.querySelector('.content-local');

        if (version === 'local') {
            if (firebaseRequirement) firebaseRequirement.style.display = 'none';
            if (localNote) localNote.style.display = 'block';
        } else {
            if (firebaseRequirement) firebaseRequirement.style.display = 'block';
            if (localNote) localNote.style.display = 'none';
        }
    }

    // Update terminal demo
    updateTerminalDemo(version);

    // Update download links
    updateDownloadLinks(version);
}

function updateTerminalDemo(version) {
    const terminalDemo = document.querySelector('.terminal-demo');
    if (terminalDemo && version === 'local') {
        terminalDemo.innerHTML = `
            <div class="terminal-line">
                <span class="prompt">teams-automation$</span>
                <span class="command">node local-joiner.js dashboard</span>
            </div>
            <div class="terminal-line">
                <span class="output success">🌐 Dashboard server started at http://localhost:3000</span>
            </div>
            <div class="terminal-line">
                <span class="output info">💾 Using local storage backend</span>
            </div>
            <div class="terminal-line">
                <span class="output success">✅ Ready to schedule meetings!</span>
            </div>
        `;
    }
}

function updateDownloadLinks(version) {
    const downloadSection = document.querySelector('#download');

    // Remove existing version notes
    const existingNotes = downloadSection?.querySelectorAll('.version-note');
    existingNotes?.forEach(note => note.remove());

    if (downloadSection && version === 'local') {
        // Add special note for local version
        const localNote = document.createElement('div');
        localNote.className = 'version-note local-version-note';
        localNote.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 25px;
            text-align: center;
        `;
        localNote.innerHTML = `
            <h3><i class="fas fa-star"></i> Local Version Selected</h3>
            <p>You're using the simplified local version! No Firebase setup required.</p>
            <p><strong>Quick Start:</strong> Download → Install Node.js → Run <code>node local-joiner.js dashboard</code></p>
            <div style="margin-top: 15px;">
                <a href="https://github.com/0xjaqbek/teams/archive/refs/heads/optional-firebase-local-storage.zip"
                   style="background: rgba(255,255,255,0.2); color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500;">
                    <i class="fas fa-download"></i> Download Local Version ZIP
                </a>
            </div>
        `;
        downloadSection.insertBefore(localNote, downloadSection.firstChild);
    } else if (downloadSection && version === 'firebase') {
        // Add special note for Firebase version
        const firebaseNote = document.createElement('div');
        firebaseNote.className = 'version-note firebase-version-note';
        firebaseNote.style.cssText = `
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 25px;
            text-align: center;
        `;
        firebaseNote.innerHTML = `
            <h3><i class="fas fa-cloud"></i> Firebase Version Selected</h3>
            <p>You're using the full-featured Firebase version with cloud capabilities.</p>
            <p><strong>Setup Required:</strong> Download → Install Node.js → Configure Firebase → Deploy</p>
            <div style="margin-top: 15px;">
                <a href="https://github.com/0xjaqbek/teams/archive/refs/heads/main.zip"
                   style="background: rgba(255,255,255,0.2); color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500;">
                    <i class="fas fa-download"></i> Download Firebase Version ZIP
                </a>
            </div>
        `;
        downloadSection.insertBefore(firebaseNote, downloadSection.firstChild);
    }
}

// Export functions for global access
window.copyToClipboard = copyToClipboard;
window.scrollToTop = scrollToTop;
window.showNotification = showNotification;
window.selectVersion = selectVersion;
window.showVersionModal = showVersionModal;