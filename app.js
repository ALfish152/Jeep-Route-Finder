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
        this.accuracyCircle = null;
        this.searchRadiusCircle = null;
        this.nearestRoutes = [];
        
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

        // Student / PWD discount toggle: refresh displayed fares when changed
        const discountToggle = document.getElementById('discountToggle');
        if (discountToggle) {
            discountToggle.addEventListener('change', () => {
                // Refresh routes list display
                this.populateRoutesList();

                // Refresh currently shown route details (if any)
                try {
                    if (routeManager.activeRoutes.length > 0) {
                        const active = routeManager.activeRoutes[0];
                        const data = routeManager.routeLayers[active]?.data || jeepneyRoutes[active];
                        if (data) {
                            const hour = parseInt(document.getElementById('timeSlider').value);
                            // pass an empty routeInfo so ETA logic falls back to baseTime
                            routeManager.updateRouteDetails(active, data, {}, hour);
                        }
                    }
                } catch (err) {
                    console.warn('Error refreshing route details after discount toggle:', err);
                }
            });
        }
    }

    initializeUI() {
        this.populateRoutesList();
        this.updateTimeDisplay(12);
        this.updateFavoritesList();
        this.updateStatistics();
    }

    // Format fare string and apply Student/PWD discount if enabled
    formatFare(fareStr) {
        const discountEnabled = document.getElementById('discountToggle')?.checked;
        const discount = discountEnabled ? 2 : 0;
        if (!fareStr || discount === 0) return fareStr;

        // Extract numbers and apply discount
        const nums = fareStr.match(/(\d+)/g);
        if (!nums) return fareStr;

        const adjusted = nums.map(n => Math.max(parseInt(n, 10) - discount, 0));

        if (adjusted.length === 1) {
            return `₱${adjusted[0]}`;
        }
        // If range
        return `₱${adjusted[0]}-₱${adjusted[1]}`.replace(/₱(\d+)-₱(\d+)/, '₱$1-$2');
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
                    Fare: ${this.formatFare(routeData.fare)} | Stops: ${routeData.stops}
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

    // IMPROVED: Use My Location with dynamic radius and route finding
    async useMyLocation(field, event) {
        console.log('useMyLocation called with field:', field);
        
        if (!navigator.geolocation) {
            alert('❌ Geolocation is not supported by your browser');
            return;
        }

        const button = event?.target;
        if (button) {
            button.textContent = '📍 Getting location...';
            button.disabled = true;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            console.log('Location obtained:', { lat, lng, accuracy: accuracy + 'm' });
            
            // Store user location
            this.userLocation = [lat, lng];
            
            // Clear existing markers
            if (this.currentLocationMarker) {
                this.map.removeLayer(this.currentLocationMarker);
            }
            if (this.accuracyCircle) {
                this.map.removeLayer(this.accuracyCircle);
            }
            if (this.searchRadiusCircle) {
                this.map.removeLayer(this.searchRadiusCircle);
            }
            
            // Add accuracy circle (limited to 500m max for better UX)
            const displayAccuracy = Math.min(accuracy, 500);
            this.accuracyCircle = L.circle([lat, lng], {
                radius: displayAccuracy,
                color: accuracy <= 50 ? '#00C851' : accuracy <= 100 ? '#ffbb33' : '#ff4444',
                fillColor: accuracy <= 50 ? '#00C851' : accuracy <= 100 ? '#ffbb33' : '#ff4444',
                fillOpacity: 0.2,
                weight: 2
            }).addTo(this.map);
            
            // Add location marker using your existing CSS
            this.currentLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'current-location-marker',
                    html: '📍',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            })
            .addTo(this.map)
            .bindPopup(`
                <b>📍 Your Current Location</b><br>
                Accuracy: ${Math.round(accuracy)} meters<br>
                Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            `)
            .openPopup();
            
            // Center map on location
            this.map.flyTo([lat, lng], 16, { duration: 1 });
            
            // Set the input field
            const inputField = field === 'start' ? 'startLocation' : 'endLocation';
            document.getElementById(inputField).value = `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            
            // Show accuracy feedback
            if (accuracy > 500) {
                alert('📍 Location found (Low accuracy). For better results, enable GPS and go outside.');
            }
            
            // NEW: Find nearest jeepney routes with dynamic radius
            await this.findNearestJeepneyRoutes([lat, lng]);
            
        } catch (error) {
            console.error('Location error:', error);
            alert('❌ Could not get your location. Please ensure location services are enabled.');
        } finally {
            if (button) {
                button.textContent = '📍 Use My Location';
                button.disabled = false;
            }
        }
    }

    // NEW: Find nearest jeepney routes with dynamic radius expansion
    async findNearestJeepneyRoutes(userLocation) {
        console.log('Finding nearest jeepney routes...');
        
        const maxRadius = 2000; // Maximum search radius in meters (2km)
        const radiusStep = 200; // Expand by 200m each step
        
        // Show loading for route search
        document.getElementById('loading').style.display = 'block';
        
        try {
            // Remove previous search radius circle
            if (this.searchRadiusCircle) {
                this.map.removeLayer(this.searchRadiusCircle);
            }
            
            // Create expanding radius animation
            const expandRadius = async () => {
                for (let radius = 100; radius <= maxRadius; radius += radiusStep) {
                    // Update search radius circle
                    if (this.searchRadiusCircle) {
                        this.map.removeLayer(this.searchRadiusCircle);
                    }
                    
                    this.searchRadiusCircle = L.circle(userLocation, {
                        radius: radius,
                        color: '#2196f3',
                        fillColor: '#2196f3',
                        fillOpacity: 0.1,
                        weight: 2,
                        dashArray: '5, 5'
                    }).addTo(this.map);
                    
                    // Find routes within current radius
                    const routesInRadius = this.findRoutesWithinRadius(userLocation, radius);
                    
                    if (routesInRadius.length > 0) {
                        // Found routes! Stop expanding and display results
                        this.displayNearestRoutes(routesInRadius, userLocation, radius);
                        break;
                    }
                    
                    // Wait a bit before expanding further (creates animation effect)
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                // If no routes found even at max radius
                if (this.nearestRoutes.length === 0) {
                    this.showNotification('❌ No jeepney routes found within 2km. Try a different location.', 'error');
                }
            };
            
            await expandRadius();
            
        } catch (error) {
            console.error('Error finding nearest routes:', error);
            this.showNotification('❌ Error searching for nearby routes', 'error');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    // NEW: Find routes within a specific radius
    findRoutesWithinRadius(userLocation, radius) {
        const nearbyRoutes = [];
        
        Object.entries(jeepneyRoutes).forEach(([routeName, routeData]) => {
            const allRoutePoints = [...routeData.waypoints, ...(routeData.secretWaypoints || [])];
            
            // Find the closest point on this route to user location
            let minDistance = Infinity;
            let closestPoint = null;
            
            allRoutePoints.forEach(point => {
                const distance = this.calculateDistance(userLocation, point);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                }
            });
            
            // If route is within search radius, add it to results
            if (minDistance <= radius) {
                nearbyRoutes.push({
                    routeName: routeName,
                    routeData: routeData,
                    distance: minDistance,
                    closestPoint: closestPoint,
                    recommendation: this.getTransportRecommendation(minDistance)
                });
            }
        });
        
        // Sort by distance (closest first)
        return nearbyRoutes.sort((a, b) => a.distance - b.distance).slice(0, 5); // Top 5 closest
    }

    // NEW: Get transportation recommendation based on distance
    getTransportRecommendation(distance) {
        if (distance <= 300) { // Within 300m
            return {
                type: 'walk',
                message: `🚶‍♂️ Walk ${Math.round(distance)}m to jeepney route`,
                time: Math.round(distance / 80), // 80m per minute walking
                color: '#4caf50'
            };
        } else if (distance <= 1000) { // 300m - 1km
            return {
                type: 'walk_or_tricycle',
                message: `🚶‍♂️ Walk ${Math.round(distance)}m or 🛺 Take tricycle`,
                time: Math.round(distance / 80), // Walking time
                tricycleTime: Math.round(distance / 200), // 200m per minute for tricycle
                tricycleFare: distance <= 500 ? '₱10-15' : '₱15-25',
                color: '#ff9800'
            };
        } else { // Over 1km
            return {
                type: 'tricycle',
                message: `🛺 Take tricycle (${Math.round(distance)}m away)`,
                time: Math.round(distance / 200), // 200m per minute for tricycle
                fare: '₱25-40',
                color: '#f44336'
            };
        }
    }

    // NEW: Display nearest routes with recommendations
    displayNearestRoutes(routes, userLocation, searchRadius) {
        this.nearestRoutes = routes;
        
        let html = `
            <h5>📍 Nearest Jeepney Routes (${routes.length} found within ${searchRadius}m)</h5>
            <div class="nearest-routes-list">
        `;
        
        routes.forEach((route, index) => {
            const rec = route.recommendation;
            
            html += `
                <div class="nearest-route-item">
                    <div class="route-header">
                        <strong>${index + 1}. ${route.routeName}</strong>
                        <span class="distance-badge">${Math.round(route.distance)}m away</span>
                    </div>
                    <div class="recommendation" style="background: ${rec.color}20; border-left: 4px solid ${rec.color}; padding: 8px; margin: 5px 0; border-radius: 4px;">
                        <strong>${rec.message}</strong>
                        ${rec.type === 'walk' ? `<br>🕐 ${rec.time} min walking` : ''}
                        ${rec.type === 'walk_or_tricycle' ? `<br>🕐 ${rec.time} min walking or ${rec.tricycleTime} min by tricycle (${rec.tricycleFare})` : ''}
                        ${rec.type === 'tricycle' ? `<br>🕐 ${rec.time} min • 💰 ${rec.fare}` : ''}
                    </div>
                    <div class="route-info">
                ${route.routeData.description}<br>
                Frequency: ${route.routeData.frequency} • Fare: ${this.formatFare(route.routeData.fare)}
                    </div>
                    <button class="control-btn success" onclick="routeManager.createSnappedRoute('${route.routeName}', jeepneyRoutes['${route.routeName}'])">
                        Show This Route
                    </button>
                    <button class="control-btn secondary" onclick="app.showWalkingRoute([${userLocation}], [${route.closestPoint}], ${route.distance})">
                        🚶 Show Walking Route
                    </button>
                </div>
            `;
        });
        
        html += `</div>`;
        
        document.getElementById('route-options').innerHTML = html;
        document.getElementById('route-options').style.display = 'block';
        
        this.showNotification(`✅ Found ${routes.length} jeepney routes nearby!`, 'success');
    }

    // NEW: Show walking route to jeepney stop
    showWalkingRoute(startCoords, endCoords, distance) {
        // Clear existing routes first
        routeManager.clearAllRoutesSilently();
        
        // Create walking route line (simplified - straight line for demo)
        const walkingRoute = L.polyline([startCoords, endCoords], {
            color: '#4caf50',
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 5',
            lineCap: 'round'
        }).addTo(this.map);
        
        // Add markers for start and end points
        L.marker(startCoords, {
            icon: L.divIcon({
                className: 'walking-marker',
                html: '🚶',
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            })
        })
        .addTo(this.map)
        .bindPopup('<b>Your Location</b><br>Start walking from here')
        .openPopup();
        
        L.marker(endCoords, {
            icon: L.divIcon({
                className: 'jeepney-marker',
                html: '🚍',
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            })
        })
        .addTo(this.map)
        .bindPopup('<b>Jeepney Stop</b><br>Nearest pickup point')
        .openPopup();
        
        // Fit map to show the walking route
        this.map.fitBounds(walkingRoute.getBounds());
        
        // Show walking route details
        const walkingTime = Math.round(distance / 80); // 80m per minute walking
        const detailsDiv = document.getElementById('route-details');
        detailsDiv.innerHTML = `
            <h4>🚶 Walking Route to Jeepney</h4>
            <div class="walking-route-info">
                <p><strong>Distance:</strong> ${Math.round(distance)} meters</p>
                <p><strong>Walking Time:</strong> ${walkingTime} minutes</p>
                <p><strong>Pace:</strong> Normal walking speed (5km/h)</p>
                <p><strong>Tip:</strong> Look for the nearest tricycle if you have luggage or it's raining</p>
            </div>
            <div style="margin-top: 15px;">
                <button class="control-btn" style="background: #dc3545;" onclick="routeManager.clearAllRoutes()">
                    🗑️ Clear Route
                </button>
            </div>
        `;
        detailsDiv.style.display = 'block';
    }

    // Calculate distance between two coordinates (in meters)
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

    // NEW: Clear current location and destination
    clearLocationAndRoutes() {
        console.log('Clearing location inputs and routes...');
        
        // Clear input fields
        document.getElementById('startLocation').value = '';
        document.getElementById('endLocation').value = '';
        
        // Clear user location data
        this.userLocation = null;
        this.nearestRoutes = [];
        
        // Remove location marker and accuracy circle from map
        if (this.currentLocationMarker) {
            this.map.removeLayer(this.currentLocationMarker);
            this.currentLocationMarker = null;
        }
        if (this.accuracyCircle) {
            this.map.removeLayer(this.accuracyCircle);
            this.accuracyCircle = null;
        }
        if (this.searchRadiusCircle) {
            this.map.removeLayer(this.searchRadiusCircle);
            this.searchRadiusCircle = null;
        }
        
        // Clear route options display
        document.getElementById('route-options').innerHTML = '';
        document.getElementById('route-options').style.display = 'none';
        
        // Clear all routes from map
        routeManager.clearAllRoutesSilently();
        
        // Show confirmation
        this.showNotification('🗑️ Location inputs and routes cleared!', 'info');
        
        console.log('Location inputs and routes cleared successfully');
    }

    // Helper method for notifications
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'info' ? '#17a2b8' : '#6c757d'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: bold;
            text-align: center;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // NEW: IP-based location fallback
    async getIPBasedLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.latitude && data.longitude) {
                console.log('IP-based location:', data);
                return [data.latitude, data.longitude];
            }
        } catch (error) {
            console.error('IP-based location failed:', error);
        }
        
        // Fallback to Batangas city center
        return [13.7565, 121.0583];
    }

    // IMPROVED Reverse Geocoding
    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
                // Return a shorter, more relevant address
                const address = data.display_name;
                
                // Extract the most relevant parts
                const parts = address.split(',');
                if (parts.length >= 3) {
                    // Return street/area, barangay, city
                    return `${parts[0].trim()}, ${parts[1].trim()}, Batangas City`;
                }
                return address;
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

    clearAllRoutesSilently() {
        console.log('Clearing all routes silently...');
        
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
        
        // Clear UI but don't show alert
        document.getElementById('route-details').style.display = 'none';
        document.querySelectorAll('.route-item').forEach(item => {
            item.classList.remove('active');
        });
        
        console.log('All routes cleared silently');
    }

    async showAllRoutes() {
        // Clear existing routes silently first
        this.clearAllRoutesSilently();
        
        const hour = parseInt(document.getElementById('timeSlider').value);
        let routesLoaded = 0;
        
        // Show loading
        document.getElementById('loading').style.display = 'block';
        
        try {
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
                    routesLoaded++;
                    
                } catch (error) {
                    console.error(`Error showing route ${routeName}:`, error);
                }
            }
            
            // Show success message
            if (routesLoaded > 0) {
                app.showNotification(`✅ Showing all ${routesLoaded} jeepney routes!`, 'success');
            } else {
                app.showNotification('❌ No routes could be loaded', 'error');
            }
            
        } catch (error) {
            console.error('Error showing all routes:', error);
            app.showNotification('❌ Error loading routes', 'error');
        } finally {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('route-details').style.display = 'none';
        }
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
        // Don't show individual route details when showing transfer routes
        // Check if we're currently showing a transfer route
        const currentDetails = document.getElementById('route-details').innerHTML;
        if (currentDetails.includes('Transfer Route')) {
            return; // Don't override transfer route details
        }
        
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
            <p><strong>Fare:</strong> ${app.formatFare(routeData.fare)}</p>
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
        // Extract base numeric fare and apply Student/PWD discount (₱2) if enabled
        const match = fareString.match(/₱?(\d+)/);
        let value = match ? parseInt(match[1], 10) : 15; // Default to ₱15 if not found
        const discountEnabled = document.getElementById('discountToggle')?.checked;
        const discount = discountEnabled ? 2 : 0;
        value = Math.max(value - discount, 0);
        return value;
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
                // Create safe route names for the onclick handler
                const route1 = option.routes[0].replace(/'/g, "\\'");
                const route2 = option.routes[1].replace(/'/g, "\\'");
                
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
                            <button class="control-btn success" onclick="event.stopPropagation(); routePlanner.showTransferRoute(['${route1}', '${route2}'])">
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
        console.log('Showing transfer route:', routeNames);
        
        // Clear existing routes first but don't show alert
        routeManager.clearAllRoutesSilently();
        
        // Show loading
        document.getElementById('loading').style.display = 'block';
        
        try {
            // Show all routes in the transfer
            for (const routeName of routeNames) {
                const routeData = jeepneyRoutes[routeName];
                if (routeData) {
                    await routeManager.createSnappedRoute(routeName, routeData);
                }
            }
            
            // Create a custom route details for the transfer
            this.showTransferRouteDetails(routeNames);
            
        } catch (error) {
            console.error('Error showing transfer route:', error);
            alert('Error displaying transfer route. Please try again.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    // NEW: Show detailed information for transfer routes
    showTransferRouteDetails(routeNames) {
        const detailsDiv = document.getElementById('route-details');
        
        let totalFare = 0;
        let totalTime = 0;
        let routeDescriptions = [];
        
        routeNames.forEach((routeName, index) => {
            const routeData = jeepneyRoutes[routeName];
            if (routeData) {
                totalFare += this.extractFare(routeData.fare);
                totalTime += routeData.baseTime;
                
                if (index < routeNames.length - 1) {
                    totalTime += 10; // Add 10 minutes for each transfer
                }
                
                routeDescriptions.push({
                    name: routeName,
                    description: routeData.description,
                    fare: routeData.fare,
                    time: routeData.baseTime
                });
            }
        });
        
        let routeHtml = '';
        routeDescriptions.forEach((route, index) => {
            routeHtml += `
                <div class="route-leg">
                    <strong>Leg ${index + 1}: ${route.name}</strong><br>
                    <small>${route.description}</small><br>
                    🕐 ${route.time} min • 💰 ${app.formatFare(route.fare)}
                </div>
            `;
            
            if (index < routeDescriptions.length - 1) {
                routeHtml += `
                    <div class="transfer-point">
                        🔄 Transfer Point
                    </div>
                `;
            }
        });
        
        detailsDiv.innerHTML = `
            <h4>🔄 Transfer Route</h4>
            <div class="transfer-route">
                ${routeHtml}
                <div class="route-info" style="margin-top: 15px; padding: 10px; background: #e8f5e8; border-radius: 6px;">
                    <strong>Total Journey:</strong><br>
                    🕐 Total Time: ${totalTime} minutes<br>
                    💰 Total Fare: ₱${totalFare}<br>
                    🚍 ${routeNames.length} jeepney${routeNames.length > 1 ? 's' : ''}<br>
                    🔄 ${routeNames.length - 1} transfer${routeNames.length - 1 > 1 ? 's' : ''}
                </div>
            </div>
            
            <div style="margin-top: 15px;">
                <button class="control-btn secondary" onclick="routePlanner.saveFavoriteTransferRoute(['${routeNames.join("','")}'])">
                    ⭐ Save This Transfer
                </button>
                <button class="control-btn" style="background: #dc3545;" onclick="routeManager.clearAllRoutes()">
                    🗑️ Clear Routes
                </button>
            </div>
        `;
        detailsDiv.style.display = 'block';
    }

    // NEW: Save favorite transfer route
    saveFavoriteTransferRoute(routeNames) {
        const favorites = JSON.parse(localStorage.getItem('favoriteTransfers') || '[]');
        const transferKey = routeNames.join('|');
        
        if (!favorites.includes(transferKey)) {
            favorites.push(transferKey);
            localStorage.setItem('favoriteTransfers', JSON.stringify(favorites));
            alert(`Saved transfer route to favorites!`);
        } else {
            alert(`This transfer route is already in your favorites!`);
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

// NEW: Clear inputs and routes function
window.clearInputsAndRoutes = function() {
    app.clearLocationAndRoutes();
};