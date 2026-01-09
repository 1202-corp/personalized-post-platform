/**
 * Personalized Post Bot - Training MiniApp
 * Tinder-like swipe interface for rating posts
 */

// Telegram WebApp instance
const tg = window.Telegram.WebApp;

// Configuration from config.js
const config = window.APP_CONFIG || {
    API_BASE_URL: '/api/v1',
    MEDIA_BASE_URL: '/media',
    SWIPE_THRESHOLD: 100,
    ROTATION_FACTOR: 0.1,
};

// State
let posts = [];
let currentIndex = 0;
let ratedCount = 0;
let userId = null;
let userLanguage = 'en';
let isLoading = true;
let startX = 0;
let startY = 0;
let currentX = 0;
let isDragging = false;

// DOM Elements
const cardContainer = document.getElementById('cardContainer');
const cardTemplate = document.getElementById('cardTemplate');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const instructions = document.getElementById('instructions');

// Initialize app
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Initialize Telegram WebApp
    tg.ready();
    tg.expand();
    
    // Prevent closing on vertical swipe (Telegram 7.7+)
    if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
    }
    
    // Request fullscreen if available (Telegram 8.0+)
    if (tg.requestFullscreen) {
        try {
            tg.requestFullscreen();
        } catch (e) {
            console.log('Fullscreen not available');
        }
    }
    
    // Apply Telegram theme
    applyTheme();
    
    // Initialize i18n
    userLanguage = window.i18n?.detect() || 'en';
    window.i18n?.init(userLanguage);
    
    // Get user data - try multiple sources
    userId = getUserId();
    
    // Setup main button with localized text
    const finishText = window.i18n?.t('finishButton') || 'Finish Training';
    tg.MainButton.setText(finishText);
    tg.MainButton.onClick(finishTraining);
    
    // Update loading text
    const loadingText = document.querySelector('#loading p');
    if (loadingText && window.i18n) {
        loadingText.textContent = window.i18n.t('loading');
    }
    
    // Load posts
    await loadPosts();
}

/**
 * Get user ID from various sources
 * Priority: Telegram initData > URL parameter > null
 */
function getUserId() {
    // 1. Try Telegram initDataUnsafe
    if (tg.initDataUnsafe?.user?.id) {
        return tg.initDataUnsafe.user.id;
    }
    
    // 2. Try URL parameter (fallback for development/testing)
    const params = new URLSearchParams(window.location.search);
    const urlUserId = params.get('user_id');
    if (urlUserId && !isNaN(parseInt(urlUserId))) {
        console.warn('Using user_id from URL parameter (development mode)');
        return parseInt(urlUserId);
    }
    
    // 3. No user ID available
    console.warn('No user ID available - using mock mode');
    return null;
}

function applyTheme() {
    // Apply Telegram theme colors
    const root = document.documentElement;
    
    if (tg.themeParams.bg_color) {
        root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
    }
    if (tg.themeParams.text_color) {
        root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
    }
    if (tg.themeParams.hint_color) {
        root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
    }
    if (tg.themeParams.link_color) {
        root.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
    }
    if (tg.themeParams.button_color) {
        root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
    }
    if (tg.themeParams.button_text_color) {
        root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color);
    }
    if (tg.themeParams.secondary_bg_color) {
        root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color);
    }
}

async function loadPosts() {
    try {
        // If we don't know the user (e.g. running outside Telegram), use mock data only
        if (!userId) {
            posts = getMockPosts();
        } else {
            // Check if specific channel is provided (bonus channel training)
            const params = new URLSearchParams(window.location.search);
            const specificChannel = params.get('channel');
            const channelsParam = params.get('channels'); // comma-separated list
            
            let channelUsernames;
            
            if (specificChannel) {
                // Single bonus channel
                channelUsernames = [`@${specificChannel}`];
            } else if (channelsParam) {
                // Specific channels passed (for retraining)
                channelUsernames = channelsParam.split(',').map(ch => ch.trim().startsWith('@') ? ch.trim() : `@${ch.trim()}`);
            } else {
                // Fetch user's channels from API
                try {
                    const channelsResponse = await fetch(`${config.API_BASE_URL}/channels/user/${userId}`);
                    if (channelsResponse.ok) {
                        const userChannels = await channelsResponse.json();
                        channelUsernames = userChannels.map(ch => `@${ch.username}`);
                    }
                } catch (e) {
                    console.warn('Failed to fetch user channels:', e);
                }
                
                // Fallback to defaults if no channels found
                if (!channelUsernames || channelUsernames.length === 0) {
                    channelUsernames = ['@durov', '@telegram'];
                }
            }
            
            // Fetch posts from API
            const response = await fetch(`${config.API_BASE_URL}/posts/training`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_telegram_id: userId,
                    channel_usernames: channelUsernames,
                    posts_per_channel: 7,
                }),
            });
            
            if (response.ok) {
                posts = await response.json();
            } else {
                console.error(`API returned ${response.status}`);
                posts = [];
            }
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        posts = [];
    }
    
    isLoading = false;
    loading.style.display = 'none';
    
    if (posts.length === 0) {
        showEmptyState();
    } else {
        renderCurrentCard();
        updateProgress();
        // Prefetch in background after small delay to not block first render
        setTimeout(() => prefetchAllImages(), 100);
    }
}

