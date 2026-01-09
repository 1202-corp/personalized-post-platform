/**
 * MiniApp Configuration
 * 
 * For production: API_BASE_URL should point to the core-api service
 * This can be configured via environment variables during build
 * or through a reverse proxy (nginx) that routes /api/* to the backend
 */

// Default configuration - can be overridden by query params or env
const CONFIG = {
    // API base URL - in production, use nginx to proxy /api/* to mock-core-api:8000
    // For local development without proxy, use absolute URL
    API_BASE_URL: window.MINIAPP_API_URL || '/api/v1',
    
    // Media endpoint for fetching photos from user-bot
    MEDIA_BASE_URL: window.MINIAPP_MEDIA_URL || '/media',
    
    // Swipe gesture settings
    SWIPE_THRESHOLD: 100,
    ROTATION_FACTOR: 0.1,
    
    // Default language
    DEFAULT_LANGUAGE: 'en',
};

// Parse URL parameters to override config
(function parseUrlConfig() {
    const params = new URLSearchParams(window.location.search);
    
    // Allow API URL override via query param (for development)
    const apiUrl = params.get('api_url');
    if (apiUrl) {
        CONFIG.API_BASE_URL = apiUrl;
    }
    
    // Allow media URL override
    const mediaUrl = params.get('media_url');
    if (mediaUrl) {
        CONFIG.MEDIA_BASE_URL = mediaUrl;
    }
})();

// Export for use in other scripts
window.APP_CONFIG = CONFIG;
