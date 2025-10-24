// Main Application
class BatangasJeepneySystem {
    constructor() {
        this.map = null;
        this.routeLayers = {};
        this.activeRoutes = [];
        this.currentLocationMarker = null;
        this.trafficLayer = null;
        this.currentRoutingService = 'https://router.project-osrm.org/route/v1/driving/';
        this.userLocation = null;
        
        this.init();
    }

    init() {
        this.initializeMap();
        this.initializeEventListeners();
        this.initializeUI();
        
        console.log('Batangas Jeepney System initialized');
    }

    initializeMap() {
        // Ensure map container has proper dimensions
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.height = '100vh';
            mapElement.style.width = '100%';
        }
        
        this.map = L.map('map').setView([13.7565, 121.0583], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Add key locations to map
        this.locationsLayer = L.layerGroup().addTo(this.map);
        Object.keys(allStops).forEach(location => {
            L.marker(allStops[location])
                .bindPopup(`<b>${location}</b>`)
                .addTo(this.locationsLayer);
        });

        L.control.scale().addTo(this.map);
    }

    initializeEventListeners() {
        // Search functionality
        document.getElementById('searchBox').addEventListener('input', (e) => {
            this.filterRoutes(e.target.value.toLowerCase());
        });

        // Time slider
        document.getElementById('timeSlider').addEventListener('input', (e) => {
            this.updateTimeDisplay(parseInt(e.target.value));
        });

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Location input suggestions
        document.getElementById('startLocation').addEventListener('input', (e) => {
            this.showSuggestions(e.target.value, 'startSuggestions');
        });

        document.getElementById('endLocation').addEventListener('input', (e) => {
            this.showSuggestions(e.target.value, 'endSuggestions');
        });

        // Click outside to close suggestions
        document.addEventListener('click', (e) => {
            if (!e.target.matches('#startLocation') && !e.target.matches('#startSuggestions *')) {
                document.getElementById('startSuggestions').style.display = 'none';
            }
            if (!e.target.matches('#endLocation') && !e.target.matches('#endSuggestions *')) {
                document.getElementById('endSuggestions').style.display = 'none';
            }
        });
    }

    initializeUI() {
        this.populateRoutesList();
        this.updateTimeDisplay(12);
        this.updateFavoritesList();
        this.updateStatistics();
    }

