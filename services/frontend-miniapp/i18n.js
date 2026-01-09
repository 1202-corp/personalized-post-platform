/**
 * MiniApp Internationalization (i18n)
 * Supports English and Russian languages
 */

const TRANSLATIONS = {
    en: {
        // Header
        title: 'Rate Posts',
        
        // Progress
        progress: '{current} / {total}',
        
        // Loading state
        loading: 'Loading posts...',
        
        // Empty state
        emptyTitle: 'All Done!',
        emptyText: 'You\'ve rated all available posts. Click the button below to finish training.',
        finishButton: 'Finish Training',
        
        // Instructions
        instructions: 'Swipe right to like, left to dislike',
        
        // Buttons
        likeBtn: 'Like',
        dislikeBtn: 'Dislike', 
        skipBtn: 'Skip',
        
        // Card
        unknownChannel: 'Unknown Channel',
        mediaContent: '[Media content]',
        
        // Errors
        errorLoading: 'Error loading posts. Please try again.',
    },
    
    ru: {
        // Header
        title: 'Оцени посты',
        
        // Progress
        progress: '{current} / {total}',
        
        // Loading state
        loading: 'Загружаем посты...',
        
        // Empty state
        emptyTitle: 'Готово!',
        emptyText: 'Ты оценил(а) все доступные посты. Нажми кнопку ниже, чтобы завершить обучение.',
        finishButton: 'Завершить обучение',
        
        // Instructions
        instructions: 'Свайп вправо — нравится, влево — не нравится',
        
        // Buttons
        likeBtn: 'Нравится',
        dislikeBtn: 'Не нравится',
        skipBtn: 'Пропустить',
        
        // Card
        unknownChannel: 'Неизвестный канал',
        mediaContent: '[Медиа контент]',
        
        // Errors
        errorLoading: 'Ошибка загрузки постов. Попробуй ещё раз.',
    }
};

// Current language
let currentLanguage = 'en';

/**
 * Initialize i18n with detected or specified language
 * @param {string} lang - Language code ('en' or 'ru')
 */
function initI18n(lang) {
    if (TRANSLATIONS[lang]) {
        currentLanguage = lang;
    } else {
        currentLanguage = 'en';
    }
    applyTranslations();
}

/**
 * Get translation for a key with optional interpolation
 * @param {string} key - Translation key
 * @param {object} params - Parameters for interpolation
 * @returns {string} Translated string
 */
function t(key, params = {}) {
    const translations = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    let text = translations[key] || TRANSLATIONS.en[key] || `[${key}]`;
    
    // Replace placeholders like {current} with values
    for (const [param, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
    }
    
    return text;
}

/**
 * Apply translations to DOM elements with data-i18n attribute
 */
function applyTranslations() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    
    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}

/**
 * Detect language from various sources
 * Priority: URL param > Telegram user language > browser language > default
 * @returns {string} Detected language code
 */
function detectLanguage() {
    // 1. Check URL parameter
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang && TRANSLATIONS[urlLang]) {
        return urlLang;
    }
    
    // 2. Check Telegram user language
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.language_code) {
        const tgLang = tg.initDataUnsafe.user.language_code.toLowerCase();
        // Map language codes (e.g., 'ru-RU' -> 'ru')
        const shortLang = tgLang.split('-')[0];
        if (TRANSLATIONS[shortLang]) {
            return shortLang;
        }
    }
    
    // 3. Check browser language
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang && TRANSLATIONS[browserLang]) {
        return browserLang;
    }
    
    // 4. Default to English
    return 'en';
}

/**
 * Get current language code
 * @returns {string} Current language code
 */
function getCurrentLanguage() {
    return currentLanguage;
}

// Export functions
window.i18n = {
    init: initI18n,
    t: t,
    detect: detectLanguage,
    apply: applyTranslations,
    getCurrentLanguage: getCurrentLanguage,
};