function getMockPosts() {
    return [
        {
            id: 1,
            channel_title: 'Tech News',
            text: 'Breaking: New AI model achieves human-level performance on complex reasoning tasks. This marks a significant milestone in artificial intelligence research.',
        },
        {
            id: 2,
            channel_title: 'Daily Digest',
            text: 'Top 5 productivity tips for remote workers:\n\n1. Set clear boundaries\n2. Take regular breaks\n3. Create a dedicated workspace\n4. Use time-blocking\n5. Stay connected with your team',
        },
        {
            id: 3,
            channel_title: 'Science Today',
            text: 'Researchers discover new species in the deep ocean. The creature, found at depths of over 3,000 meters, exhibits unique bioluminescent properties.',
        },
        {
            id: 4,
            channel_title: 'Finance Updates',
            text: 'Market analysis: Global stocks rally as inflation concerns ease. Experts predict continued growth through the quarter.',
        },
        {
            id: 5,
            channel_title: 'Health & Wellness',
            text: 'New study reveals the benefits of morning exercise for mental health. Participants reported improved mood and focus throughout the day.',
        },
    ];
}

function renderCurrentCard() {
    // Clear existing cards
    const existingCards = cardContainer.querySelectorAll('.card:not(#cardTemplate)');
    existingCards.forEach(card => card.remove());
    
    if (currentIndex >= posts.length) {
        showEmptyState();
        return;
    }
    
    const post = posts[currentIndex];
    const card = createCard(post);
    cardContainer.appendChild(card);
    
    // Setup event listeners
    setupCardEvents(card);
}

function createCard(post) {
    const card = cardTemplate.cloneNode(true);
    card.id = `card-${post.id}`;
    card.classList.remove('hidden');
    card.dataset.postId = post.id;
    
    // Set content with i18n fallback and link to original post
    const unknownChannel = window.i18n?.t('unknownChannel') || 'Unknown Channel';
    const sourceLink = card.querySelector('.source-name');
    sourceLink.textContent = post.channel_title || unknownChannel;
    
    // Build link to original post
    const channelUsername = (post.channel_username || '').replace('@', '');
    const messageId = post.telegram_message_id;
    if (channelUsername && messageId) {
        sourceLink.href = `https://t.me/${channelUsername}/${messageId}`;
    } else if (channelUsername) {
        sourceLink.href = `https://t.me/${channelUsername}`;
    } else {
        sourceLink.removeAttribute('href');
    }

    const carousel = card.querySelector('.card-carousel');
    const track = card.querySelector('.carousel-track');
    const dotsContainer = card.querySelector('.carousel-dots');
    const prevBtn = card.querySelector('.carousel-prev');
    const nextBtn = card.querySelector('.carousel-next');

    if (carousel && track && (post.media_type === 'photo' || post.media_type === 'video') && post.media_file_id && post.channel_username) {
        const imageIds = String(post.media_file_id).split(',').map(id => id.trim()).filter(id => id);
        if (imageIds.length > 0) {
            track.innerHTML = '';
            dotsContainer.innerHTML = '';
            let currentSlide = 0;
            
            imageIds.forEach((imgId, index) => {
                const mediaUrl = getMediaUrl(post, imgId);
                
                // Create slide container with placeholder
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                
                // Add loading placeholder
                const placeholder = document.createElement('div');
                placeholder.className = 'media-placeholder';
                slide.appendChild(placeholder);
                
                // Create media element
                const media = document.createElement(post.media_type === 'video' ? 'video' : 'img');
                media.alt = 'Post image';
                
                if (post.media_type === 'video') {
                    media.controls = true;
                    media.muted = true;
                    media.playsInline = true;
                    media.src = mediaUrl;
                    media.onloadeddata = () => {
                        media.classList.add('loaded');
                        placeholder.remove();
                    };
                } else {
                    // Check if already cached
                    if (mediaCache.has(mediaUrl)) {
                        media.src = mediaUrl;
                        media.classList.add('loaded');
                        placeholder.remove();
                    } else {
                        // Load with fade-in effect
                        media.onload = () => {
                            media.classList.add('loaded');
                            placeholder.remove();
                            mediaCache.add(mediaUrl);
                        };
                        media.onerror = () => {
                            console.error('Failed to load image:', mediaUrl);
                            placeholder.innerHTML = '❌';
                        };
                        media.src = mediaUrl;
                    }
                }
                
                slide.appendChild(media);
                track.appendChild(slide);
                
                // Add dot
                const dot = document.createElement('div');
                dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    goToSlide(index);
                });
                dotsContainer.appendChild(dot);
            });
            
            // Hide arrows if only 1 image
            if (imageIds.length <= 1) {
                prevBtn.classList.add('hidden');
                nextBtn.classList.add('hidden');
                dotsContainer.style.display = 'none';
            }
            
            const goToSlide = (index) => {
                currentSlide = index;
                track.style.transform = `translateX(-${index * 100}%)`;
                dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
                    d.classList.toggle('active', i === index);
                });
            };
            
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentSlide > 0) goToSlide(currentSlide - 1);
            });
            
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentSlide < imageIds.length - 1) goToSlide(currentSlide + 1);
            });
            
            carousel.classList.remove('hidden');
        } else {
            carousel.classList.add('hidden');
        }
    } else if (carousel) {
        carousel.classList.add('hidden');
    }

    const mediaContent = window.i18n?.t('mediaContent') || '[Media content]';
    card.querySelector('.card-text').textContent = post.text || mediaContent;
    
    // Setup action buttons
    const buttons = card.querySelectorAll('.btn-action');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            handleAction(action, card);
        });
    });
    
    return card;
}

