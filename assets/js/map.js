/**
 * Construction Site Dashboard
 * Map Module - Handles map functionality using Leaflet.js
 */

const MAP = (() => {
    // Private variables
    let _map = null;
    let _markers = [];
    let _userLocationMarker = null;
    
    /**
     * Initialize the map
     */
    function init() {
        // Get map container
        const mapContainer = document.getElementById('siteMap');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }
        
        // Create map
        _map = L.map('siteMap').setView(CONFIG.map.defaultCenter, CONFIG.map.defaultZoom);
        
        // Add tile layer
        L.tileLayer(CONFIG.map.tileLayer, {
            attribution: CONFIG.map.attribution,
            maxZoom: 19
        }).addTo(_map);
        
        // Add scale control
        L.control.scale().addTo(_map);
        
        console.log('Map initialized');
    }
    
    /**
     * Update site markers on the map
     * @param {Array} sitesData - Array of site data
     */
    function updateSiteMarkers(sitesData) {
        // Check if map is initialized
        if (!_map) {
            console.error('Map not initialized');
            return;
        }
        
        // Clear existing markers
        clearMarkers();
        
        // Add markers for each site
        sitesData.forEach(site => {
            addSiteMarker(site);
        });
        
        // Fit map to markers if there are any
        if (_markers.length > 0) {
            const group = new L.featureGroup(_markers);
            _map.fitBounds(group.getBounds(), { padding: [30, 30] });
        }
    }
    
    /**
     * Add a marker for a site
     * @param {Object} site - Site data
     */
    function addSiteMarker(site) {
        // Check if site has location
        if (!site.location) {
            console.warn(`Site ${site.id} has no location`);
            return;
        }
        
        // Parse location if it's a string
        let lat, lng;
        if (typeof site.location === 'string') {
            const parts = site.location.split(',');
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
        } else if (Array.isArray(site.location)) {
            [lat, lng] = site.location;
        } else {
            console.warn(`Invalid location format for site ${site.id}`);
            return;
        }
        
        // Check if location is valid
        if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Invalid location for site ${site.id}`);
            return;
        }
        
        // Determine marker color based on progress
        const progress = site.progress || 0;
        let markerColor;
        
        if (progress <= CONFIG.ui.progressThresholds.red) {
            markerColor = '#e74c3c'; // Red
        } else if (progress <= CONFIG.ui.progressThresholds.yellow) {
            markerColor = '#f39c12'; // Yellow
        } else {
            markerColor = '#2ecc71'; // Green
        }
        
        // Create marker
        const marker = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: markerColor,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
        });
        
        // Add popup
        marker.bindPopup(`
            <div class="map-popup">
                <h3>${site.name}</h3>
                <p><strong>Progress:</strong> ${progress}%</p>
                <p><strong>Manager:</strong> ${site.manager || 'N/A'}</p>
                <p><strong>Start Date:</strong> ${formatDate(site.startDate)}</p>
                <p><strong>Target Date:</strong> ${formatDate(site.targetDate)}</p>
                <div class="popup-actions">
                    <button class="btn btn-sm btn-primary view-site-btn" data-site-id="${site.id}">View Details</button>
                </div>
            </div>
        `);
        
        // Add marker to map
        marker.addTo(_map);
        
        // Add marker to array
        _markers.push(marker);
        
        // Add click event to view site button
        marker.on('popupopen', () => {
            const viewSiteBtn = document.querySelector(`.view-site-btn[data-site-id="${site.id}"]`);
            if (viewSiteBtn) {
                viewSiteBtn.addEventListener('click', () => {
                    // Set site filter to this site
                    const siteFilter = document.getElementById('siteFilter');
                    if (siteFilter) {
                        siteFilter.value = site.id;
                        siteFilter.dispatchEvent(new Event('change'));
                    }
                });
            }
        });
    }
    
    /**
     * Clear all markers from the map
     */
    function clearMarkers() {
        // Remove each marker from the map
        _markers.forEach(marker => {
            marker.remove();
        });
        
        // Clear markers array
        _markers = [];
    }
    
    /**
     * Center the map on the user's location
     */
    function centerOnUserLocation() {
        // Check if map is initialized
        if (!_map) {
            console.error('Map not initialized');
            return;
        }
        
        // Check if geolocation is available
        if (!navigator.geolocation) {
            UI.showNotification('Geolocation is not supported by your browser', 'error');
            return;
        }
        
        // Show loading notification
        UI.showNotification('Getting your location...', 'info');
        
        // Get current position
        navigator.geolocation.getCurrentPosition(
            // Success callback
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Center map on user location
                _map.setView([lat, lng], 15);
                
                // Add or update user location marker
                if (_userLocationMarker) {
                    _userLocationMarker.setLatLng([lat, lng]);
                } else {
                    _userLocationMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '<div class="user-location-dot"></div><div class="user-location-pulse"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(_map);
                }
                
                UI.showNotification('Location found', 'success');
            },
            // Error callback
            (error) => {
                console.error('Error getting location:', error);
                
                let errorMessage = 'Unable to get your location';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }
                
                UI.showNotification(errorMessage, 'error');
            },
            // Options
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    /**
     * Format a date string
     * @param {string} dateString - Date string to format
     * @returns {string} - Formatted date string
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }
    
    // Public API
    return {
        init,
        updateSiteMarkers,
        centerOnUserLocation
    };
})();