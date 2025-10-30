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
        
        // Enhanced: Route boarding validation data
        this.routeBoardingZones = this.initializeBoardingZones();
        this.invalidRouteCombinations = this.initializeInvalidCombinations();
        
        this.init();
    }

    // ENHANCED: Initialize boarding zones for each route
    initializeBoardingZones() {
        return {
            "Batangas - Alangilan": {
                primary: ["Batangas City Grand Terminal", "SM Hypermarket", "BatStateU-Alangilan"],
                secondary: ["Don Ramos", "UB/Hilltop", "Lawas"],
                restricted: ["Sta. Clara Elementary School", "Pier/Port of Batangas"]
            },
            "Batangas - Balagtas": {
                primary: ["Batangas City Grand Terminal", "SM Hypermarket"],
                secondary: ["Don Ramos", "UB/Hilltop", "Lawas", "Traders/Bay Mall"],
                restricted: ["Sta. Clara Elementary School", "Pier/Port of Batangas"]
            },
            "Batangas - Sta. Clara/Pier": {
                primary: ["Sta. Clara Elementary School", "Pier/Port of Batangas", "Luma/Old Market"],
                secondary: ["Bago/New Public Market", "Plaza Mabini"],
                restricted: ["Batangas City Grand Terminal", "SM Hypermarket", "BatStateU-Alangilan"]
            },
            "Batangas - Capitolio-Hospital": {
                primary: ["SM City Batangas", "Batangas Medical Center", "Plaza Mabini"],
                secondary: ["Golden Gate College", "Citimart", "LPU - Batangas"],
                restricted: ["Batangas City Grand Terminal", "Sta. Clara Elementary School"]
            },
            "Batangas - Dagatan (Taysan)": {
                primary: ["Dagatan Jeepney Terminal", "Total Gulod", "LPU - Riverside"],
                secondary: ["SM City Batangas", "Batangas Medical Center"],
                restricted: ["Sta. Clara Elementary School", "Pier/Port of Batangas"]
            },
            "Batangas - Lipa": {
                primary: ["Batangas City Grand Terminal", "Diversion"],
                secondary: ["Waltermart/Lawas", "Philippine Ports Authority"],
                restricted: ["Sta. Clara Elementary School", "UB/Hilltop"]
            },
            "Batangas - Soro Soro": {
                primary: ["Batangas City Grand Terminal", "SM Hypermarket"],
                secondary: ["Don Ramos", "UB/Hilltop", "Lawas"],
                restricted: ["Sta. Clara Elementary School", "Pier/Port of Batangas"]
            },
            "Batangas - Balete": {
                primary: ["Batangas City Grand Terminal", "Diversion"],
                secondary: ["Waltermart/Lawas", "Philippine Ports Authority"],
                restricted: ["Sta. Clara Elementary School", "UB/Hilltop"]
            },
            "Batangas - Libjo/San-Isidro/Tabangao": {
                primary: ["Tierra Verde Subdivision", "SM City Batangas"],
                secondary: ["Plaza Mabini", "Golden Gate College"],
                restricted: ["Batangas City Grand Terminal", "Sta. Clara Elementary School"]
            },
            "Batangas - Bauan": {
                primary: ["Batangas City Grand Terminal", "Diversion"],
                secondary: ["Waltermart/Lawas", "Philippine Ports Authority"],
                restricted: ["Sta. Clara Elementary School", "UB/Hilltop"]
            }
        };
    }

    // ENHANCED: Initialize invalid route combinations
    initializeInvalidCombinations() {
        return {
            "UB/Hilltop": ["Batangas - Sta. Clara/Pier", "Batangas - Libjo/San-Isidro/Tabangao"],
            "Sta. Clara Elementary School": ["Batangas - Alangilan", "Batangas - Balagtas", "Batangas - Lipa", "Batangas - Soro Soro", "Batangas - Balete", "Batangas - Bauan"],
            "BatStateU-Alangilan": ["Batangas - Sta. Clara/Pier"],
            "Batangas City Grand Terminal": ["Batangas - Sta. Clara/Pier"],
            "SM Hypermarket": ["Batangas - Sta. Clara/Pier"]
        };
    }

    // ENHANCED: Check if a route can be boarded from a specific location
    canBoardRouteFromLocation(locationName, routeName) {
        // If location is "My Location", we'll handle it differently in route planning
        if (locationName.includes("My Location")) {
            return true; // Will be validated by coordinates later
        }

        // Check invalid combinations first
        if (this.invalidRouteCombinations[locationName] && 
            this.invalidRouteCombinations[locationName].includes(routeName)) {
            console.log(`Invalid combination: Cannot board ${routeName} from ${locationName}`);
            return false;
        }

        // Check if location is in route's boarding zones
        const routeZones = this.routeBoardingZones[routeName];
        if (!routeZones) return true; // If no specific data, allow it

        if (routeZones.primary.includes(locationName) || 
            routeZones.secondary.includes(locationName)) {
            return true;
        }

        if (routeZones.restricted.includes(locationName)) {
            return false;
        }

        // If location not explicitly listed, allow with warning
        console.log(`Location ${locationName} not explicitly defined for ${routeName}, allowing with caution`);
        return true;
    }

    // ENHANCED: Get boarding recommendation for a location-route combination
    getBoardingRecommendation(locationName, routeName) {
        if (!this.canBoardRouteFromLocation(locationName, routeName)) {
            return {
                valid: false,
                message: `❌ Cannot board ${routeName} from ${locationName}`,
                type: "invalid"
            };
        }

        const routeZones = this.routeBoardingZones[routeName];
        if (!routeZones) {
            return {
                valid: true,
                message: `✅ Can board ${routeName} from ${locationName}`,
                type: "unknown"
            };
        }

        if (routeZones.primary.includes(locationName)) {
            return {
                valid: true,
                message: `✅ Primary boarding point for ${routeName}`,
                type: "primary"
            };
        }

        if (routeZones.secondary.includes(locationName)) {
            return {
                valid: true,
                message: `✅ Can board ${routeName} from ${locationName}`,
                type: "secondary"
            };
        }

        return {
            valid: true,
            message: `⚠️ May need to walk to board ${routeName}`,
            type: "walking"
        };
    }

    init() {
        this.initializeMap();
        this.initializeEventListeners();
        this.initializeUI();
        
        console.log('Batangas Jeepney System initialized with enhanced boarding validation');
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
            
            // ENHANCED: Add boarding information
            const startLocation = document.getElementById('startLocation').value;
            let boardingInfo = '';
            if (startLocation && !startLocation.includes('My Location')) {
                const recommendation = this.getBoardingRecommendation(startLocation, routeName);
                boardingInfo = `<div class="boarding-info ${recommendation.type}">${recommendation.message}</div>`;
            }
            
            routeItem.innerHTML = `
                <div style="font-weight: bold;">${routeName}</div>
                <div class="route-info">
                    <span class="route-type-badge type-${routeData.type}">${routeData.type}</span>
                    <span style="background: ${routeData.color}; padding: 2px 6px; border-radius: 3px; color: ${routeData.color === '#ffffff' ? 'black' : 'white'}; font-size: 0.7em;">${colorName}</span><br>
                    Frequency: ${routeData.frequency}<br>
                    Fare: ${this.formatFare(routeData.fare)} | Stops: ${routeData.stops}
                    ${boardingInfo}
                </div>
            `;
            
            routeItem.addEventListener('click', () => {
                const startLocation = document.getElementById('startLocation').value;
                if (startLocation && !startLocation.includes('My Location')) {
                    const recommendation = this.getBoardingRecommendation(startLocation, routeName);
                    if (!recommendation.valid) {
                        this.showNotification(recommendation.message, 'error');
                        return;
                    }
                }
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

    // ENHANCED: Find nearest jeepney routes with boarding validation
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
                    
                    const routesInRadius = this.findValidatedRoutesWithinRadius(userLocation, radius);
                    
                    if (routesInRadius.length > 0) {
                        this.displayNearestRoutes(routesInRadius, userLocation, radius);
                        break;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                if (this.nearestRoutes.length === 0) {
                    this.showNotification('❌ No accessible jeepney routes found within 2km. Try a different location.', 'error');
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

    // ENHANCED: Find validated routes within radius
    findValidatedRoutesWithinRadius(userLocation, radius) {
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
                // Check if this is a valid boarding point for the route
                const nearestLandmark = this.findNearestLandmark(userLocation);
                const canBoard = !nearestLandmark || this.canBoardRouteFromLocation(nearestLandmark, routeName);
                
                nearbyRoutes.push({
                    routeName: routeName,
                    routeData: routeData,
                    distance: minDistance,
                    closestPoint: closestPoint,
                    recommendation: this.getTransportRecommendation(minDistance),
                    canBoard: canBoard,
                    boardingNote: canBoard ? '' : `Note: May require walking to boarding point`
                });
            }
        });
        
        // Sort by accessibility and distance
        return nearbyRoutes
            .sort((a, b) => {
                // Prioritize routes that can be boarded directly
                if (a.canBoard && !b.canBoard) return -1;
                if (!a.canBoard && b.canBoard) return 1;
                // Then by distance
                return a.distance - b.distance;
            })
            .slice(0, 5);
    }

    // NEW: Find nearest landmark to coordinates
    findNearestLandmark(coords) {
        let nearestLandmark = null;
        let minDistance = Infinity;
        
        for (const [landmark, landmarkCoords] of Object.entries(allStops)) {
            const distance = this.calculateDistance(coords, landmarkCoords);
            if (distance < minDistance && distance <= 200) { // Within 200m
                minDistance = distance;
                nearestLandmark = landmark;
            }
        }
        
        return nearestLandmark;
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
            const boardingClass = route.canBoard ? 'boarding-valid' : 'boarding-warning';
            
            html += `
                <div class="nearest-route-item ${boardingClass}">
                    <div class="route-header">
                        <strong>${index + 1}. ${route.routeName}</strong>
                        <span class="distance-badge">${Math.round(route.distance)}m away</span>
                    </div>
                    <div class="recommendation" style="background: ${rec.color}20; border-left: 4px solid ${rec.color}; padding: 8px; margin: 5px 0; border-radius: 4px;">
                        <strong>${rec.message}</strong>
                        <br>🕐 ${rec.time} min walking
                    </div>
                    ${!route.canBoard ? `<div class="boarding-warning-note">${route.boardingNote}</div>` : ''}
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

// Enhanced Route Manager with boarding validation
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
        
        // ENHANCED: Add boarding information
        const startLocation = document.getElementById('startLocation').value;
        let boardingInfo = '';
        if (startLocation && !startLocation.includes('My Location')) {
            const recommendation = app.getBoardingRecommendation(startLocation, routeName);
            boardingInfo = `
                <div class="boarding-details ${recommendation.type}">
                    <strong>Boarding:</strong> ${recommendation.message}
                </div>
            `;
        }
        
        detailsDiv.innerHTML = `
            <h4>${routeName}</h4>
            <p><strong>Description:</strong> ${routeData.description}</p>
            <p><strong>Distance:</strong> ${distance} km</p>
            <p><strong>Estimated Time:</strong> ${totalMinutes} minutes</p>
            <p><strong>Traffic:</strong> <span class="traffic-indicator ${trafficClass}"></span>${traffic.level.toUpperCase()}</p>
            <p><strong>Frequency:</strong> ${routeData.frequency}</p>
            <p><strong>Fare:</strong> ${app.formatFare(routeData.fare)}</p>
            <p><strong>Operator:</strong> ${routeData.operator}</p>
            ${boardingInfo}
            
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

// ENHANCED RoutePlanner Class with Improved Boarding Validation
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
            
            // ENHANCED: Find route combinations with boarding validation
            const routeOptions = this.findValidatedRouteCombinations(start, startCoords, endCoords);
            
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

    // ENHANCED: Find route combinations with boarding validation
    findValidatedRouteCombinations(startLocation, startCoords, endCoords, maxDistance = 1500) {
        const allOptions = [];
        
        console.log('Finding validated route combinations with boarding checks...');
        
        // 1. Direct routes with boarding validation
        const directRoutes = this.findValidatedDirectRoutes(startLocation, startCoords, endCoords, maxDistance);
        allOptions.push(...directRoutes);
        
        // 2. Walking + Single Jeepney routes with boarding validation
        const walkingJeepneyRoutes = this.findValidatedWalkingJeepneyRoutes(startLocation, startCoords, endCoords, maxDistance);
        allOptions.push(...walkingJeepneyRoutes);
        
        // 3. Transfer routes with boarding validation
        const transferRoutes = this.findValidatedTransferRoutes(startLocation, startCoords, endCoords, maxDistance);
        allOptions.push(...transferRoutes);
        
        // Filter out invalid options and prioritize
        const validOptions = allOptions.filter(option => 
            option.valid !== false && 
            option.totalTime <= 90
        );
        
        console.log('Validated routes found:', validOptions.length);
        
        return validOptions
            .sort((a, b) => {
                // Prioritize direct routes
                if (a.type === 'direct_batstateu' && b.type !== 'direct_batstateu') return -1;
                if (b.type === 'direct_batstateu' && a.type !== 'direct_batstateu') return 1;
                // Then by total fare
                return a.totalFare - b.totalFare;
            })
            .slice(0, 6);
    }

    // ENHANCED: Find direct routes with boarding validation
    findValidatedDirectRoutes(startLocation, startCoords, endCoords, maxDistance) {
        const directRoutes = [];
        
        Object.entries(jeepneyRoutes).forEach(([routeName, routeData]) => {
            // Check boarding validity
            let boardingValid = true;
            let boardingMessage = "✅ Can board directly";
            
            if (!startLocation.includes('My Location')) {
                const recommendation = app.getBoardingRecommendation(startLocation, routeName);
                boardingValid = recommendation.valid;
                boardingMessage = recommendation.message;
            }
            
            if (boardingValid) {
                const servesStart = this.doesRouteServeLocation(startCoords, routeData, maxDistance);
                const servesEnd = this.doesRouteServeLocation(endCoords, routeData, 1000);
                
                if (servesStart && servesEnd) {
                    const startWalkDistance = this.findDistanceToRoute(startCoords, routeData);
                    const endWalkDistance = this.findDistanceToRoute(endCoords, routeData);
                    
                    if (startWalkDistance <= 1000 && endWalkDistance <= 800) {
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
                            description: `Direct to BatStateU via ${routeName}`,
                            validated: true,
                            boardingInfo: boardingMessage,
                            valid: true
                        });
                    }
                }
            } else {
                console.log(`Skipping ${routeName} - boarding not valid: ${boardingMessage}`);
            }
        });
        
        return directRoutes;
    }

    // ENHANCED: Find walking + jeepney routes with boarding validation
    findValidatedWalkingJeepneyRoutes(startLocation, startCoords, endCoords, maxDistance) {
        const walkingRoutes = [];
        
        Object.entries(jeepneyRoutes).forEach(([routeName, routeData]) => {
            const servesEnd = this.doesRouteServeLocation(endCoords, routeData, 1000);
            
            if (servesEnd) {
                const nearestPoint = this.findNearestPointOnRoute(startCoords, routeData);
                const walkDistance = nearestPoint.distance;
                
                // Check if walking is reasonable and route serves destination
                if (walkDistance >= 50 && walkDistance <= 1500) {
                    const walkTime = Math.round(walkDistance / 80);
                    const jeepneyTime = routeData.baseTime * 0.8;
                    const totalTime = walkTime + jeepneyTime;
                    const totalFare = this.extractFare(routeData.fare);
                    
                    // Check boarding validity for the actual boarding point
                    const nearestLandmark = app.findNearestLandmark(nearestPoint.point);
                    let boardingMessage = "🚶 Walk to boarding point";
                    
                    if (nearestLandmark) {
                        const recommendation = app.getBoardingRecommendation(nearestLandmark, routeName);
                        boardingMessage = recommendation.message;
                    }
                    
                    walkingRoutes.push({
                        type: 'walking_jeepney',
                        routes: [routeName],
                        walking: {
                            distance: walkDistance,
                            time: walkTime,
                            toPoint: nearestPoint.point
                        },
                        totalFare: totalFare,
                        totalTime: Math.round(totalTime),
                        confidence: 'medium',
                        reachesDestination: true,
                        validated: true,
                        boardingInfo: boardingMessage,
                        valid: true
                    });
                }
            }
        });
        
        return walkingRoutes;
    }

    // ENHANCED: Find transfer routes with boarding validation
    findValidatedTransferRoutes(startLocation, startCoords, endCoords, maxDistance) {
        const transferRoutes = [];
        
        // Get routes near start location
        const startRoutes = this.findRoutesNearLocation(startCoords, maxDistance);
        // Get routes that serve the destination
        const endRoutes = this.findRoutesNearLocation(endCoords, 1000);
        
        startRoutes.forEach(startRoute => {
            endRoutes.forEach(endRoute => {
                if (startRoute.name !== endRoute.name) {
                    // Check if both routes can be boarded
                    let startBoardingValid = true;
                    let endBoardingValid = true;
                    
                    if (!startLocation.includes('My Location')) {
                        const startRecommendation = app.getBoardingRecommendation(startLocation, startRoute.name);
                        startBoardingValid = startRecommendation.valid;
                    }
                    
                    if (startBoardingValid) {
                        const transferPoint = this.findBestTransferPoint(startRoute.data, endRoute.data);
                        if (transferPoint && transferPoint.walkDistance <= 300) {
                            const routeOption = this.createTwoJeepneyRoute(
                                startRoute, endRoute, transferPoint, startCoords, endCoords
                            );
                            if (routeOption) {
                                routeOption.validated = true;
                                routeOption.boardingInfo = "🔄 Transfer required";
                                routeOption.valid = true;
                                transferRoutes.push(routeOption);
                            }
                        }
                    }
                }
            });
        });
        
        return transferRoutes;
    }

    // ... (KEEP ALL EXISTING HELPER METHODS, they remain the same)
    doesRouteServeLocation(locationCoords, routeData, maxDistance) {
        const allPoints = [...routeData.waypoints, ...(routeData.secretWaypoints || [])];
        
        // Find nearest point on route
        const nearestPoint = this.findNearestPointOnRoute(locationCoords, routeData);
        
        // Must be within reasonable distance
        return nearestPoint.distance <= maxDistance;
    }

    findRoutesNearLocation(coords, maxDistance) {
        return Object.entries(jeepneyRoutes)
            .filter(([routeName, routeData]) => this.isNearRoute(coords, routeData, maxDistance))
            .map(([name, data]) => ({ name, data }));
    }

    isNearRoute(coords, routeData, maxDistance) {
        const distance = this.findDistanceToRoute(coords, routeData);
        return distance <= maxDistance;
    }

    findDistanceToRoute(coords, routeData) {
        const nearest = this.findNearestPointOnRoute(coords, routeData);
        return nearest.distance;
    }

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
                        name: app.findNearestLandmark(point1) || 'Transfer Point',
                        coordinates: point1,
                        walkDistance: distance
                    };
                }
            }
        }
        
        return bestTransfer;
    }

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

    extractFare(fareString) {
        const match = fareString.match(/₱?(\d+)/);
        let value = match ? parseInt(match[1], 10) : 15;
        const discountEnabled = document.getElementById('discountToggle')?.checked;
        const discount = discountEnabled ? 2 : 0;
        value = Math.max(value - discount, 0);
        return value;
    }

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

    matchWithLandmarks(address) {
        const cleanAddress = address.toLowerCase().trim();
        for (const landmark of Object.keys(allStops)) {
            if (landmark.toLowerCase().includes(cleanAddress) || cleanAddress.includes(landmark.toLowerCase())) {
                return landmark;
            }
        }
        return null;
    }

    // ENHANCED: Display route options with boarding information
    displayRouteOptions(routeOptions, start, end, startCoords, endCoords) {
        if (routeOptions.length === 0) {
            document.getElementById('route-options').innerHTML = 
                `<div class="no-routes-found">
                    <h5>❌ No Valid Routes Found</h5>
                    <p>No accessible jeepney routes found from <strong>${start}</strong> to <strong>${end}</strong>.</p>
                    <p><strong>Possible reasons:</strong></p>
                    <ul>
                        <li>Your starting location may not be served by jeepneys going to BatStateU</li>
                        <li>You may need to walk to a different boarding point</li>
                        <li>Try using "My Location" for more accurate results</li>
                    </ul>
                    <button class="control-btn secondary" onclick="app.useMyLocationWithRoutes('start', event)">📍 Use My Location</button>
                </div>`;
            return;
        }
        
        let html = `<h5>🚍 Route Options to BatStateU-Alangilan (${routeOptions.length} found):</h5>`;
        
        routeOptions.forEach((option, index) => {
            html += this.formatValidatedOption(option, index);
        });
        
        document.getElementById('route-options').innerHTML = html;
    }

    // ENHANCED: Format validated route option
    formatValidatedOption(option, index) {
        let boardingBadge = '';
        if (option.boardingInfo) {
            const badgeClass = option.boardingInfo.includes('❌') ? 'boarding-invalid' : 
                             option.boardingInfo.includes('⚠️') ? 'boarding-warning' : 'boarding-valid';
            boardingBadge = `<div class="boarding-badge ${badgeClass}">${option.boardingInfo}</div>`;
        }

        if (option.type === 'direct_batstateu') {
            const route = option.routes[0];
            const routeData = jeepneyRoutes[route];
            
            return `
                <div class="route-option validated-route" onclick="routeManager.createSnappedRoute('${route}', jeepneyRoutes['${route}'])">
                    <strong>${index + 1}. ${route} (Direct)</strong>
                    ${boardingBadge}
                    <div class="route-info">
                        ${routeData.description}<br>
                        🕐 ${option.totalTime} min • 💰 ${app.formatFare(routeData.fare)} • ✅ Direct to BatStateU
                    </div>
                </div>
            `;
        } else if (option.type === 'walking_jeepney') {
            const routeName = option.routes[0];
            const routeData = jeepneyRoutes[routeName];
            
            return `
                <div class="walking-option validated-route">
                    <strong>${index + 1}. Walk + ${routeName}</strong>
                    ${boardingBadge}
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
        } else if (option.type === 'two_jeepney') {
            const route1 = option.routes[0];
            const route2 = option.routes[1];
            
            return `
                <div class="multi-jeepney-option validated-route">
                    <strong>${index + 1}. ${route1} + ${route2}</strong>
                    ${boardingBadge}
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
        
        return '';
    }

    // ... (KEEP ALL OTHER EXISTING METHODS)
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
    
    const nearestMainRoutes = this.findValidatedRoutesWithinRadius(this.userLocation, 2000, mainRoutes);
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