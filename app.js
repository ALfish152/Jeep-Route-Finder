// Enhanced Batangas Jeepney Route System
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
        this.currentWalkingRoute = null;
        this.walkingStartMarker = null;
        this.walkingEndMarker = null;
        
        this.init();
    }

    init() {
        this.initializeMap();
        this.initializeEventListeners();
        this.initializeUI();
        
        console.log('Batangas Jeepney System initialized');
    }

    initializeMap() {
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

        // Student / PWD discount toggle
        const discountToggle = document.getElementById('discountToggle');
        if (discountToggle) {
            discountToggle.addEventListener('change', () => {
                this.populateRoutesList();
                try {
                    if (routeManager.activeRoutes.length > 0) {
                        const active = routeManager.activeRoutes[0];
                        const data = routeManager.routeLayers[active]?.data || jeepneyRoutes[active];
                        if (data) {
                            const hour = parseInt(document.getElementById('timeSlider').value);
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

    formatFare(fareStr) {
        const discountEnabled = document.getElementById('discountToggle')?.checked;
        const discount = discountEnabled ? 2 : 0;
        if (!fareStr || discount === 0) return fareStr;

        const nums = fareStr.match(/(\d+)/g);
        if (!nums) return fareStr;

        const adjusted = nums.map(n => Math.max(parseInt(n, 10) - discount, 0));

        if (adjusted.length === 1) {
            return `₱${adjusted[0]}`;
        }
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

    // Improved location handling
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
            
            // Add accuracy circle
            const displayAccuracy = Math.min(accuracy, 500);
            this.accuracyCircle = L.circle([lat, lng], {
                radius: displayAccuracy,
                color: accuracy <= 50 ? '#00C851' : accuracy <= 100 ? '#ffbb33' : '#ff4444',
                fillColor: accuracy <= 50 ? '#00C851' : accuracy <= 100 ? '#ffbb33' : '#ff4444',
                fillOpacity: 0.2,
                weight: 2
            }).addTo(this.map);
            
            // Add location marker
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
            
            if (accuracy > 500) {
                alert('📍 Location found (Low accuracy). For better results, enable GPS and go outside.');
            }
            
            // Find nearest jeepney routes
            if (field === 'start') {
                await this.findNearestJeepneyRoutes([lat, lng]);
            }

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

    // Use for start location with route finding
    async useMyLocationWithRoutes(field, event) {
        await this.useMyLocation(field, event);
    }

    // Use for destination without route finding
    async useMyLocationNoRoutes(field, event) {
        const originalFindNearestJeepneyRoutes = this.findNearestJeepneyRoutes;
        this.findNearestJeepneyRoutes = async () => {
            console.log('Skipping route finding for simple location');
        };
        
        try {
            await this.useMyLocation(field, event);
        } finally {
            this.findNearestJeepneyRoutes = originalFindNearestJeepneyRoutes;
        }
    }

    // Find nearest jeepney routes with dynamic radius expansion
    async findNearestJeepneyRoutes(userLocation) {
        console.log('Finding nearest jeepney routes...');
        
        const maxRadius = 2000;
        const radiusStep = 200;
        
        document.getElementById('loading').style.display = 'block';
        
        try {
            if (this.searchRadiusCircle) {
                this.map.removeLayer(this.searchRadiusCircle);
            }
            
            const expandRadius = async () => {
                for (let radius = 100; radius <= maxRadius; radius += radiusStep) {
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
                    
                    const routesInRadius = this.findRoutesWithinRadius(userLocation, radius);
                    
                    if (routesInRadius.length > 0) {
                        this.displayNearestRoutes(routesInRadius, userLocation, radius);
                        break;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
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

    findRoutesWithinRadius(userLocation, radius) {
        const nearbyRoutes = [];
        
        Object.entries(jeepneyRoutes).forEach(([routeName, routeData]) => {
            const allRoutePoints = [...routeData.waypoints, ...(routeData.secretWaypoints || [])];
            
            let minDistance = Infinity;
            let closestPoint = null;
            
            allRoutePoints.forEach(point => {
                const distance = this.calculateDistance(userLocation, point);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                }
            });
            
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
        
        return nearbyRoutes.sort((a, b) => a.distance - b.distance).slice(0, 5);
    }

    getTransportRecommendation(distance) {
        if (distance <= 300) {
            return {
                type: 'walk',
                message: `🚶‍♂️ Walk ${Math.round(distance)}m to jeepney route`,
                time: Math.round(distance / 80),
                color: '#4caf50'
            };
        } else if (distance <= 1000) {
            return {
                type: 'walk',
                message: `🚶‍♂️ Walk ${Math.round(distance)}m to jeepney route`,
                time: Math.round(distance / 80),
                color: '#ff9800'
            };
        } else {
            return {
                type: 'walk',
                message: `🚶‍♂️ Walk ${Math.round(distance)}m to jeepney route`,
                time: Math.round(distance / 80),
                color: '#f44336'
            };
        }
    }

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
                        <br>🕐 ${rec.time} min walking
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

    showWalkingRoute(startCoords, endCoords, distance) {
        routeManager.clearAllRoutesSilently();
        
        this.currentWalkingRoute = L.polyline([startCoords, endCoords], {
            color: '#4caf50',
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 5',
            lineCap: 'round'
        }).addTo(this.map);
        
        this.walkingStartMarker = L.marker(startCoords, {
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
        
        this.walkingEndMarker = L.marker(endCoords, {
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
        
        this.map.fitBounds(this.currentWalkingRoute.getBounds());
        
        const walkingTime = Math.round(distance / 80);
        const detailsDiv = document.getElementById('route-details');
        detailsDiv.innerHTML = `
            <h4>🚶 Walking Route to Jeepney</h4>
            <div class="walking-route-info">
                <p><strong>Distance:</strong> ${Math.round(distance)} meters</p>
                <p><strong>Walking Time:</strong> ${walkingTime} minutes</p>
                <p><strong>Pace:</strong> Normal walking speed (5km/h)</p>
                <p><strong>Tip:</strong> Look for alternative transportation if you have luggage or it's raining</p>
            </div>
            <div style="margin-top: 15px;">
                <button class="control-btn" style="background: #dc3545;" onclick="app.clearWalkingRoute()">
                    🗑️ Clear Walking Route
                </button>
            </div>
        `;
        detailsDiv.style.display = 'block';
    }

    clearWalkingRoute() {
        console.log('Clearing walking route...');
        
        if (this.currentWalkingRoute) {
            this.map.removeLayer(this.currentWalkingRoute);
            this.currentWalkingRoute = null;
        }
        if (this.walkingStartMarker) {
            this.map.removeLayer(this.walkingStartMarker);
            this.walkingStartMarker = null;
        }
        if (this.walkingEndMarker) {
            this.map.removeLayer(this.walkingEndMarker);
            this.walkingEndMarker = null;
        }
        
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Polyline && 
                layer.options.color === '#4caf50' && 
                layer.options.dashArray === '5, 5') {
                this.map.removeLayer(layer);
            }
            
            if (layer instanceof L.Marker) {
                const icon = layer.options.icon;
                if (icon && (icon.options.className === 'walking-marker' || 
                            icon.options.className === 'jeepney-marker' ||
                            icon.options.html === '🚶' || 
                            icon.options.html === '🚍')) {
                    this.map.removeLayer(layer);
                }
            }
        });
        
        document.getElementById('route-details').style.display = 'none';
        this.showNotification('🗑️ Walking route cleared!', 'info');
    }

    calculateDistance(coord1, coord2) {
        const R = 6371000;
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

    clearLocationAndRoutes() {
        console.log('Clearing location inputs and routes...');
        
        document.getElementById('startLocation').value = '';
        document.getElementById('endLocation').value = '';
        
        this.userLocation = null;
        this.nearestRoutes = [];
        
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
        
        this.clearAllWalkingRoutes();
        
        document.getElementById('route-options').innerHTML = '';
        document.getElementById('route-options').style.display = 'none';
        
        routeManager.clearAllRoutesSilently();
        
        this.showNotification('🗑️ Location inputs and routes cleared!', 'info');
    }

    showNotification(message, type = 'info') {
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
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    clearAllWalkingRoutes() {
        console.log('Clearing all walking routes...');
        
        if (this.currentWalkingRoute) {
            this.map.removeLayer(this.currentWalkingRoute);
            this.currentWalkingRoute = null;
        }
        if (this.walkingStartMarker) {
            this.map.removeLayer(this.walkingStartMarker);
            this.walkingStartMarker = null;
        }
        if (this.walkingEndMarker) {
            this.map.removeLayer(this.walkingEndMarker);
            this.walkingEndMarker = null;
        }
        
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Polyline && layer.options.dashArray === '5, 5') {
                this.map.removeLayer(layer);
            }
            
            if (layer instanceof L.Marker) {
                const icon = layer.options.icon;
                if (icon && (icon.options.className === 'walking-marker' || icon.options.className === 'jeepney-marker')) {
                    this.map.removeLayer(layer);
                }
            }
        });
        
        console.log('All walking routes cleared');
    }
}

// Enhanced Route Manager
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
            
            if (this.routeLayers[routeName]) {
                if (this.routeLayers[routeName].route && app.map.hasLayer(this.routeLayers[routeName].route)) {
                    app.map.removeLayer(this.routeLayers[routeName].route);
                }
                if (this.routeLayers[routeName].waypoints && app.map.hasLayer(this.routeLayers[routeName].waypoints)) {
                    app.map.removeLayer(this.routeLayers[routeName].waypoints);
                }
            }
            
            const routeLayer = L.polyline(latlngs, {
                color: routeData.color,
                weight: 6,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(app.map);
            
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
                        
            this.routeLayers[routeName] = {
                route: routeLayer,
                waypoints: waypointsLayer,
                data: routeData
            };
            
            if (!this.activeRoutes.includes(routeName)) {
                this.activeRoutes.push(routeName);
            }
            
            app.map.fitBounds(routeLayer.getBounds());
            
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

    clearAllRoutesSilently() {
        console.log('Clearing all routes silently...');
        
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
        
        this.routeLayers = {};
        this.activeRoutes = [];
        
        document.getElementById('route-details').style.display = 'none';
        document.querySelectorAll('.route-item').forEach(item => {
            item.classList.remove('active');
        });
        
        console.log('All routes cleared silently');
    }
    
    async showAllRoutes() {
        this.clearAllRoutesSilently();
        
        const hour = parseInt(document.getElementById('timeSlider').value);
        let routesLoaded = 0;
        
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
        const currentDetails = document.getElementById('route-details').innerHTML;
        if (currentDetails.includes('Transfer Route')) {
            return;
        }
        
        const detailsDiv = document.getElementById('route-details');
        const distance = routeInfo.distance ? (routeInfo.distance / 1000).toFixed(1) : 'N/A';
        
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

    clearAllRoutes() {
        console.log('Clearing all routes...');
        
        app.clearAllWalkingRoutes();
        
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
        
        this.routeLayers = {};
        this.activeRoutes = [];
        
        document.getElementById('route-details').style.display = 'none';
        document.querySelectorAll('.route-item').forEach(item => {
            item.classList.remove('active');
        });
        
        app.map.setView([13.7565, 121.0583], 13);
        
        console.log('All routes cleared successfully');
        alert('All routes cleared!');
    }
}

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
            
            // Store coordinates for use in other methods
            this.currentStartCoords = startCoords;
            this.currentEndCoords = endCoords;
            
            // Find comprehensive route combinations
            const routeOptions = this.findCompleteRouteCombinations(startCoords, endCoords);
            
            this.displayRouteOptions(routeOptions, start, end, startCoords, endCoords);
            
        } catch (error) {
            console.error('Route planning error:', error);
            document.getElementById('route-options').innerHTML = 
                `<p style="color: #dc3545; text-align: center;">Error: ${error.message}</p>`;
        } finally {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('route-options').style.display = 'block';
        }
    }

    // Find comprehensive route combinations
    findCompleteRouteCombinations(startCoords, endCoords, maxDistance = 3000) {
        const allOptions = [];
        
        console.log('Finding comprehensive route combinations...');
        
        // 1. Direct routes to BatStateU-Alangilan
        const directRoutes = this.findDirectRoutesToBatStateU(startCoords, endCoords, maxDistance);
        allOptions.push(...directRoutes);
        
        // 2. Routes via main terminals/transfer points
        const terminalRoutes = this.findRoutesViaTerminals(startCoords, endCoords, maxDistance);
        allOptions.push(...terminalRoutes);
        
        // 3. Multi-jeepney combinations (2-3 jeepneys)
        const multiJeepneyRoutes = this.findComplexJeepneyCombinations(startCoords, endCoords, maxDistance);
        allOptions.push(...multiJeepneyRoutes);
        
        // 4. Walking + Multiple Jeepneys
        const walkingMultiRoutes = this.findWalkingMultiJeepneyRoutes(startCoords, endCoords, maxDistance);
        allOptions.push(...walkingMultiRoutes);
        
        // Filter and prioritize by cost
        const validOptions = allOptions.filter(option => 
            this.doesRouteReachDestination(option, endCoords) &&
            this.isRouteRealistic(option) &&
            option.totalTime <= 90 // Max 1.5 hours
        );
        
        console.log('Comprehensive routes found:', validOptions.length);
        
        return validOptions
            .sort((a, b) => a.totalFare - b.totalFare) // Sort by cost first
            .slice(0, 8);
    }

    // Find routes specifically to BatStateU-Alangilan
    findDirectRoutesToBatStateU(startCoords, endCoords, maxDistance) {
        const directRoutes = [];
        
        // Routes that go directly to BatStateU-Alangilan area
        const routesToBatStateU = ['Batangas - Alangilan', 'Batangas - Balagtas', 'Batangas - Soro Soro'];
        
        routesToBatStateU.forEach(routeName => {
            const routeData = jeepneyRoutes[routeName];
            if (routeData) {
                const nearStart = this.isNearRoute(startCoords, routeData, maxDistance);
                const nearEnd = this.isNearRoute(endCoords, routeData, 500); // BatStateU should be close
                
                if (nearStart && nearEnd) {
                    const startWalkDistance = this.findDistanceToRoute(startCoords, routeData);
                    const endWalkDistance = this.findDistanceToRoute(endCoords, routeData);
                    
                    if (startWalkDistance <= 2000 && endWalkDistance <= 1000) {
                        const startWalkTime = Math.round(startWalkDistance / 80);
                        const endWalkTime = Math.round(endWalkDistance / 80);
                        
                        const totalTime = startWalkTime + routeData.baseTime + endWalkTime;
                        const totalFare = this.extractFare(routeData.fare);
                        
                        directRoutes.push({
                            type: 'direct_batstateu',
                            routes: [routeName],
                            startWalk: { distance: startWalkDistance, time: startWalkTime },
                            endWalk: { distance: endWalkDistance, time: endWalkTime },
                            totalFare: totalFare,
                            totalTime: Math.round(totalTime),
                            confidence: 'high',
                            reachesDestination: true,
                            description: `Direct to BatStateU via ${routeName}`
                        });
                    }
                }
            }
        });
        
        return directRoutes;
    }

    // Find routes via major terminals/transfer points
    findRoutesViaTerminals(startCoords, endCoords, maxDistance) {
        const terminalRoutes = [];
        
        // Define major transfer points
        const transferPoints = {
            'SM City Batangas': [13.755992307747455, 121.0688025248553],
            'Batangas City Grand Terminal': [13.790637338793799, 121.06163057927537],
            'Golden Gate College': [13.757046128756366, 121.06059676718314],
            'Bago/New Public Market': [13.750063862524781, 121.05566279787223]
        };
        
        // For each transfer point, find routes from start and to destination
        Object.entries(transferPoints).forEach(([pointName, pointCoords]) => {
            // Find routes from start to transfer point
            const routesToTransfer = this.findRoutesBetweenPoints(startCoords, pointCoords, maxDistance);
            // Find routes from transfer point to BatStateU
            const routesFromTransfer = this.findRoutesBetweenPoints(pointCoords, endCoords, maxDistance);
            
            // Combine routes
            routesToTransfer.forEach(toRoute => {
                routesFromTransfer.forEach(fromRoute => {
                    if (toRoute.name !== fromRoute.name) {
                        const routeOption = this.createTerminalTransferRoute(
                            toRoute, fromRoute, pointName, startCoords, endCoords
                        );
                        if (routeOption) terminalRoutes.push(routeOption);
                    }
                });
            });
        });
        
        return terminalRoutes;
    }

    // Find complex jeepney combinations (2-3 jeepneys)
    findComplexJeepneyCombinations(startCoords, endCoords, maxDistance) {
        const complexRoutes = [];
        
        // Get all possible start routes
        const startRoutes = this.findRoutesNearLocation(startCoords, maxDistance);
        
        // Get all possible end routes (to BatStateU)
        const endRoutes = this.findRoutesNearLocation(endCoords, 1000);
        
        // Find 2-jeepney combinations
        startRoutes.forEach(route1 => {
            endRoutes.forEach(route2 => {
                if (route1.name !== route2.name) {
                    // Try direct transfer
                    const transferPoint = this.findBestTransferPoint(route1.data, route2.data);
                    if (transferPoint && transferPoint.walkDistance <= 300) {
                        const routeOption = this.createTwoJeepneyRoute(
                            route1, route2, transferPoint, startCoords, endCoords
                        );
                        if (routeOption) complexRoutes.push(routeOption);
                    }
                    
                    // Try via intermediate route
                    this.findIntermediateRoutes(route1, route2, startCoords, endCoords)
                        .forEach(threeJeepOption => {
                            if (threeJeepOption) complexRoutes.push(threeJeepOption);
                        });
                }
            });
        });
        
        return complexRoutes;
    }

    // Find intermediate routes for 3-jeepney combinations
    findIntermediateRoutes(route1, route2, startCoords, endCoords) {
        const intermediateOptions = [];
        const allRoutes = Object.entries(jeepneyRoutes).map(([name, data]) => ({ name, data }));
        
        allRoutes.forEach(midRoute => {
            if (midRoute.name !== route1.name && midRoute.name !== route2.name) {
                const transfer1 = this.findBestTransferPoint(route1.data, midRoute.data);
                const transfer2 = this.findBestTransferPoint(midRoute.data, route2.data);
                
                if (transfer1 && transfer2 && transfer1.walkDistance <= 300 && transfer2.walkDistance <= 300) {
                    const routeOption = this.createThreeJeepneyRoute(
                        route1, midRoute, route2, transfer1, transfer2, startCoords, endCoords
                    );
                    if (routeOption && routeOption.totalTime <= 60) {
                        intermediateOptions.push(routeOption);
                    }
                }
            }
        });
        
        return intermediateOptions.slice(0, 2); // Limit to 2 best options
    }

    // Find walking + multiple jeepney routes
    findWalkingMultiJeepneyRoutes(startCoords, endCoords, maxDistance) {
        const walkingMultiRoutes = [];
        
        const endRoutes = this.findRoutesNearLocation(endCoords, maxDistance);
        
        endRoutes.forEach(endRoute => {
            const nearestPoint = this.findNearestPointOnRoute(startCoords, endRoute.data);
            const walkDistance = nearestPoint.distance;
            
            // Realistic walking distance: 100m to 1.5km
            if (walkDistance >= 100 && walkDistance <= 1500) {
                const walkTime = Math.round(walkDistance / 80);
                const jeepneyTime = endRoute.data.baseTime * 0.8;
                const totalTime = walkTime + jeepneyTime;
                const totalFare = this.extractFare(endRoute.data.fare);
                
                walkingMultiRoutes.push({
                    type: 'walking_jeepney',
                    routes: [endRoute.name],
                    walking: {
                        distance: walkDistance,
                        time: walkTime,
                        toPoint: nearestPoint.point
                    },
                    totalFare: totalFare,
                    totalTime: Math.round(totalTime),
                    confidence: 'medium',
                    reachesDestination: true
                });
            }
        });
        
        return walkingMultiRoutes;
    }

    // Create terminal transfer route
    createTerminalTransferRoute(toRoute, fromRoute, terminalName, startCoords, endCoords) {
        const startWalkDistance = this.findDistanceToRoute(startCoords, toRoute.data);
        const endWalkDistance = this.findDistanceToRoute(endCoords, fromRoute.data);
        
        if (startWalkDistance > 2000 || endWalkDistance > 1000) return null;
        
        const startWalkTime = Math.round(startWalkDistance / 80);
        const endWalkTime = Math.round(endWalkDistance / 80);
        const transferWaitTime = 5;
        
        const totalTime = startWalkTime + toRoute.data.baseTime + transferWaitTime + 
                         fromRoute.data.baseTime + endWalkTime;
        const totalFare = this.extractFare(toRoute.data.fare) + this.extractFare(fromRoute.data.fare);
        
        return {
            type: 'terminal_transfer',
            routes: [toRoute.name, fromRoute.name],
            terminal: terminalName,
            startWalk: { distance: startWalkDistance, time: startWalkTime },
            endWalk: { distance: endWalkDistance, time: endWalkTime },
            totalFare: totalFare,
            totalTime: Math.round(totalTime),
            confidence: 'high',
            reachesDestination: true,
            description: `Via ${terminalName} transfer point`
        };
    }

    // Create 2-jeepney route
    createTwoJeepneyRoute(startRoute, endRoute, transferPoint, startCoords, endCoords) {
        const startWalkDistance = this.findDistanceToRoute(startCoords, startRoute.data);
        const endWalkDistance = this.findDistanceToRoute(endCoords, endRoute.data);
        
        // Skip if walking distances are unrealistic
        if (startWalkDistance < 50 || startWalkDistance > 2000 || endWalkDistance < 50 || endWalkDistance > 2000) {
            return null;
        }
        
        const startWalkTime = Math.round(startWalkDistance / 80);
        const endWalkTime = Math.round(endWalkDistance / 80);
        const transferWalkTime = Math.round(transferPoint.walkDistance / 80);
        
        const jeepney1Time = startRoute.data.baseTime * 0.6;
        const jeepney2Time = endRoute.data.baseTime * 0.6;
        
        const totalTime = startWalkTime + jeepney1Time + transferWalkTime + jeepney2Time + endWalkTime + 5;
        
        // Skip if total time is too long
        if (totalTime > 60) return null;
        
        const totalFare = this.extractFare(startRoute.data.fare) + this.extractFare(endRoute.data.fare);
        
        return {
            type: 'two_jeepney',
            routes: [startRoute.name, endRoute.name],
            transferPoints: [transferPoint],
            startWalk: { distance: startWalkDistance, time: startWalkTime },
            endWalk: { distance: endWalkDistance, time: endWalkTime },
            totalFare: totalFare,
            totalTime: Math.round(totalTime),
            confidence: 'medium',
            reachesDestination: true,
            description: `${startRoute.name} + ${endRoute.name}`
        };
    }

    // Create 3-jeepney route
    createThreeJeepneyRoute(startRoute, midRoute, endRoute, transfer1, transfer2, startCoords, endCoords) {
        const startWalkDistance = this.findDistanceToRoute(startCoords, startRoute.data);
        const endWalkDistance = this.findDistanceToRoute(endCoords, endRoute.data);
        
        // Skip if walking distances are unrealistic
        if (startWalkDistance < 50 || startWalkDistance > 2000 || endWalkDistance < 50 || endWalkDistance > 2000) {
            return null;
        }
        
        const startWalkTime = Math.round(startWalkDistance / 80);
        const endWalkTime = Math.round(endWalkDistance / 80);
        const transfer1WalkTime = Math.round(transfer1.walkDistance / 80);
        const transfer2WalkTime = Math.round(transfer2.walkDistance / 80);
        
        const jeepney1Time = startRoute.data.baseTime * 0.5;
        const jeepney2Time = midRoute.data.baseTime * 0.5;
        const jeepney3Time = endRoute.data.baseTime * 0.5;
        
        const totalTime = startWalkTime + jeepney1Time + transfer1WalkTime + jeepney2Time + 
                         transfer2WalkTime + jeepney3Time + endWalkTime + 10;
        
        // Only include if it's reasonable (less than 60 minutes)
        if (totalTime <= 60) {
            const totalFare = this.extractFare(startRoute.data.fare) + 
                             this.extractFare(midRoute.data.fare) + 
                             this.extractFare(endRoute.data.fare);
            
            return {
                type: 'three_jeepney',
                routes: [startRoute.name, midRoute.name, endRoute.name],
                transferPoints: [transfer1, transfer2],
                startWalk: { distance: startWalkDistance, time: startWalkTime },
                endWalk: { distance: endWalkDistance, time: endWalkTime },
                totalFare: totalFare,
                totalTime: Math.round(totalTime),
                confidence: 'low',
                reachesDestination: true,
                description: `${startRoute.name} + ${midRoute.name} + ${endRoute.name}`
            };
        }
        
        return null;
    }

    // Check if route is realistic
    isRouteRealistic(routeOption) {
        // Filter out routes with unrealistic walking distances
        if (routeOption.startWalk && routeOption.startWalk.distance < 50) return false;
        if (routeOption.endWalk && routeOption.endWalk.distance < 50) return false;
        
        // Filter out overly complex routes unless necessary
        if (routeOption.type === 'three_jeepney' && routeOption.totalTime > 45) return false;
        
        // Filter out routes that are too long
        if (routeOption.totalTime > 90) return false;
        
        // Filter out routes with unrealistic transfers
        if (routeOption.transferPoints) {
            for (const transfer of routeOption.transferPoints) {
                if (transfer.walkDistance > 500) return false;
            }
        }
        
        return true;
    }

    displayRouteOptions(routeOptions, start, end, startCoords, endCoords) {
        if (routeOptions.length === 0) {
            document.getElementById('route-options').innerHTML = 
                `<p style="color: #dc3545; text-align: center;">No jeepney routes found. Please try a different starting location or check if you're within Batangas City.</p>`;
            return;
        }
        
        let html = `<h5>🚍 Route Options to BatStateU-Alangilan (${routeOptions.length} found):</h5>`;
        
        routeOptions.forEach((option, index) => {
            html += this.formatComprehensiveOption(option, index);
        });
        
        document.getElementById('route-options').innerHTML = html;
    }

    // Format comprehensive route option
    formatComprehensiveOption(option, index) {
        let routeHtml = '';
        
        if (option.type === 'direct_batstateu') {
            routeHtml = this.formatDirectBatStateUOption(option, index);
        } else if (option.type === 'terminal_transfer') {
            routeHtml = this.formatTerminalTransferOption(option, index);
        } else if (option.type === 'walking_jeepney') {
            routeHtml = this.formatWalkingJeepneyOption(option, index);
        } else if (option.type === 'two_jeepney') {
            routeHtml = this.formatTwoJeepneyOption(option, index);
        } else if (option.type === 'three_jeepney') {
            routeHtml = this.formatThreeJeepneyOption(option, index);
        }
        
        return routeHtml;
    }

    // Format direct BatStateU option
    formatDirectBatStateUOption(option, index) {
        const route = option.routes[0];
        const routeData = jeepneyRoutes[route];
        
        return `
            <div class="route-option" onclick="routeManager.createSnappedRoute('${route}', jeepneyRoutes['${route}'])">
                <strong>${index + 1}. ${route} (Direct)</strong>
                <div class="route-info">
                    ${routeData.description}<br>
                    🕐 ${option.totalTime} min • 💰 ${app.formatFare(routeData.fare)} • ✅ Direct to BatStateU
                </div>
            </div>
        `;
    }

    // Format terminal transfer option
    formatTerminalTransferOption(option, index) {
        const route1 = option.routes[0];
        const route2 = option.routes[1];
        
        return `
            <div class="transfer-option">
                <strong>${index + 1}. Via ${option.terminal}</strong>
                <div class="transfer-route">
                    <div class="route-leg">
                        <strong>🚍 ${route1}</strong><br>
                        <small>${jeepneyRoutes[route1].description}</small>
                    </div>
                    <div class="transfer-point">
                        🔄 Transfer at ${option.terminal}
                    </div>
                    <div class="route-leg">
                        <strong>🚍 ${route2}</strong><br>
                        <small>${jeepneyRoutes[route2].description}</small>
                    </div>
                    <div class="route-info">
                        🕐 ${option.totalTime} min • 💰 ₱${option.totalFare}
                    </div>
                    <button class="control-btn success" onclick="event.stopPropagation(); routePlanner.showMultiJeepneyRoute(['${route1}', '${route2}'])">
                        Show Route
                    </button>
                </div>
            </div>
        `;
    }

    // Format walking + jeepney option
    formatWalkingJeepneyOption(option, index) {
        const routeName = option.routes[0];
        const routeData = jeepneyRoutes[routeName];
        
        return `
            <div class="walking-option">
                <strong>${index + 1}. Walk + ${routeName}</strong>
                <div class="transfer-route">
                    <div class="route-leg">
                        <strong>🚶 Walk to Jeepney</strong><br>
                        <small>${Math.round(option.walking.distance)}m • 🕐 ${option.walking.time} min</small>
                    </div>
                    <div class="route-leg">
                        <strong>🚍 ${routeName}</strong><br>
                        <small>${routeData.description}</small><br>
                        🕐 ${Math.round(option.totalTime - option.walking.time)} min • 💰 ${app.formatFare(routeData.fare)}
                    </div>
                    <div class="route-info">
                        🕐 Total: ${option.totalTime} min • 💰 Total: ₱${option.totalFare}
                    </div>
                    <button class="control-btn success" onclick="event.stopPropagation(); routePlanner.showWalkingJeepneyRoute('${routeName}', ${option.walking.distance})">
                        Show Route
                    </button>
                </div>
            </div>
        `;
    }

    // Format 2-jeepney option
    formatTwoJeepneyOption(option, index) {
        const route1 = option.routes[0];
        const route2 = option.routes[1];
        
        return `
            <div class="multi-jeepney-option">
                <strong>${index + 1}. ${route1} + ${route2}</strong>
                <div class="transfer-route">
                    <div class="route-leg">
                        <strong>🚍 ${route1}</strong><br>
                        <small>${jeepneyRoutes[route1].description}</small>
                    </div>
                    <div class="transfer-point">
                        🔄 Transfer
                    </div>
                    <div class="route-leg">
                        <strong>🚍 ${route2}</strong><br>
                        <small>${jeepneyRoutes[route2].description}</small>
                    </div>
                    <div class="route-info">
                        🕐 ${option.totalTime} min • 💰 ₱${option.totalFare}
                    </div>
                    <button class="control-btn success" onclick="event.stopPropagation(); routePlanner.showMultiJeepneyRoute(['${route1}', '${route2}'])">
                        Show Route
                    </button>
                </div>
            </div>
        `;
    }

    // Format 3-jeepney option
    formatThreeJeepneyOption(option, index) {
        const routes = option.routes;
        
        return `
            <div class="multi-jeepney-option">
                <strong>${index + 1}. ${routes[0]} + ${routes[1]} + ${routes[2]}</strong>
                <div class="transfer-route">
                    <div class="route-leg">
                        <strong>🚍 ${routes[0]}</strong><br>
                        <small>${jeepneyRoutes[routes[0]].description}</small>
                    </div>
                    <div class="transfer-point">
                        🔄 Transfer
                    </div>
                    <div class="route-leg">
                        <strong>🚍 ${routes[1]}</strong><br>
                        <small>${jeepneyRoutes[routes[1]].description}</small>
                    </div>
                    <div class="transfer-point">
                        🔄 Transfer
                    </div>
                    <div class="route-leg">
                        <strong>🚍 ${routes[2]}</strong><br>
                        <small>${jeepneyRoutes[routes[2]].description}</small>
                    </div>
                    <div class="route-info">
                        🕐 ${option.totalTime} min • 💰 ₱${option.totalFare}<br>
                        <small>⚠️ Complex route with 2 transfers</small>
                    </div>
                    <button class="control-btn warning" onclick="event.stopPropagation(); routePlanner.showMultiJeepneyRoute(['${routes[0]}', '${routes[1]}', '${routes[2]}'])">
                        Show Complex Route
                    </button>
                </div>
            </div>
        `;
    }

    // ALL HELPER METHODS

    // Find routes between two points
    findRoutesBetweenPoints(point1, point2, maxDistance) {
        return Object.entries(jeepneyRoutes)
            .filter(([routeName, routeData]) => {
                const nearPoint1 = this.isNearRoute(point1, routeData, maxDistance);
                const nearPoint2 = this.isNearRoute(point2, routeData, maxDistance);
                return nearPoint1 && nearPoint2;
            })
            .map(([name, data]) => ({ name, data }));
    }

    // Find routes near location
    findRoutesNearLocation(coords, maxDistance) {
        return Object.entries(jeepneyRoutes)
            .filter(([routeName, routeData]) => this.isNearRoute(coords, routeData, maxDistance))
            .map(([name, data]) => ({ name, data }));
    }

    // Check if location is near route
    isNearRoute(coords, routeData, maxDistance) {
        const distance = this.findDistanceToRoute(coords, routeData);
        return distance <= maxDistance;
    }

    // Find distance to nearest point on route
    findDistanceToRoute(coords, routeData) {
        const nearest = this.findNearestPointOnRoute(coords, routeData);
        return nearest.distance;
    }

    // Find nearest point on route
    findNearestPointOnRoute(coords, routeData) {
        const allPoints = [...routeData.waypoints, ...(routeData.secretWaypoints || [])];
        
        let nearestPoint = null;
        let minDistance = Infinity;
        
        allPoints.forEach(point => {
            const distance = this.calculateDistance(coords, point);
            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = point;
            }
        });
        
        return { point: nearestPoint, distance: minDistance };
    }

    // Find best transfer point between two routes
    findBestTransferPoint(route1, route2) {
        const route1Points = [...route1.waypoints, ...(route1.secretWaypoints || [])];
        const route2Points = [...route2.waypoints, ...(route2.secretWaypoints || [])];
        
        let bestTransfer = null;
        let minDistance = Infinity;
        
        for (const point1 of route1Points) {
            for (const point2 of route2Points) {
                const distance = this.calculateDistance(point1, point2);
                if (distance < minDistance && distance <= 300) {
                    minDistance = distance;
                    bestTransfer = {
                        name: this.findLandmarkName(point1) || 'Transfer Point',
                        coordinates: point1,
                        walkDistance: distance
                    };
                }
            }
        }
        
        return bestTransfer;
    }

    // Find nearest route
    findNearestRoute(coords, maxDistance) {
        let nearestRoute = null;
        let minDistance = Infinity;
        
        Object.entries(jeepneyRoutes).forEach(([routeName, routeData]) => {
            const allPoints = [...routeData.waypoints, ...(routeData.secretWaypoints || [])];
            
            allPoints.forEach(point => {
                const distance = this.calculateDistance(coords, point);
                if (distance < minDistance && distance <= maxDistance) {
                    minDistance = distance;
                    nearestRoute = {
                        name: routeName,
                        data: routeData,
                        distance: distance
                    };
                }
            });
        });
        
        return nearestRoute;
    }

    // Check if transfer is valid
    isValidTransfer(transferPoint) {
        return transferPoint && transferPoint.walkDistance <= 300;
    }

    // Check if route reaches destination
    doesRouteReachDestination(routeOption, endCoords) {
        const lastRouteName = routeOption.routes[routeOption.routes.length - 1];
        const lastRoute = jeepneyRoutes[lastRouteName];
        
        if (!lastRoute) return false;
        
        return this.isNearRoute(endCoords, lastRoute, 800);
    }

    // Calculate distance between coordinates
    calculateDistance(coord1, coord2) {
        const R = 6371000;
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

    // Extract fare from fare string
    extractFare(fareString) {
        const match = fareString.match(/₱?(\d+)/);
        let value = match ? parseInt(match[1], 10) : 15;
        const discountEnabled = document.getElementById('discountToggle')?.checked;
        const discount = discountEnabled ? 2 : 0;
        value = Math.max(value - discount, 0);
        return value;
    }

    // Find landmark name for coordinates
    findLandmarkName(coords) {
        let closestLandmark = null;
        let minDistance = Infinity;
        
        for (const [landmark, landmarkCoords] of Object.entries(allStops)) {
            const distance = this.calculateDistance(coords, landmarkCoords);
            if (distance < minDistance && distance <= 150) {
                minDistance = distance;
                closestLandmark = landmark;
            }
        }
        
        return closestLandmark;
    }

    // Geocode address
    async geocodeAddress(address) {
        const matchedLandmark = this.matchWithLandmarks(address);
        if (matchedLandmark) {
            return allStops[matchedLandmark];
        }
        
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
        
        return [13.7565, 121.0583];
    }

    // Match address with landmarks
    matchWithLandmarks(address) {
        const cleanAddress = address.toLowerCase().trim();
        for (const landmark of Object.keys(allStops)) {
            if (landmark.toLowerCase().includes(cleanAddress) || cleanAddress.includes(landmark.toLowerCase())) {
                return landmark;
            }
        }
        return null;
    }

    // ROUTE DISPLAY METHODS

    async showWalkingJeepneyRoute(routeName, walkDistance) {
        routeManager.clearAllRoutesSilently();
        document.getElementById('loading').style.display = 'block';
        
        try {
            const routeData = jeepneyRoutes[routeName];
            if (routeData) {
                await routeManager.createSnappedRoute(routeName, routeData);
            }
            this.showWalkingJeepneyDetails(routeName, walkDistance);
        } catch (error) {
            console.error('Error showing walking route:', error);
            alert('Error displaying route. Please try again.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    async showMultiJeepneyRoute(routeNames) {
        routeManager.clearAllRoutesSilently();
        document.getElementById('loading').style.display = 'block';
        
        try {
            for (const routeName of routeNames) {
                const routeData = jeepneyRoutes[routeName];
                if (routeData) {
                    await routeManager.createSnappedRoute(routeName, routeData);
                }
            }
            this.showMultiJeepneyDetails(routeNames);
        } catch (error) {
            console.error('Error showing multi-jeepney route:', error);
            alert('Error displaying route. Please try again.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    // DETAILS DISPLAY METHODS

    showWalkingJeepneyDetails(routeName, walkDistance) {
        const routeData = jeepneyRoutes[routeName];
        const walkTime = Math.round(walkDistance / 80);
        const totalTime = walkTime + routeData.baseTime;
        const totalFare = this.extractFare(routeData.fare);
        
        const detailsDiv = document.getElementById('route-details');
        detailsDiv.innerHTML = `
            <h4>🚶 + 🚍 Route Details</h4>
            <div class="route-info">
                <p><strong>Walk:</strong> ${Math.round(walkDistance)}m • ${walkTime} min</p>
                <p><strong>Jeepney (${routeName}):</strong> ${routeData.baseTime} min • ${app.formatFare(routeData.fare)}</p>
                <p><strong>Total:</strong> ${totalTime} min • ₱${totalFare}</p>
            </div>
        `;
        detailsDiv.style.display = 'block';
    }

    showMultiJeepneyDetails(routeNames) {
        const detailsDiv = document.getElementById('route-details');
        
        let totalFare = 0;
        let routeHtml = '';
        
        routeNames.forEach((routeName, index) => {
            const routeData = jeepneyRoutes[routeName];
            if (routeData) {
                totalFare += this.extractFare(routeData.fare);
                
                routeHtml += `
                    <p><strong>Leg ${index + 1}: ${routeName}</strong> • ${routeData.baseTime} min • ${app.formatFare(routeData.fare)}</p>
                `;
            }
        });
        
        const estimatedTime = routeNames.length * 20 + (routeNames.length - 1) * 5;
        
        detailsDiv.innerHTML = `
            <h4>🔄 Multi-Jeepney Route</h4>
            <div class="route-info">
                ${routeHtml}
                <p><strong>Total:</strong> ~${estimatedTime} min • ₱${totalFare}</p>
            </div>
        `;
        detailsDiv.style.display = 'block';
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

// Utility functions
window.resetSystem = function() {
    console.log('Emergency system reset...');
    routeManager.clearAllRoutes();
    document.getElementById('route-options').innerHTML = '';
    document.getElementById('startLocation').value = '';
    document.getElementById('endLocation').value = '';
    alert('System has been reset!');
};

window.clearInputsAndRoutes = function() {
    app.clearLocationAndRoutes();
};

// Add findNearestMainRoutes method to app
app.findNearestMainRoutes = function() {
    if (!this.userLocation) {
        alert('Please use "My Location" first');
        return;
    }
    
    const mainRoutes = Object.entries(jeepneyRoutes)
        .filter(([name, data]) => data.type === 'main')
        .map(([name, data]) => ({ name, data }));
    
    const nearestMainRoutes = this.findRoutesWithinRadius(this.userLocation, 2000, mainRoutes);
    this.displayNearestMainRoutes(nearestMainRoutes);
};

app.displayNearestMainRoutes = function(routes) {
    let html = `<h5>🚍 Nearest Main Jeepney Routes</h5>`;
    
    routes.slice(0, 3).forEach((route, index) => {
        html += `
            <div class="nearest-route-item">
                <div class="route-header">
                    <strong>${index + 1}. ${route.routeName}</strong>
                    <span class="distance-badge">${Math.round(route.distance)}m away</span>
                </div>
                <div class="route-info">
                    ${route.routeData.description}<br>
                    Frequency: ${route.routeData.frequency} • Fare: ${this.formatFare(route.routeData.fare)}
                </div>
                <button class="control-btn success" onclick="routeManager.createSnappedRoute('${route.routeName}', jeepneyRoutes['${route.routeName}'])">
                    Show This Route
                </button>
            </div>
        `;
    });
    
    document.getElementById('route-options').innerHTML = html;
    document.getElementById('route-options').style.display = 'block';
};