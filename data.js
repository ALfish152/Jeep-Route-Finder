// Complete Batangas Jeepney Routes Data
const jeepneyRoutes = {
    "Batangas - Alangilan": {
        id: "route_001",
        type: "main",
        color: "#ffeb3b",
        waypoints: [
            [13.790637338793799, 121.06163057927537],
            [13.790637338793799, 121.06163057927537]
        ],
        secretWaypoints: [
            [13.79235, 121.07018],
            [13.78659, 121.06916],
            [13.77054, 121.06523],
            [13.76481, 121.05994],
            [13.75811, 121.05696],
            [13.75411, 121.05742],
            [13.75252, 121.05531],
            [13.750622, 121.056692],
            [13.754674, 121.049788],
            [13.757444177584416, 121.05569514467675],
            [13.758305819024558, 121.06304756802848],
            [13.77060370687754, 121.06557507121902]
        ],
        description: "Main route from City Grand Terminal to Alangilan via key educational institutions",
        frequency: "Every 5-8 minutes",
        fare: "₱12-20",
        baseTime: 25,
        stops: 12,
        operator: "Alangilan Jeepney Association"
    },
    "Batangas - Balagtas": {
        id: "route_002",
        type: "main",
        color: "#ffeb3b",
        waypoints: [
            [13.790637338793799, 121.06163057927537],
            [13.790637338793799, 121.06163057927537]
        ],
        secretWaypoints: [
            [13.79235, 121.07018],
            [13.78659, 121.06916],
            [13.77054, 121.06523],
            [13.764717416512436, 121.06058649861147],
            [13.759998105547446, 121.06314154383948],
            [13.758741696735559, 121.06064590146015],
            [13.756450581341142, 121.06065178045907],
            [13.756076429470975, 121.05662296804233],
            [13.753786855283893, 121.05683418792586],
            [13.752440687755373, 121.05538972616182],
            [13.75059206484185, 121.05663899035726],
            [13.752576159425207, 121.05235359057214],
            [13.754889771605558, 121.0499168979996],
            [13.757442834996795, 121.05566880098563],
            [13.75967292660729, 121.05887672294726],
            [13.761225921732755, 121.05739694762677],
            [13.764776832321608, 121.06026916512437],
            [13.77060370687754, 121.06557507121902]
        ],
        description: "Comprehensive route connecting Grand Terminal to Balagtas via multiple key locations",
        frequency: "Every 6-10 minutes",
        fare: "₱15-25",
        baseTime: 30,
        stops: 16,
        operator: "Balagtas Transport Cooperative"
    },
    "Batangas - Sta. Clara/Pier": {
        id: "route_003",
        type: "secondary",
        color: "#ffeb3b",
        waypoints: [
            [13.753880755680488, 121.04497404515388],
            [13.753880755680488, 121.04497404515388]
        ],
        secretWaypoints: [
            [13.757469408104821, 121.0558826437163],
            [13.75741415329892, 121.05646856464804],
            [13.753822206596768, 121.05685193357698],
            [13.75246548873908, 121.05532893191315],
            [13.750619064002825, 121.05667885582513],
            [13.749539746189303, 121.05299641049818]
        ],
        description: "Port area route connecting Pier to Sta. Clara via city markets",
        frequency: "Every 8-12 minutes",
        fare: "₱10-15",
        baseTime: 12,
        stops: 5,
        operator: "Sta. Clara Jeepney Operators"
    },
    "Batangas - Capitolio-Hospital": {
        id: "route_004",
        type: "special",
        color: "#ffffff",
        waypoints: [
            [13.755992307747455, 121.0688025248553],
            [13.76685126601583, 121.06630409601944]
        ],
        secretWaypoints: [
            [13.761205724029791, 121.07386672485553],
            [13.762565265828737, 121.07243729601936],
            [13.76984003992264, 121.06553242485559],
            [13.764808080214427, 121.06094988067487],
            [13.763828648901097, 121.06530592485551],
            [13.757046128756366, 121.06059676718314],
            [13.756444286644063, 121.05776352485552],
            [13.757023355114114, 121.05488572485548],
            [13.758525948821449, 121.05718896323157],
            [13.762945323397833, 121.05729822300233],
            [13.765148828027241, 121.06421526718324]
        ],
        description: "Circular route connecting SM City to Medical Center via government and educational institutions",
        frequency: "Every 10-15 minutes",
        fare: "₱12-18",
        baseTime: 20,
        stops: 16,
        operator: "Capitolio-Hospital Transport"
    },
    "Batangas - Dagatan (Taysan)": {
        id: "route_005",
        type: "special",
        color: "#ff9800",
        waypoints: [
            [13.761471744966222, 121.07351750328971],
            [13.755992307747455, 121.0688025248553]
        ],
        secretWaypoints: [
            [13.762565265828737, 121.07243729601936],
            [13.76984003992264, 121.06553242485559],
            [13.764808080214427, 121.06094988067487],
            [13.763828648901097, 121.06530592485551],
            [13.758796911236454, 121.05716640951076],
            [13.755282086645108, 121.05907879601929]
        ],
        description: "Route from Taysan area to city center via educational institutions",
        frequency: "Every 15-20 minutes",
        fare: "₱20-30",
        baseTime: 35,
        stops: 10,
        operator: "Dagatan Transport Service"
    },
    "Batangas - Lipa": {
        id: "route_006",
        type: "main",
        color: "#f44336",
        waypoints: [
            [13.790637338793799, 121.06163057927537],
            [13.7389, 121.0412]
        ],
        secretWaypoints: [
            [13.79352407249312, 121.071060651839],
            [13.784888282136533, 121.07367670951108],
            [13.76984003992264, 121.06553242485559],
            [13.764808080214427, 121.06094988067487],
            [13.762945323397833, 121.05729822300233],
            [13.771284191714532, 121.0507894931846]
        ],
        description: "Inter-city route connecting Batangas to Lipa City",
        frequency: "Every 15-25 minutes",
        fare: "₱30-40",
        baseTime: 45,
        stops: 8,
        operator: "Batangas-Lipa Transport Cooperative"
    },
    "Batangas - Soro Soro": {
        id: "route_007",
        type: "main",
        color: "#f44336",
        waypoints: [
            [13.750063862524781, 121.05566279787223],
            [13.79352407249312, 121.071060651839]
        ],
        secretWaypoints: [
            [13.784888282136533, 121.07367670951108],
            [13.76984003992264, 121.06553242485559],
            [13.764808080214427, 121.06094988067487],
            [13.763828648901097, 121.06530592485551],
            [13.758796911236454, 121.05716640951076],
            [13.75555622052229, 121.05284723834684],
            [13.757023355114114, 121.05488572485548]
        ],
        description: "Route from Soro Soro area to city markets and educational institutions",
        frequency: "Every 10-15 minutes",
        fare: "₱15-25",
        baseTime: 30,
        stops: 12,
        operator: "Soro Soro Transport Association"
    },
    "Batangas - Balete": {
        id: "route_008",
        type: "main",
        color: "#f44336",
        waypoints: [
            [13.790637338793799, 121.06163057927537],
            [13.771284191714532, 121.0507894931846]
        ],
        secretWaypoints: [
            [13.763890435683992, 121.05646336903632],
            [13.758796911236454, 121.05716640951076],
            [13.750063862524781, 121.05566279787223],
            [13.75555622052229, 121.05284723834684],
            [13.763837365884207, 121.0502278248555]
        ],
        description: "Route from Balete area to city center via diversion road",
        frequency: "Every 12-18 minutes",
        fare: "₱18-28",
        baseTime: 28,
        stops: 9,
        operator: "Balete Transport Service"
    },
    "Batangas - Libjo/San-Isidro/Tabangao": {
        id: "route_009",
        type: "feeder",
        color: "#4caf50",
        waypoints: [
            [13.752441229170522, 121.0707942960193],
            [13.755992307747455, 121.0688025248553]
        ],
        secretWaypoints: [
            [13.755282086645108, 121.05907879601929],
            [13.750063862524781, 121.05566279787223],
            [13.75555622052229, 121.05284723834684],
            [13.757023355114114, 121.05488572485548],
            [13.7578116375756, 121.05821857677124]
        ],
        description: "Feeder route from Libjo/San Isidro/Tabangao to city commercial areas",
        frequency: "Every 8-12 minutes",
        fare: "₱12-20",
        baseTime: 18,
        stops: 10,
        operator: "Libjo Transport Cooperative"
    },
    "Batangas - Bauan": {
        id: "route_010",
        type: "main",
        color: "#2196f3",
        waypoints: [
            [13.771284191714532, 121.0507894931846],
            [13.750063862524781, 121.05566279787223]
        ],
        secretWaypoints: [
            [13.763890435683992, 121.05646336903632],
            [13.758796911236454, 121.05716640951076],
            [13.756444286644063, 121.05776352485552],
            [13.75555622052229, 121.05284723834684],
            [13.763837365884207, 121.0502278248555]
        ],
        description: "Route from Bauan to Batangas City via diversion road and commercial areas",
        frequency: "Every 15-20 minutes",
        fare: "₱25-35",
        baseTime: 35,
        stops: 9,
        operator: "Bauan-Batangas Transport"
    }
};