function setupCardEvents(card) {
    // Touch events
    card.addEventListener('touchstart', handleTouchStart, { passive: true });
    card.addEventListener('touchmove', handleTouchMove, { passive: false });
    card.addEventListener('touchend', handleTouchEnd);
    
    // Mouse events (for desktop testing)
    card.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

let touchStartedInContent = false;
let isScrolling = null;

function handleTouchStart(e) {
    const touch = e.touches[0];
    const content = e.target.closest('.card-content');
    touchStartedInContent = !!content;
    isScrolling = null;
    startDrag(touch.clientX, touch.clientY, e.target.closest('.card'));
}

function handleTouchMove(e) {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startX);
    const deltaY = Math.abs(touch.clientY - startY);
    
    // Determine scroll direction on first significant move
    if (isScrolling === null && (deltaX > 5 || deltaY > 5)) {
        isScrolling = deltaY > deltaX;
    }
    
    // If scrolling vertically inside content, allow native scroll
    if (touchStartedInContent && isScrolling) {
        isDragging = false;
        activeCard = null;
        return;
    }
    
    // Horizontal swipe - prevent default and handle card drag
    e.preventDefault();
    updateDrag(touch.clientX, touch.clientY);
}

function handleTouchEnd() {
    touchStartedInContent = false;
    isScrolling = null;
    endDrag();
}

function handleMouseDown(e) {
    startDrag(e.clientX, e.clientY, e.target.closest('.card'));
}

function handleMouseMove(e) {
    if (!isDragging) return;
    updateDrag(e.clientX, e.clientY);
}

function handleMouseUp() {
    endDrag();
}

let activeCard = null;

function startDrag(x, y, card) {
    if (!card || card.id === 'cardTemplate') return;
    
    isDragging = true;
    activeCard = card;
    startX = x;
    startY = y;
    currentX = 0;
    
    card.style.transition = 'none';
}

function updateDrag(x, y) {
    if (!isDragging || !activeCard) return;
    
    currentX = x - startX;
    const rotation = currentX * config.ROTATION_FACTOR;
    
    activeCard.style.transform = `translateX(${currentX}px) rotate(${rotation}deg)`;
    
    // Update visual feedback
    if (currentX > config.SWIPE_THRESHOLD / 2) {
        activeCard.style.boxShadow = `0 4px 20px rgba(76, 175, 80, 0.3)`;
    } else if (currentX < -config.SWIPE_THRESHOLD / 2) {
        activeCard.style.boxShadow = `0 4px 20px rgba(244, 67, 54, 0.3)`;
    } else {
        activeCard.style.boxShadow = '';
    }
}

function endDrag() {
    if (!isDragging || !activeCard) return;
    
    isDragging = false;
    activeCard.style.transition = '';
    activeCard.style.boxShadow = '';
    
    if (currentX > config.SWIPE_THRESHOLD) {
        handleAction('like', activeCard);
    } else if (currentX < -config.SWIPE_THRESHOLD) {
        handleAction('dislike', activeCard);
    } else {
        // Reset position
        activeCard.style.transform = '';
    }
    
    activeCard = null;
}

