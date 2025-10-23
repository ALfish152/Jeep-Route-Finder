// script.js

// Initialize the map centered on Batangas City
const map = L.map('map').setView([13.7565, 121.0583], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Traffic layer (using OpenStreetMap-based traffic service)
let trafficLayer = null;

// Routing service endpoints
const ROUTING_SERVICES = {
    OSRM: 'https://router.project-osrm.org/route/v1/driving/',
    GRAPH_HOPPER: 'https://graphhopper.com/api/1/route?', // Note: Requires API key
    MAPBOX: 'https://api.mapbox.com/directions/v5/mapbox/driving/' // Requires API key
};

// Current routing service (fallback to OSRM)
let currentRoutingService = ROUTING_SERVICES.OSRM;

// Traffic patterns for Batangas City (simulated data)
const TRAFFIC_PATTERNS = {
    morning_rush: { start: 7, end: 9, multiplier: 1.8, level: 'high' },
    evening_rush: { start: 17, end: 19, multiplier: 1.6, level: 'high' },
    lunch_time: { start: 12, end: 13, multiplier: 1.3, level: 'medium' },
    normal: { multiplier: 1.0, level: 'low' }
};

// Add geocoder for address search
L.Control.geocoder({
    defaultMarkGeocode: false
})
.on('markgeocode', function(e) {
    const latlng = e.geocode.center;
    L.marker(latlng).addTo(map)
        .bindPopup(e.geocode.name)
        .openPopup();
    map.setView(latlng, 16);
})
.addTo(map);

// Jeepney routes with waypoints and SECRET VIA POINTS
const jeepneyRoutes = {
    "City Proper - Alangilan": {
        type: "main",
        color: "#ff4444",
        waypoints: [
            [13.79044, 121.06232], // City Proper - Grand Terminal
            [13.7689, 121.0672]  // Alangilan Public Market
        ],
        // SECRET VIA POINTS - these force the route through specific roads
        secretWaypoints: [
            [13.78512, 121.06345], // Forces route through specific street
            [13.77983, 121.06478], // Another control point
            [13.77345, 121.06612]  // Final control before destination
        ],
        description: "Connects city center to Alangilan district",
        frequency: "Every 5-10 minutes",
        fare: "₱15-20",
        baseTime: 15,
        stops: 8
    },
    "City Proper - Balagtas": {
        type: "main",
        color: "#ff4444",
        waypoints: [
            [13.7585, 121.0593], // City Proper
            [13.7681, 121.0483]  // Balagtas Crossing
        ],
        // SECRET VIA POINTS
        secretWaypoints: [
            [13.7618, 121.0556], // Kumintang Ibaba - now a via point
            [13.7645, 121.0521], // Forces specific road
            [13.7668, 121.0498]  // Approach to Balagtas
        ],
        description: "Main route to Balagtas via Kumintang",
        frequency: "Every 8-12 minutes",
        fare: "₱12-18",
        baseTime: 12,
        stops: 6
    },
    "City Proper - Lipa City": {
        type: "secondary",
        color: "#44ff44",
        waypoints: [
            [13.7585, 121.0593], // City Proper
            [13.7389, 121.0412]  // Towards Lipa boundary
        ],
        // SECRET VIA POINTS
        secretWaypoints: [
            [13.7521, 121.0534], // Batangas National High School
            [13.7456, 121.0478], // Sto. Niño
            [13.7412, 121.0445]  // Additional control point
        ],
        description: "Inter-city route to Lipa City",
        frequency: "Every 15-20 minutes",
        fare: "₱25-35",
        baseTime: 25,
        stops: 12
    },
    "Pallocan - Calicanto": {
        type: "feeder",
        color: "#4444ff",
        waypoints: [
            [13.7734, 121.0721], // Pallocan West
            [13.7625, 121.0624]  // Calicanto Bridge
        ],
        // SECRET VIA POINTS
        secretWaypoints: [
            [13.7698, 121.0689], // Alangilan Proper
            [13.7665, 121.0652], // Mid-point control
            [13.7641, 121.0634]  // Approach to Calicanto
        ],
        description: "Feeder route connecting Pallocan to city center",
        frequency: "Every 10-15 minutes",
        fare: "₱10-15",
        baseTime: 10,
        stops: 5
    },
    "Batangas Port - SM City Batangas": {
        type: "secondary",
        color: "#44ff44",
        waypoints: [
            [13.753814, 121.044865], // Batangas Port (START)
            [13.75365830597326, 121.04496357671681], // Sta. Clara Elementary School (END)
        ],
        // SECRET VIA POINTS - In logical geographical order
        secretWaypoints: [
            // First leg: From Port to Pablo Borbon area
            [13.755399213088522, 121.05284670017338], // Pablo Borbon
            [13.757288183384444, 121.05464290650227], // Old Market
            
            [13.7538287755057, 121.05688674682604],   // New Public Market
            
            // Additional control points to shape the route
            [13.751603010281206, 121.05685416175206],
            [13.749664640774014, 121.05387154538934],
            [13.746996751097099, 121.05088892895542],
            
            // Final approach to end point
            [13.7540, 121.0470], // Control point near end
        ],
        description: "Port to mall route via city proper",
        frequency: "Every 7-10 minutes",
        fare: "₱15-20",
        baseTime: 8,
        stops: 4
    },
    "New Route - Circular Route": {
        type: "special",
        color: "#ff44ff",
        waypoints: [
            [13.7585, 121.0593], // Start: City Proper
            [13.7585, 121.0593]  // End: City Proper (circular)
        ],
        // SECRET VIA POINTS - Creates a circular route
        secretWaypoints: [
            [13.7632, 121.0621], // North point
            [13.7618, 121.0556], // West point  
            [13.7521, 121.0534], // South point
            [13.7542, 121.0678]  // East point
        ],
        description: "Circular route around key city points",
        frequency: "Every 15 minutes",
        fare: "₱20-25",
        baseTime: 30,
        stops: 10
    }
};

let routeLayers = {};
let activeRoute = null;
let secretWaypointsLayer = null; // Layer for debugging secret waypoints

// Function to combine waypoints and secret waypoints for routing
function getAllRoutingPoints(routeData) {
    if (!routeData.secretWaypoints || routeData.secretWaypoints.length === 0) {
        return routeData.waypoints;
    }
    
    // Combine waypoints and secret waypoints, keeping start/end as main waypoints
    const allPoints = [routeData.waypoints[0]]; // Start point
    
    // Add all secret waypoints as via points
    allPoints.push(...routeData.secretWaypoints);
    
    // Add end point
    allPoints.push(routeData.waypoints[routeData.waypoints.length - 1]);
    
    return allPoints;
}

// Function to get traffic multiplier based on time of day
function getTrafficMultiplier(hour) {
    for (const [period, data] of Object.entries(TRAFFIC_PATTERNS)) {
        if (period !== 'normal' && hour >= data.start && hour <= data.end) {
            return data;
        }
    }
    return TRAFFIC_PATTERNS.normal;
}

// Function to calculate ETA with traffic considerations
function calculateETA(routeData, baseDuration, hour) {
    const traffic = getTrafficMultiplier(hour);
    const trafficAdjustedTime = baseDuration * traffic.multiplier;
    
    // Add time for jeepney stops (30 seconds per stop)
    const stopTime = routeData.stops * 0.5;
    
    const totalMinutes = Math.round(trafficAdjustedTime + stopTime);
    
    return {
        minutes: totalMinutes,
        trafficLevel: traffic.level,
        baseTime: baseDuration,
        trafficDelay: Math.round(trafficAdjustedTime - baseDuration)
    };
}

// Function to get route with ETA using ALL points (waypoints + secret waypoints)
async function getRouteWithETA(waypoints, secretWaypoints, hour) {
    try {
        document.getElementById('loading').style.display = 'block';
        
        // Combine all points for routing
        const allPoints = [waypoints[0], ...secretWaypoints, waypoints[waypoints.length - 1]];
        
        // Convert waypoints to OSRM format
        const coordinates = allPoints.map(wp => `${wp[1]},${wp[0]}`).join(';');
        
        const response = await fetch(
            `${currentRoutingService}${coordinates}?overview=full&geometries=geojson`
        );
        
        if (!response.ok) {
            throw new Error('Routing failed');
        }
        
        const data = await response.json();
        
        if (data.code !== 'Ok') {
            throw new Error('Route not found');
        }
        
        return data.routes[0];
    } catch (error) {
        console.error('Routing error:', error);
        // Fallback: create straight line if routing fails
        return {
            geometry: {
                type: 'LineString',
                coordinates: waypoints.map(wp => [wp[1], wp[0]])
            },
            distance: 0,
            duration: 0
        };
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Function to toggle secret waypoints visibility (for debugging)
function toggleSecretWaypoints() {
    if (secretWaypointsLayer) {
        map.removeLayer(secretWaypointsLayer);
        secretWaypointsLayer = null;
    } else {
        secretWaypointsLayer = L.layerGroup().addTo(map);
        
        // Add all secret waypoints to map for debugging
        Object.values(jeepneyRoutes).forEach(routeData => {
            if (routeData.secretWaypoints) {
                routeData.secretWaypoints.forEach((point, index) => {
                    L.circleMarker(point, {
                        radius: 6,
                        color: '#ff0000',
                        fillColor: '#ff0000',
                        fillOpacity: 0.7,
                        weight: 2
                    })
                    .bindPopup(`Secret Waypoint ${index + 1}`)
                    .addTo(secretWaypointsLayer);
                });
            }
        });
    }
}

// Function to create snapped route with ETA using secret waypoints
async function createSnappedRoute(routeName, routeData) {
    const hour = parseInt(document.getElementById('timeSlider').value);
    
    // Clear previous active route
    if (activeRoute) {
        map.removeLayer(activeRoute);
    }
    
    // Get the snapped route using ALL points
    const route = await getRouteWithETA(
        routeData.waypoints, 
        routeData.secretWaypoints || [], 
        hour
    );
    
    // Convert GeoJSON coordinates to LatLng format
    const latlngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    
    // Calculate ETA with traffic
    const baseDuration = route.duration ? Math.round(route.duration / 60) : routeData.baseTime;
    const eta = calculateETA(routeData, baseDuration, hour);
    
    // Create the polyline
    activeRoute = L.polyline(latlngs, {
        color: routeData.color,
        weight: 6,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);
    
    // Add ONLY the main waypoint markers (not secret ones)
    const waypointsLayer = L.layerGroup().addTo(map);
    routeData.waypoints.forEach((waypoint, index) => {
        L.marker(waypoint)
            .bindPopup(`
                <b>${index === 0 ? 'Start' : index === routeData.waypoints.length - 1 ? 'End' : 'Stop ' + index}</b><br>
                <b>Route:</b> ${routeName}<br>
                <b>Type:</b> ${routeData.type}
            `)
            .addTo(waypointsLayer);
    });
    
    // Store the layer for management
    routeLayers[routeName] = {
        route: activeRoute,
        waypoints: waypointsLayer,
        eta: eta
    };
    
    // Fit map to show the entire route
    map.fitBounds(activeRoute.getBounds());
    
    // Update route details with ETA
    updateRouteDetails(routeName, routeData, route, eta);
    
    // Update active state in sidebar
    updateActiveRoute(routeName);
}

// Function to update route details with ETA
function updateRouteDetails(routeName, routeData, routeInfo, eta) {
    const detailsDiv = document.getElementById('route-details');
    const distance = routeInfo.distance ? (routeInfo.distance / 1000).toFixed(1) : 'N/A';
    const currentHour = parseInt(document.getElementById('timeSlider').value);
    const timeDisplay = document.getElementById('timeDisplay').textContent;
    
    const trafficClass = `traffic-${eta.trafficLevel}`;
    
    // Show if secret waypoints are being used
    const secretPointsInfo = routeData.secretWaypoints ? 
        `<p><strong>Route Control Points:</strong> ${routeData.secretWaypoints.length} hidden points</p>` : 
        '';
    
    detailsDiv.innerHTML = `
        <h4>${routeName}</h4>
        <p><strong>Description:</strong> ${routeData.description}</p>
        <p><strong>Distance:</strong> ${distance} km</p>
        ${secretPointsInfo}
        
        <div class="eta-info">
            <h5>🚦 Estimated Travel Time</h5>
            <p><strong>Total Time:</strong> ${eta.minutes} minutes</p>
            <p><strong>Traffic Conditions:</strong> 
                <span class="traffic-indicator ${trafficClass}"></span>
                ${eta.trafficLevel.toUpperCase()}
            </p>
            <p><strong>Base Time:</strong> ${eta.baseTime} minutes</p>
            <p><strong>Traffic Delay:</strong> +${eta.trafficDelay} minutes</p>
            <p><strong>Departure Time:</strong> ${timeDisplay}</p>
        </div>
        
        <p><strong>Frequency:</strong> ${routeData.frequency}</p>
        <p><strong>Fare Range:</strong> ${routeData.fare}</p>
        <p><strong>Number of Stops:</strong> ${routeData.stops || 'N/A'}</p>
        <p><strong>Route Type:</strong> ${routeData.type}</p>
    `;
    detailsDiv.style.display = 'block';
}

// Function to toggle traffic layer
function toggleTrafficLayer() {
    const button = document.getElementById('trafficToggle');
    
    if (trafficLayer) {
        map.removeLayer(trafficLayer);
        trafficLayer = null;
        button.textContent = 'Show Traffic';
    } else {
        // Using OpenStreetMap-based traffic tiles (example)
        trafficLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap France | Traffic Data'
        }).addTo(map);
        button.textContent = 'Hide Traffic';
    }
}

// Function to show all routes
async function showAllRoutes() {
    clearRoutes();
    const hour = parseInt(document.getElementById('timeSlider').value);
    
    for (const [routeName, routeData] of Object.entries(jeepneyRoutes)) {
        const route = await getRouteWithETA(
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
        }).addTo(map);
        
        // Calculate ETA for this route
        const baseDuration = route.duration ? Math.round(route.duration / 60) : routeData.baseTime;
        const eta = calculateETA(routeData, baseDuration, hour);
        
        routeLayers[routeName] = {
            route: routeLayer,
            waypoints: null,
            eta: eta
        };
    }
    
    map.setView([13.7565, 121.0583], 13);
    document.getElementById('route-details').style.display = 'none';
}

// Function to clear all routes
function clearRoutes() {
    Object.values(routeLayers).forEach(layerGroup => {
        if (layerGroup.route) map.removeLayer(layerGroup.route);
        if (layerGroup.waypoints) map.removeLayer(layerGroup.waypoints);
    });
    routeLayers = {};
    activeRoute = null;
    document.getElementById('route-details').style.display = 'none';
    document.querySelectorAll('.route-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Function to update time display
function updateTimeDisplay(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    document.getElementById('timeDisplay').textContent = `${displayHour}:00 ${period}`;
    
    // If a route is active, recalculate ETA
    const activeRouteItem = document.querySelector('.route-item.active');
    if (activeRouteItem) {
        const routeName = activeRouteItem.getAttribute('data-route');
        const routeData = jeepneyRoutes[routeName];
        createSnappedRoute(routeName, routeData);
    }
}

// Populate routes list
function populateRoutesList() {
    const routesList = document.getElementById('routes-list');
    routesList.innerHTML = '';
    
    Object.entries(jeepneyRoutes).forEach(([routeName, routeData]) => {
        const routeItem = document.createElement('div');
        routeItem.className = 'route-item';
        routeItem.setAttribute('data-route', routeName);
        
        // Add indicator for routes with secret waypoints
        const secretIndicator = routeData.secretWaypoints ? 
            ' <small style="color:#ff4444;">(Controlled Route)</small>' : '';
        
        routeItem.innerHTML = `
            <div style="font-weight: bold;">${routeName}${secretIndicator}</div>
            <div class="route-info">
                Type: ${routeData.type} | ${routeData.frequency}<br>
                Fare: ${routeData.fare} | Base: ${routeData.baseTime}min
            </div>
        `;
        
        routeItem.addEventListener('click', () => {
            createSnappedRoute(routeName, routeData);
        });
        
        routesList.appendChild(routeItem);
    });
}

// Update active route in sidebar
function updateActiveRoute(routeName) {
    document.querySelectorAll('.route-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-route="${routeName}"]`).classList.add('active');
}

// Search functionality
document.getElementById('searchBox').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const routeItems = document.querySelectorAll('.route-item');
    
    routeItems.forEach(item => {
        const routeName = item.getAttribute('data-route').toLowerCase();
        if (routeName.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});

// Time slider event
document.getElementById('timeSlider').addEventListener('input', function(e) {
    updateTimeDisplay(parseInt(e.target.value));
});

// Add key locations
const keyLocations = {
    "Batangas City Grand Terminal": [13.79044, 121.06232],
    "SM City Batangas": [13.7615, 121.0548],
    "Batangas Port": [13.753814, 121.044865],
    "Plaza Mabini": [13.7575, 121.0589],
    "Batangas City Hall": [13.7570, 121.0580]
};

const locationsLayer = L.layerGroup().addTo(map);
Object.keys(keyLocations).forEach(location => {
    L.marker(keyLocations[location])
        .bindPopup(`<b>${location}</b>`)
        .addTo(locationsLayer);
});

// Add scale control
L.control.scale().addTo(map);

// Add debug control to toggle secret waypoints visibility
const debugControl = L.control({ position: 'topright' });
debugControl.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
    div.innerHTML = '<a href="#" title="Toggle Secret Waypoints" style="padding: 6px 10px; background: #ff4444; color: white; border-radius: 4px;">🔧 Debug</a>';
    div.onclick = function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        toggleSecretWaypoints();
    };
    return div;
};
debugControl.addTo(map);

// Initialize the application
populateRoutesList();
updateTimeDisplay(12); // Initialize with 12:00 PM

console.log('Batangas City Jeepney Routes with Secret Waypoints initialized!');