// All stops data
const allStops = {
    "Batangas City Grand Terminal": [13.790637338793799, 121.06163057927537],
    "SM Hypermarket": [13.79352407249312, 121.071060651839],
    "BatStateU-Alangilan": [13.784888282136533, 121.07367670951108],
    "Don Ramos": [13.76984003992264, 121.06553242485559],
    "UB/Hilltop": [13.764808080214427, 121.06094988067487],
    "Lawas": [13.762945323397833, 121.05729822300233],
    "Traders/Bay Mall": [13.758796911236454, 121.05716640951076],
    "Bago/New Public Market": [13.750063862524781, 121.05566279787223],
    "BatStateU - PB": [13.75555622052229, 121.05284723834684],
    "Luma/Old Market": [13.757023355114114, 121.05488572485548],
    "LPU - Batangas": [13.763828648901097, 121.06530592485551],
    "Golden Gate College": [13.757046128756366, 121.06059676718314],
    "Citimart": [13.756444286644063, 121.05776352485552],
    "Bay City Mall": [13.758525948821449, 121.05718896323157],
    "Batangas Provincial Capitol": [13.765148828027241, 121.06421526718324],
    "Pier/Port of Batangas": [13.755042263503457, 121.04359416516891],
    "Sta. Clara Elementary School": [13.753098936522273, 121.04470753377693],
    "SM City Batangas": [13.755992307747455, 121.0688025248553],
    "Total Gulod": [13.761205724029791, 121.07386672485553],
    "LPU - Riverside": [13.762565265828737, 121.07243729601936],
    "Batangas Medical Center": [13.76685126601583, 121.06630409601944],
    "Dagatan Jeepney Terminal": [13.761471744966222, 121.07351750328971],
    "Plaza Mabini": [13.755282086645108, 121.05907879601929],
    "Diversion": [13.771284191714532, 121.0507894931846],
    "Waltermart/Lawas": [13.763890435683992, 121.05646336903632],
    "Philippine Ports Authority": [13.763837365884207, 121.0502278248555],
    "Tierra Verde Subdivision": [13.752441229170522, 121.0707942960193],
    "Pandayan Bookshop": [13.7578116375756, 121.05821857677124]
};

// Traffic patterns
const TRAFFIC_PATTERNS = {
    morning_rush: { start: 7, end: 9, multiplier: 1.8, level: 'high', days: [1,2,3,4,5] },
    evening_rush: { start: 17, end: 19, multiplier: 1.6, level: 'high', days: [1,2,3,4,5] },
    lunch_time: { start: 12, end: 13, multiplier: 1.3, level: 'medium', days: [1,2,3,4,5] },
    weekend_peak: { start: 9, end: 12, multiplier: 1.4, level: 'medium', days: [6,0] },
    normal: { multiplier: 1.0, level: 'low', days: [0,1,2,3,4,5,6] }
};

// Routing services
const ROUTING_SERVICES = {
    OSRM: 'https://router.project-osrm.org/route/v1/driving/'
};