async function handleAction(action, card) {
    const postId = parseInt(card.dataset.postId);
    
    // Animate card off screen
    if (action === 'like') {
        card.classList.add('swiping-right');
        tg.HapticFeedback.impactOccurred('light');
    } else if (action === 'dislike') {
        card.classList.add('swiping-left');
        tg.HapticFeedback.impactOccurred('light');
    } else {
        card.classList.add('swiping-up');
    }
    
    // Send interaction to API
    if (action !== 'skip') {
        await sendInteraction(postId, action);
    }
    
    // Wait for animation
    setTimeout(() => {
        currentIndex++;
        updateProgress();
        renderCurrentCard();
        // Preload next post's images
        preloadNextPost();
    }, 300);
}

async function sendInteraction(postId, interactionType) {
    try {
        if (!userId) {
            return;
        }
        // Send interaction to API (don't await to keep UI responsive)
        fetch(`${config.API_BASE_URL}/posts/interactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_telegram_id: userId,
                post_id: postId,
                interaction_type: interactionType,
            }),
        }).catch(err => console.warn('Interaction API error:', err));
        
        // Track rated count locally
        ratedCount++;
    } catch (error) {
        console.error('Error sending interaction:', error);
    }
}

function updateProgress() {
    const total = posts.length;
    const current = Math.min(currentIndex, total);
    const percent = total > 0 ? (current / total) * 100 : 0;
    
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${current} / ${total}`;
}

function showEmptyState() {
    emptyState.classList.remove('hidden');
    instructions.style.display = 'none';
    
    // Update empty state text with i18n
    const emptyTitle = emptyState.querySelector('h2');
    const emptyText = emptyState.querySelector('p');
    
    if (emptyTitle && window.i18n) {
        emptyTitle.textContent = window.i18n.t('emptyTitle');
    }
    if (emptyText && window.i18n) {
        emptyText.textContent = window.i18n.t('emptyText');
    }
    
    tg.MainButton.show();
}

async function finishTraining() {
    // Disable button to prevent double-click
    tg.MainButton.disable();
    tg.MainButton.showProgress();
    
    // First, notify backend that training is complete (reliable method)
    if (userId) {
        try {
            await fetch(`${config.API_BASE_URL}/users/${userId}/training-complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rated_count: ratedCount }),
            });
        } catch (e) {
            console.warn('Failed to notify backend:', e);
        }
    }
    
    // Try sendData (works on desktop, may fail on some mobile)
    try {
        tg.sendData(JSON.stringify({
            action: 'training_complete',
            rated_count: ratedCount,
            user_id: userId,
        }));
    } catch (e) {
        console.warn('sendData failed:', e);
    }
    
    // Small delay before close to ensure data is sent
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Close the WebApp
    tg.close();
}

// Media cache for preloaded images
const mediaCache = new Map();

// Preload a single image and cache it
function preloadImage(url) {
    if (mediaCache.has(url)) {
        return mediaCache.get(url);
    }
    
    const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(url);
        img.src = url;
    });
    
    mediaCache.set(url, promise);
    return promise;
}

// Get media URL for a post
function getMediaUrl(post, mediaId) {
    const endpoint = post.media_type === 'video' ? 'video' : 'photo';
    return `${config.MEDIA_BASE_URL}/${endpoint}?channel_username=${encodeURIComponent(post.channel_username)}&message_id=${encodeURIComponent(mediaId)}`;
}

// Prefetch images with priority - current and next few first
function prefetchAllImages() {
    // Priority order: current post, next 2 posts, then rest
    const priorityOrder = [];
    
    // Add current and next posts first
    for (let i = currentIndex; i < Math.min(currentIndex + 3, posts.length); i++) {
        priorityOrder.push(posts[i]);
    }
    
    // Add remaining posts
    for (let i = 0; i < posts.length; i++) {
        if (i < currentIndex || i >= currentIndex + 3) {
            priorityOrder.push(posts[i]);
        }
    }
    
    // Preload in priority order
    priorityOrder.forEach((post, idx) => {
        if ((post.media_type === 'photo') && post.media_file_id && post.channel_username) {
            const mediaIds = String(post.media_file_id).split(',').map(id => id.trim()).filter(id => id);
            mediaIds.forEach(mediaId => {
                const url = getMediaUrl(post, mediaId);
                // Stagger preloading to avoid overwhelming the network
                setTimeout(() => preloadImage(url), idx * 50);
            });
        }
    });
}

// Preload next post's images when current card is shown
function preloadNextPost() {
    const nextIndex = currentIndex + 1;
    if (nextIndex < posts.length) {
        const post = posts[nextIndex];
        if ((post.media_type === 'photo') && post.media_file_id && post.channel_username) {
            const mediaIds = String(post.media_file_id).split(',').map(id => id.trim()).filter(id => id);
            mediaIds.forEach(mediaId => {
                preloadImage(getMediaUrl(post, mediaId));
            });
        }
    }
}
