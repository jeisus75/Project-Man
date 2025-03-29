/**
 * Construction Site Dashboard
 * Configuration Settings
 */

const CONFIG = {
    // API Endpoints
    api: {
        // Google Apps Script Web App URL that serves as middleware
        sheetsEndpoint: 'https://script.google.com/macros/s/AKfycbyduKCII53kglAFMJDD_6X-k2sj57dBZcpPP6amj3ibRATflzr15O8KAJfIEb865C5_/exec',
        
        // Refresh interval in milliseconds (30 seconds)
        refreshInterval: 30000,
        
        // Maximum age of cached data in milliseconds (1 hour)
        maxCacheAge: 3600000
    },
    
    // Google Sheets Configuration
    sheets: {
        // Sheet IDs for different data types
        sheetIds: {
            sites: '0',           // First sheet - Sites information
            progress: '1',        // Second sheet - Progress updates
            equipment: '2',       // Third sheet - Equipment tracking
            issues: '3',          // Fourth sheet - Issues reported
            photos: '4'           // Fifth sheet - Photo metadata
        },
        
        // Column mappings for each sheet
        columns: {
            sites: {
                id: 'A',
                name: 'B',
                location: 'C',    // Format: "latitude,longitude"
                manager: 'D',
                startDate: 'E',
                targetDate: 'F',
                status: 'G'
            },
            progress: {
                timestamp: 'A',
                siteId: 'B',
                percentage: 'C',
                notes: 'D',
                reportedBy: 'E'
            },
            equipment: {
                id: 'A',
                name: 'B',
                type: 'C',
                currentSite: 'D',
                status: 'E',      // Available, In Use, Maintenance
                lastUpdated: 'F',
                qrCode: 'G'       // URL or data for QR code
            },
            issues: {
                timestamp: 'A',
                siteId: 'B',
                description: 'C',
                severity: 'D',    // Low, Medium, High
                status: 'E',      // Open, In Progress, Resolved
                reportedBy: 'F'
            },
            photos: {
                timestamp: 'A',
                siteId: 'B',
                url: 'C',
                caption: 'D',
                takenBy: 'E'
            }
        }
    },
    
    // Telegram Bot Configuration
    telegram: {
        botName: '@ConstructionSiteBot',
        botToken: 'YOUR_TELEGRAM_BOT_TOKEN',
        
        // Commands supported by the bot
        commands: {
            progress: '/progress [site] [%]',
            photo: '/photo [site]',
            equipment: '/where [equipment]',
            issue: '/issue [site] [description]',
            help: '/help'
        }
    },
    
    // Map Configuration
    map: {
        defaultCenter: [60.1699, 24.9384], // Helsinki coordinates
        defaultZoom: 10,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    
    // Storage Configuration
    storage: {
        // IndexedDB database name for offline storage
        dbName: 'constructionSiteDashboard',
        
        // IndexedDB stores (tables)
        stores: {
            sites: 'sites',
            progress: 'progress',
            equipment: 'equipment',
            issues: 'issues',
            photos: 'photos',
            updates: 'updates'
        },
        
        // Local storage keys
        keys: {
            lastSync: 'lastSyncTime',
            userSettings: 'userSettings'
        }
    },
    
    // PWA Configuration
    pwa: {
        appName: 'Construction Site Dashboard',
        shortName: 'Site Dashboard',
        themeColor: '#3498db',
        backgroundColor: '#f5f6fa',
        displayMode: 'standalone',
        orientation: 'any',
        iconSizes: [72, 96, 128, 144, 152, 192, 384, 512]
    },
    
    // UI Configuration
    ui: {
        // Progress bar color thresholds
        progressThresholds: {
            red: 30,      // 0-30% is red
            yellow: 70,   // 31-70% is yellow
            green: 100    // 71-100% is green
        },
        
        // Maximum number of photos to show in the gallery
        maxGalleryPhotos: 8,
        
        // Maximum number of updates to show in the feed
        maxUpdateItems: 5
    }
};

// Prevent modifications to the configuration
Object.freeze(CONFIG);