    showSuggestions(query, suggestionsId) {
        const suggestionsList = document.getElementById(suggestionsId);
        
        if (query.length < 2) {
            suggestionsList.style.display = 'none';
            return;
        }

        const filteredStops = Object.keys(allStops).filter(stop =>
            stop.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8);

        if (filteredStops.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        suggestionsList.innerHTML = filteredStops.map(stop => 
            `<div class="suggestion-item" onclick="app.selectSuggestion('${stop}', '${suggestionsId}')">${stop}</div>`
        ).join('');
        
        suggestionsList.style.display = 'block';
    }

    selectSuggestion(stopName, suggestionsId) {
        const field = suggestionsId === 'startSuggestions' ? 'startLocation' : 'endLocation';
        document.getElementById(field).value = stopName;
        document.getElementById(suggestionsId).style.display = 'none';
    }

    filterRoutes(searchTerm) {
        const routeItems = document.querySelectorAll('.route-item');
        
        routeItems.forEach(item => {
            const routeName = item.getAttribute('data-route').toLowerCase();
            if (routeName.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    updateTimeDisplay(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        document.getElementById('timeDisplay').textContent = `${displayHour}:00 ${period}`;
        
        // Recalculate ETA for active routes
        if (this.activeRoutes.length > 0) {
            this.activeRoutes.forEach(routeName => {
                const routeData = jeepneyRoutes[routeName];
                if (routeData) {
                    routeManager.createSnappedRoute(routeName, routeData);
                }
            });
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        
        sidebar.classList.toggle('collapsed');
        toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '☰' : '✕';
    }

    populateRoutesList() {
        const routesList = document.getElementById('routes-list');
        routesList.innerHTML = '';
        
        Object.entries(jeepneyRoutes).forEach(([routeName, routeData]) => {
            const routeItem = document.createElement('div');
            routeItem.className = 'route-item';
            routeItem.setAttribute('data-route', routeName);
            
            let colorName = "Other";
            if (routeData.color === "#ffeb3b") colorName = "Yellow";
            else if (routeData.color === "#f44336") colorName = "Red";
            else if (routeData.color === "#ffffff") colorName = "White";
            else if (routeData.color === "#ff9800") colorName = "Orange";
            else if (routeData.color === "#4caf50") colorName = "Green";
            else if (routeData.color === "#2196f3") colorName = "Blue";
            
            routeItem.innerHTML = `
                <div style="font-weight: bold;">${routeName}</div>
                <div class="route-info">
                    <span class="route-type-badge type-${routeData.type}">${routeData.type}</span>
                    <span style="background: ${routeData.color}; padding: 2px 6px; border-radius: 3px; color: ${routeData.color === '#ffffff' ? 'black' : 'white'}; font-size: 0.7em;">${colorName}</span><br>
                    Frequency: ${routeData.frequency}<br>
                    Fare: ${routeData.fare} | Stops: ${routeData.stops}
                </div>
            `;
            
            routeItem.addEventListener('click', () => {
                routeManager.createSnappedRoute(routeName, routeData);
            });
            
            routesList.appendChild(routeItem);
        });
    }

    updateFavoritesList() {
        const favoritesList = document.getElementById('favorites-list');
        const favorites = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
        
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<p style="color: #666; font-style: italic;">No favorite routes yet. Click on a route and "Add to Favorites".</p>';
            return;
        }
        
        favoritesList.innerHTML = '';
        favorites.forEach(routeName => {
            const routeData = jeepneyRoutes[routeName];
            if (routeData) {
                const favoriteItem = document.createElement('div');
                favoriteItem.className = 'favorite-item';
                favoriteItem.innerHTML = `
                    <div style="font-weight: bold;">${routeName}</div>
                    <div class="route-info">${routeData.description}</div>
                `;
                favoriteItem.addEventListener('click', () => {
                    routeManager.createSnappedRoute(routeName, routeData);
                });
                favoritesList.appendChild(favoriteItem);
            }
        });
    }

    updateStatistics() {
        const routes = Object.values(jeepneyRoutes);
        document.getElementById('total-routes').textContent = routes.length;
        document.getElementById('active-routes').textContent = routes.length;
        
        const mainRoutes = routes.filter(r => r.type === 'main').length;
        const feederRoutes = routes.filter(r => r.type === 'feeder').length;
        
        document.getElementById('main-routes').textContent = mainRoutes;
        document.getElementById('feeder-routes').textContent = feederRoutes;
    }

    // FIXED: Use My Location function
    async useMyLocation(field, event) {
        console.log('useMyLocation called with field:', field);
        
        if (!navigator.geolocation) {
            alert('❌ Geolocation is not supported by your browser');
            return;
        }

        // Get the button that was clicked
        const button = event?.target;
        if (button) {
            const originalText = button.textContent;
            button.textContent = '📍 Getting location...';
            button.disabled = true;
        }

        try {
            console.log('Requesting geolocation...');
            
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        console.log('Geolocation success:', pos.coords);
                        resolve(pos);
                    },
                    (err) => {
                        console.error('Geolocation error:', err);
                        reject(err);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 60000
                    }
                );
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            console.log('Location obtained:', lat, lng);
            
            // Store user location
            this.userLocation = [lat, lng];
            
            // Add marker to map
            if (this.currentLocationMarker) {
                this.map.removeLayer(this.currentLocationMarker);
            }
            
            this.currentLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'current-location-marker',
                    html: '📍',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            })
            .addTo(this.map)
            .bindPopup('<b>📍 Your Current Location</b>')
            .openPopup();
            
            // Center map on location with animation
            this.map.flyTo([lat, lng], 16, {
                duration: 1
            });
            
            // Set the input field immediately with coordinates
            const inputField = field === 'start' ? 'startLocation' : 'endLocation';
            document.getElementById(inputField).value = `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            
            // Try to get better address name in background
            setTimeout(async () => {
                try {
                    const address = await this.reverseGeocode(lat, lng);
                    if (address && address !== 'My Current Location') {
                        document.getElementById(inputField).value = address;
                        console.log('Updated with address:', address);
                    }
                } catch (e) {
                    console.log('Reverse geocoding failed, using coordinates');
                }
            }, 1000);
            
            alert('✅ Location found! Check the map for your location marker.');
            
        } catch (error) {
            console.error('Location error details:', error);
            let errorMessage = '❌ ';
            
            switch(error.code) {
                case 1: // PERMISSION_DENIED
                    errorMessage = '📍 Location access denied. Please:\n1. Allow location permissions for this site\n2. Refresh the page and try again';
                    break;
                case 2: // POSITION_UNAVAILABLE
                    errorMessage = '📍 Location unavailable. Please check your GPS or network connection.';
                    break;
                case 3: // TIMEOUT
                    errorMessage = '📍 Location request timed out. Please try again.';
                    break;
                default:
                    errorMessage = '📍 Could not get your location. Please try again.';
            }
            
            alert(errorMessage);
        } finally {
            // Reset button
            if (button) {
                button.textContent = '📍 Use My Location';
                button.disabled = false;
            }
        }
    }

    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
                // Return a shorter address
                const addressParts = data.display_name.split(',');
                return `${addressParts[0]}, ${addressParts[1]}, Batangas`;
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
        return null;
    }
}

// Route Manager
class RouteManager {
    constructor() {
        this.routeLayers = {};
        this.activeRoutes = [];
    }

    async createSnappedRoute(routeName, routeData) {
        const hour = parseInt(document.getElementById('timeSlider').value);
        
        try {
            document.getElementById('loading').style.display = 'block';
            
            const route = await this.getRouteWithETA(
                routeData.waypoints, 
                routeData.secretWaypoints || [], 
                hour
            );
            
            const latlngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            
            // Clear existing route with same name if it exists
            if (this.routeLayers[routeName]) {
                if (this.routeLayers[routeName].route && app.map.hasLayer(this.routeLayers[routeName].route)) {
                    app.map.removeLayer(this.routeLayers[routeName].route);
                }
                if (this.routeLayers[routeName].waypoints && app.map.hasLayer(this.routeLayers[routeName].waypoints)) {
                    app.map.removeLayer(this.routeLayers[routeName].waypoints);
                }
            }
            
            // Create new route
            const routeLayer = L.polyline(latlngs, {
                color: routeData.color,
                weight: 6,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(app.map);
            
            // Add waypoint markers
            const waypointsLayer = L.layerGroup().addTo(app.map);
            routeData.waypoints.forEach((waypoint, index) => {
                L.marker(waypoint)
                    .bindPopup(`
                        <b>${index === 0 ? 'Start' : index === routeData.waypoints.length - 1 ? 'End' : 'Stop ' + index}</b><br>
                        <b>Route:</b> ${routeName}<br>
                        <b>Type:</b> ${routeData.type}
                    `)
                    .addTo(waypointsLayer);
            });
            
            // Store the layer
            this.routeLayers[routeName] = {
                route: routeLayer,
                waypoints: waypointsLayer,
                data: routeData
            };
            
            // Add to active routes if not already there
            if (!this.activeRoutes.includes(routeName)) {
                this.activeRoutes.push(routeName);
            }
            
            // Fit map to show the route
            app.map.fitBounds(routeLayer.getBounds());
            
            // Update UI
            this.updateRouteDetails(routeName, routeData, route, hour);
            this.updateActiveRoute(routeName);
            
        } catch (error) {
            console.error('Error creating route:', error);
            alert('Error displaying route. Please try again.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    async getRouteWithETA(waypoints, secretWaypoints, hour) {
        try {
            const allPoints = [waypoints[0], ...secretWaypoints, waypoints[waypoints.length - 1]];
            const coordinates = allPoints.map(wp => `${wp[1]},${wp[0]}`).join(';');
            
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
            );
            
            if (!response.ok) throw new Error('Routing failed');
            
            const data = await response.json();
            if (data.code !== 'Ok') throw new Error('Route not found');
            
            return data.routes[0];
        } catch (error) {
            console.error('Routing error:', error);
            // Fallback - create straight line
            return {
                geometry: {
                    type: 'LineString',
                    coordinates: waypoints.map(wp => [wp[1], wp[0]])
                },
                distance: 0,
                duration: 0
            };
        }
    }

    clearAllRoutes() {
        console.log('Clearing all routes...');
        
        // Clear all route layers from map
        Object.keys(this.routeLayers).forEach(routeName => {
            const layerGroup = this.routeLayers[routeName];
            
            if (layerGroup.route) {
                try {
                    if (app.map.hasLayer(layerGroup.route)) {
                        app.map.removeLayer(layerGroup.route);
                    }
                } catch (error) {
                    console.warn(`Error removing route layer for ${routeName}:`, error);
                }
            }
            
            if (layerGroup.waypoints) {
                try {
                    if (app.map.hasLayer(layerGroup.waypoints)) {
                        app.map.removeLayer(layerGroup.waypoints);
                    }
                } catch (error) {
                    console.warn(`Error removing waypoints for ${routeName}:`, error);
                }
            }
        });
        
        // Reset tracking
        this.routeLayers = {};
        this.activeRoutes = [];
        
        // Clear UI
        document.getElementById('route-details').style.display = 'none';
        document.querySelectorAll('.route-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Reset map view
        app.map.setView([13.7565, 121.0583], 13);
        
        console.log('All routes cleared successfully');
        alert('All routes cleared!');
    }

    async showAllRoutes() {
        this.clearAllRoutes();
        const hour = parseInt(document.getElementById('timeSlider').value);
        
        for (const [routeName, routeData] of Object.entries(jeepneyRoutes)) {
            try {
                const route = await this.getRouteWithETA(
                    routeData.waypoints, 
                    routeData.secretWaypoints || [], 
                    hour
                );
                const latlngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                const routeLayer = L.polyline(latlngs, {
                    color: routeData.color,
                    weight: 4,
                    opacity: 0.6,
                    lineCap: 'round'
                }).addTo(app.map);
                
                this.routeLayers[routeName] = {
                    route: routeLayer,
                    waypoints: null,
                    data: routeData
                };
                
                this.activeRoutes.push(routeName);
            } catch (error) {
                console.error(`Error showing route ${routeName}:`, error);
            }
        }
        
        app.map.setView([13.7565, 121.0583], 13);
        document.getElementById('route-details').style.display = 'none';
    }

    updateActiveRoute(routeName) {
        document.querySelectorAll('.route-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`[data-route="${routeName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    updateRouteDetails(routeName, routeData, routeInfo, hour) {
        const detailsDiv = document.getElementById('route-details');
        const distance = routeInfo.distance ? (routeInfo.distance / 1000).toFixed(1) : 'N/A';
        
        // Calculate ETA
        const baseDuration = routeInfo.duration ? Math.round(routeInfo.duration / 60) : routeData.baseTime;
        const traffic = this.getTrafficMultiplier(hour);
        const trafficAdjustedTime = baseDuration * traffic.multiplier;
        const stopTime = routeData.stops * 0.5;
        const totalMinutes = Math.round(trafficAdjustedTime + stopTime);
        
        const trafficClass = `traffic-${traffic.level}`;
        
        detailsDiv.innerHTML = `
            <h4>${routeName}</h4>
            <p><strong>Description:</strong> ${routeData.description}</p>
            <p><strong>Distance:</strong> ${distance} km</p>
            <p><strong>Estimated Time:</strong> ${totalMinutes} minutes</p>
            <p><strong>Traffic:</strong> <span class="traffic-indicator ${trafficClass}"></span>${traffic.level.toUpperCase()}</p>
            <p><strong>Frequency:</strong> ${routeData.frequency}</p>
            <p><strong>Fare:</strong> ${routeData.fare}</p>
            <p><strong>Operator:</strong> ${routeData.operator}</p>
            
            <div style="margin-top: 15px;">
                <button class="control-btn secondary" onclick="routeManager.saveFavoriteRoute('${routeName}')">
                    ⭐ Add to Favorites
                </button>
                <button class="control-btn" style="background: #dc3545;" onclick="routeManager.clearAllRoutes()">
                    🗑️ Clear This Route
                </button>
            </div>
        `;
        detailsDiv.style.display = 'block';
    }

    getTrafficMultiplier(hour) {
        for (const [period, data] of Object.entries(TRAFFIC_PATTERNS)) {
            if (period !== 'normal' && hour >= data.start && hour <= data.end) {
                return data;
            }
        }
        return TRAFFIC_PATTERNS.normal;
    }

    saveFavoriteRoute(routeName) {
        const favorites = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
        if (!favorites.includes(routeName)) {
            favorites.push(routeName);
            localStorage.setItem('favoriteRoutes', JSON.stringify(favorites));
            app.updateFavoritesList();
            alert(`Added ${routeName} to favorites!`);
        } else {
            alert(`${routeName} is already in your favorites!`);
        }
    }
}

// IMPROVED Route Planner with Multi-Jeepney Support
class RoutePlanner {
    async planRoute() {
        const start = document.getElementById('startLocation').value;
        const end = document.getElementById('endLocation').value;
        
        if (!start || !end) {
            alert('Please enter both start and end locations');
            return;
        }
        
        document.getElementById('loading').style.display = 'block';
        document.getElementById('route-options').style.display = 'none';
        
        try {
            let startCoords, endCoords;
            
            // Handle "My Location" coordinates
            if (start.includes('My Location') && app.userLocation) {
                startCoords = app.userLocation;
            } else {
                startCoords = await this.geocodeAddress(start);
            }
            
            if (end.includes('My Location') && app.userLocation) {
                endCoords = app.userLocation;
            } else {
                endCoords = await this.geocodeAddress(end);
            }
            
            if (!startCoords || !endCoords) {
                throw new Error('Could not find one or both locations');
            }
            
            // Find routes with transfers
            const routeOptions = this.findRoutesWithTransfers(startCoords, endCoords);
            
            if (routeOptions.length === 0) {
                document.getElementById('route-options').innerHTML = `
                    <p style="color: #dc3545; text-align: center;">
                        No routes found between "${start}" and "${end}"<br>
                        <small>Try different locations or check if locations are within Batangas City</small>
                    </p>
                `;
            } else {
                this.displayRouteOptions(routeOptions, start, end);
            }
            
        } catch (error) {
            document.getElementById('route-options').innerHTML = 
                `<p style="color: #dc3545; text-align: center;">Error: ${error.message}</p>`;
        } finally {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('route-options').style.display = 'block';
        }
    }

    // IMPROVED: Find routes with transfer support
    findRoutesWithTransfers(startCoords, endCoords, maxDistance = 1000) {
        const routeOptions = [];
        
        // First, try direct routes
        const directRoutes = this.findDirectRoutes(startCoords, endCoords, maxDistance);
        if (directRoutes.length > 0) {
            routeOptions.push(...directRoutes.map(route => ({
                type: 'direct',
                routes: [route],
                totalFare: this.extractFare(route.data.fare),
                totalTime: route.data.baseTime,
                confidence: 'high'
            })));
        }
        
        // Then, try routes with one transfer
        const transferRoutes = this.findTransferRoutes(startCoords, endCoords, maxDistance);
        routeOptions.push(...transferRoutes);
        
        // Sort by total time (fastest first)
        return routeOptions.sort((a, b) => a.totalTime - b.totalTime).slice(0, 5);
    }

    findDirectRoutes(startCoords, endCoords, maxDistance) {
        const directRoutes = [];
        
        Object.entries(jeepneyRoutes).forEach(([routeName, routeData]) => {
            const allRoutePoints = [...routeData.waypoints, ...(routeData.secretWaypoints || [])];
            
            // Check if route passes near both start and end points
            const nearStart = allRoutePoints.some(point => 
                this.calculateDistance(startCoords, point) <= maxDistance
            );
            
            const nearEnd = allRoutePoints.some(point => 
                this.calculateDistance(endCoords, point) <= maxDistance
            );
            
            if (nearStart && nearEnd) {
                directRoutes.push({
                    name: routeName,
                    data: routeData
                });
            }
        });
        
        return directRoutes;
    }

    // NEW: Find routes that require transfers
    findTransferRoutes(startCoords, endCoords, maxDistance) {
        const transferRoutes = [];
        
        // Find routes that start near the start location
        const startRoutes = Object.entries(jeepneyRoutes).filter(([routeName, routeData]) => {
            const allPoints = [...routeData.waypoints, ...(routeData.secretWaypoints || [])];
            return allPoints.some(point => this.calculateDistance(startCoords, point) <= maxDistance);
        });
        
        // Find routes that end near the destination
        const endRoutes = Object.entries(jeepneyRoutes).filter(([routeName, routeData]) => {
            const allPoints = [...routeData.waypoints, ...(routeData.secretWaypoints || [])];
            return allPoints.some(point => this.calculateDistance(endCoords, point) <= maxDistance);
        });
        
        // Find transfer points between start and end routes
        startRoutes.forEach(([startRouteName, startRouteData]) => {
            endRoutes.forEach(([endRouteName, endRouteData]) => {
                if (startRouteName !== endRouteName) {
                    const transferPoint = this.findTransferPoint(startRouteData, endRouteData);
                    if (transferPoint) {
                        const totalFare = this.extractFare(startRouteData.fare) + this.extractFare(endRouteData.fare);
                        const totalTime = startRouteData.baseTime + endRouteData.baseTime + 10; // +10 minutes for transfer
                        
                        transferRoutes.push({
                            type: 'transfer',
                            routes: [startRouteName, endRouteName],
                            transferPoint: transferPoint,
                            totalFare: totalFare,
                            totalTime: totalTime,
                            confidence: 'medium'
                        });
                    }
                }
            });
        });
        
        return transferRoutes;
    }

    findTransferPoint(route1, route2) {
        const route1Points = [...route1.waypoints, ...(route1.secretWaypoints || [])];
        const route2Points = [...route2.waypoints, ...(route2.secretWaypoints || [])];
        
        for (const point1 of route1Points) {
            for (const point2 of route2Points) {
                if (this.calculateDistance(point1, point2) <= 500) { // Within 500 meters
                    // Find the landmark name for this point
                    for (const [landmark, coords] of Object.entries(allStops)) {
                        if (this.calculateDistance(point1, coords) <= 200) {
                            return { name: landmark, coordinates: point1 };
                        }
                    }
                    return { name: 'Transfer Point', coordinates: point1 };
                }
            }
        }
        return null;
    }

    extractFare(fareString) {
        const match = fareString.match(/₱(\d+)/);
        return match ? parseInt(match[1]) : 15; // Default to ₱15 if not found
    }

    displayRouteOptions(routeOptions, start, end) {
        let html = `<h5>🚍 Available Routes (${routeOptions.length} found):</h5>`;
        
        routeOptions.forEach((option, index) => {
            if (option.type === 'direct') {
                const route = option.routes[0];
                html += `
                    <div class="route-option" onclick="routeManager.createSnappedRoute('${route.name}', jeepneyRoutes['${route.name}'])">
                        <strong>${index + 1}. ${route.name} (Direct Route)</strong>
                        <div class="route-info">
                            ${route.data.description}<br>
                            🕐 ${option.totalTime} min • 💰 ₱${option.totalFare} • ✅ Direct
                        </div>
                    </div>
                `;
            } else if (option.type === 'transfer') {
                html += `
                    <div class="transfer-option">
                        <strong>${index + 1}. Transfer Route</strong>
                        <div class="transfer-route">
                            <div class="route-leg">
                                <strong>First Jeep:</strong> ${option.routes[0]}<br>
                                <small>${jeepneyRoutes[option.routes[0]].description}</small>
                            </div>
                            <div class="transfer-point">
                                🔄 Transfer at: ${option.transferPoint.name}
                            </div>
                            <div class="route-leg">
                                <strong>Second Jeep:</strong> ${option.routes[1]}<br>
                                <small>${jeepneyRoutes[option.routes[1]].description}</small>
                            </div>
                            <div class="route-info">
                                🕐 Total: ${option.totalTime} min • 💰 Total Fare: ₱${option.totalFare}
                            </div>
                            <button class="control-btn success" onclick="routePlanner.showTransferRoute(['${option.routes[0]}', '${option.routes[1]}'])">
                                Show This Route
                            </button>
                        </div>
                    </div>
                `;
            }
        });
        
        document.getElementById('route-options').innerHTML = html;
    }

    // NEW: Show transfer route on map
    async showTransferRoute(routeNames) {
        routeManager.clearAllRoutes();
        
        for (const routeName of routeNames) {
            const routeData = jeepneyRoutes[routeName];
            if (routeData) {
                await routeManager.createSnappedRoute(routeName, routeData);
            }
        }
    }

    calculateDistance(coord1, coord2) {
        const R = 6371000; // Earth radius in meters
        const lat1 = coord1[0] * Math.PI / 180;
        const lat2 = coord2[0] * Math.PI / 180;
        const deltaLat = (coord2[0] - coord1[0]) * Math.PI / 180;
        const deltaLon = (coord2[1] - coord1[1]) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    async geocodeAddress(address) {
        // First try to match with known stops
        const matchedLandmark = this.matchWithLandmarks(address);
        if (matchedLandmark) {
            return allStops[matchedLandmark];
        }
        
        // Try OpenStreetMap geocoding
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Batangas City')}&limit=1`
            );
            const data = await response.json();
            if (data.length > 0) {
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        }
        
        // Fallback to Batangas City center
        return [13.7565, 121.0583];
    }

    matchWithLandmarks(address) {
        const cleanAddress = address.toLowerCase().trim();
        for (const landmark of Object.keys(allStops)) {
            if (landmark.toLowerCase().includes(cleanAddress) || cleanAddress.includes(landmark.toLowerCase())) {
                return landmark;
            }
        }
        return null;
    }

    useMyLocation(field) {
        app.useMyLocation(field);
    }
}

// Traffic Layer Manager
class TrafficLayer {
    toggleTraffic() {
        const button = document.getElementById('trafficToggle');
        
        if (this.trafficLayer) {
            app.map.removeLayer(this.trafficLayer);
            this.trafficLayer = null;
            button.textContent = 'Show Traffic';
        } else {
            this.trafficLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap France | Traffic Data'
            }).addTo(app.map);
            button.textContent = 'Hide Traffic';
        }
    }
}

// Initialize the application
const app = new BatangasJeepneySystem();
const routeManager = new RouteManager();
const routePlanner = new RoutePlanner();
const trafficLayer = new TrafficLayer();

// Make available globally for HTML onclick events
window.routeManager = routeManager;
window.routePlanner = routePlanner;
window.trafficLayer = trafficLayer;
window.app = app;

// Add emergency reset function
window.resetSystem = function() {
    console.log('Emergency system reset...');
    routeManager.clearAllRoutes();
    document.getElementById('route-options').innerHTML = '';
    document.getElementById('startLocation').value = '';
    document.getElementById('endLocation').value = '';
    alert('System has been reset!');
};