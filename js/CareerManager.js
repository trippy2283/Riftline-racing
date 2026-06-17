/* =====================================================
   CareerManager.js
   Career progression, saves, credits, levels, tuning.
   Home track: Tulsa Raceway Park (a dedicated circuit,
   not an Oklahoma street). No real Oklahoma streets used.
   ===================================================== */

var CareerManager = (function () {

    // ---- Car Definitions ------------------------------------------------
    // Stats: 1-10 scale. Physics values applied to CarController.
    var CAR_DEFS = [
        {
            id: 'vector_x',
            name: 'VECTOR X',
            class: 'D',
            description: 'Your first ride. Balanced, forgiving.',
            icon: '🚗',
            color: '#00aaff',
            cost: 0,
            unlocked: true,
            stats: { speed: 5, accel: 5, handling: 6, nitro: 5 },
            physics: { maxSpeed: 50, acceleration: 24, turnSpeed: 90, brakeForce: 40, nitroPower: 1.5 },
            tuning: { rideHeight: 5, camber: 5, tireWidth: 5, suspension: 5 }
        },
        {
            id: 'phantom_gt',
            name: 'PHANTOM GT',
            class: 'C',
            description: 'Top-end speed beast. Wide body kit.',
            icon: '🏎',
            color: '#cc00cc',
            cost: 400,
            unlocked: false,
            stats: { speed: 8, accel: 5, handling: 5, nitro: 6 },
            physics: { maxSpeed: 70, acceleration: 22, turnSpeed: 80, brakeForce: 38, nitroPower: 1.7 },
            tuning: { rideHeight: 5, camber: 5, tireWidth: 5, suspension: 5 }
        },
        {
            id: 'street_rocket',
            name: 'STREET ROCKET',
            class: 'C',
            description: 'Turbocharged sprint machine.',
            icon: '🔥',
            color: '#ff6600',
            cost: 700,
            unlocked: false,
            stats: { speed: 7, accel: 9, handling: 6, nitro: 7 },
            physics: { maxSpeed: 62, acceleration: 38, turnSpeed: 88, brakeForce: 50, nitroPower: 1.8 },
            tuning: { rideHeight: 5, camber: 5, tireWidth: 5, suspension: 5 }
        },
        {
            id: 'circuit_king',
            name: 'CIRCUIT KING',
            class: 'B',
            description: 'Track-bred precision handler.',
            icon: '👑',
            color: '#d4a820',
            cost: 1500,
            unlocked: false,
            stats: { speed: 7, accel: 7, handling: 10, nitro: 6 },
            physics: { maxSpeed: 62, acceleration: 30, turnSpeed: 115, brakeForce: 58, nitroPower: 1.65 },
            tuning: { rideHeight: 5, camber: 5, tireWidth: 5, suspension: 5 }
        },
        {
            id: 'apex_predator',
            name: 'APEX PREDATOR',
            class: 'A',
            description: 'Nothing faster on the circuit.',
            icon: '⚡',
            color: '#00ff88',
            cost: 3000,
            unlocked: false,
            stats: { speed: 10, accel: 9, handling: 8, nitro: 10 },
            physics: { maxSpeed: 85, acceleration: 42, turnSpeed: 102, brakeForce: 60, nitroPower: 2.1 },
            tuning: { rideHeight: 5, camber: 5, tireWidth: 5, suspension: 5 }
        }
    ];

    // ---- City / Track Definitions ---------------------------------------
    // Career starts at Tulsa Raceway Park — a real dedicated motorsport
    // facility, NOT an Oklahoma public street.
    var CITY_DEFS = [
        {
            id: 'tulsa',
            city: 'TULSA',
            track: 'Tulsa Raceway Park',
            country: 'Oklahoma, USA',
            description: 'Home turf. Where legends are born.',
            color: '#cc0000',
            requiredWins: 0,
            laps: 2,
            difficulty: 1,
            weather: 'sunset',
            skyColor: [0.05, 0.02, 0.01],
            opponents: [
                { name: 'Cody "Ripper" Walsh',   carId: 'vector_x',  aiDiff: 0.65 },
                { name: 'Blake Sutherland',        carId: 'vector_x',  aiDiff: 0.60 },
                { name: 'Jess McCray',             carId: 'vector_x',  aiDiff: 0.55 }
            ],
            reward: { credits: 150, xp: 200, unlock: null, unlockTrack: 'los_angeles' }
        },
        {
            id: 'los_angeles',
            city: 'LOS ANGELES',
            track: 'Hollywood Hills Loop',
            country: 'California, USA',
            description: 'Winding canyon roads above the city of dreams.',
            color: '#ff8800',
            requiredWins: 1,
            laps: 3,
            difficulty: 2,
            weather: 'night',
            skyColor: [0.01, 0.01, 0.04],
            opponents: [
                { name: 'Kyle "Smoke" Chen',   carId: 'vector_x',     aiDiff: 0.75 },
                { name: 'Maria Velasquez',       carId: 'vector_x',     aiDiff: 0.70 },
                { name: 'Derek Holt',            carId: 'vector_x',     aiDiff: 0.65 }
            ],
            reward: { credits: 250, xp: 350, unlock: 'phantom_gt', unlockTrack: 'miami' }
        },
        {
            id: 'miami',
            city: 'MIAMI',
            track: 'South Beach Circuit',
            country: 'Florida, USA',
            description: 'Neon-soaked night racing on the Florida coast.',
            color: '#ff00cc',
            requiredWins: 2,
            laps: 3,
            difficulty: 2,
            weather: 'night',
            skyColor: [0.02, 0.0, 0.04],
            opponents: [
                { name: 'Jasmine "Blaze" Torres', carId: 'phantom_gt', aiDiff: 0.78 },
                { name: 'Rico Salazar',             carId: 'vector_x',  aiDiff: 0.80 },
                { name: 'Nadia Kosta',              carId: 'vector_x',  aiDiff: 0.74 }
            ],
            reward: { credits: 350, xp: 450, unlock: null, unlockTrack: 'chicago' }
        },
        {
            id: 'chicago',
            city: 'CHICAGO',
            track: 'Lakeshore Drive Speedway',
            country: 'Illinois, USA',
            description: 'Wide, fast sweepers along Lake Michigan at dusk.',
            color: '#2288ff',
            requiredWins: 3,
            laps: 3,
            difficulty: 3,
            weather: 'dusk',
            skyColor: [0.04, 0.03, 0.06],
            opponents: [
                { name: 'Tommy "Ghost" Park',  carId: 'phantom_gt',    aiDiff: 0.82 },
                { name: 'Alexis Monroe',        carId: 'street_rocket', aiDiff: 0.80 },
                { name: 'Victor Crane',         carId: 'phantom_gt',    aiDiff: 0.77 }
            ],
            reward: { credits: 400, xp: 550, unlock: 'street_rocket', unlockTrack: 'new_york' }
        },
        {
            id: 'new_york',
            city: 'NEW YORK',
            track: 'Brooklyn Bridge Sprint',
            country: 'New York, USA',
            description: 'Glass canyons and tight city streets after midnight.',
            color: '#00ccff',
            requiredWins: 5,
            laps: 3,
            difficulty: 3,
            weather: 'night',
            skyColor: [0.01, 0.01, 0.03],
            opponents: [
                { name: 'Priya Nair',         carId: 'phantom_gt',    aiDiff: 0.86 },
                { name: 'Bo "Voltage" Li',    carId: 'street_rocket', aiDiff: 0.83 },
                { name: 'Samuel Cruz',        carId: 'phantom_gt',    aiDiff: 0.80 }
            ],
            reward: { credits: 500, xp: 650, unlock: null, unlockTrack: 'las_vegas' }
        },
        {
            id: 'las_vegas',
            city: 'LAS VEGAS',
            track: 'Neon Strip Grand Prix',
            country: 'Nevada, USA',
            description: 'Blazing straights beneath a million casino lights.',
            color: '#ffe600',
            requiredWins: 6,
            laps: 3,
            difficulty: 4,
            weather: 'night',
            skyColor: [0.02, 0.02, 0.0],
            opponents: [
                { name: 'Scarlett "Ace" Ross',  carId: 'street_rocket', aiDiff: 0.88 },
                { name: 'Marco Reyes',           carId: 'circuit_king',  aiDiff: 0.85 },
                { name: 'Hannah Frost',          carId: 'street_rocket', aiDiff: 0.83 }
            ],
            reward: { credits: 650, xp: 800, unlock: 'circuit_king', unlockTrack: 'san_francisco' }
        },
        {
            id: 'san_francisco',
            city: 'SAN FRANCISCO',
            track: 'Golden Gate Inferno',
            country: 'California, USA',
            description: 'Foggy hills and technical S-curves by the bay.',
            color: '#ff4400',
            requiredWins: 8,
            laps: 3,
            difficulty: 4,
            weather: 'foggy',
            skyColor: [0.03, 0.02, 0.02],
            opponents: [
                { name: 'Zane "Vector" Wu',    carId: 'circuit_king',  aiDiff: 0.90 },
                { name: 'Elena Sokolova',       carId: 'street_rocket', aiDiff: 0.88 },
                { name: 'Leo Fontaine',         carId: 'circuit_king',  aiDiff: 0.86 }
            ],
            reward: { credits: 800, xp: 1000, unlock: null, unlockTrack: 'seattle' }
        },
        {
            id: 'seattle',
            city: 'SEATTLE',
            track: 'Emerald City Speedway',
            country: 'Washington, USA',
            description: 'Rainy technical circuit — grip is everything.',
            color: '#00ff88',
            requiredWins: 9,
            laps: 3,
            difficulty: 4,
            weather: 'rain',
            skyColor: [0.01, 0.02, 0.01],
            opponents: [
                { name: 'Kira "Bolt" Tanaka',  carId: 'circuit_king',  aiDiff: 0.91 },
                { name: 'Diego Morales',        carId: 'circuit_king',  aiDiff: 0.89 },
                { name: 'Fiona Blake',          carId: 'street_rocket', aiDiff: 0.92 }
            ],
            reward: { credits: 950, xp: 1200, unlock: null, unlockTrack: 'new_orleans' }
        },
        {
            id: 'new_orleans',
            city: 'NEW ORLEANS',
            track: 'French Quarter Grand Circuit',
            country: 'Louisiana, USA',
            description: 'The hardest track. Tight, twisty, unforgiving.',
            color: '#cc00ff',
            requiredWins: 11,
            laps: 4,
            difficulty: 5,
            weather: 'night',
            skyColor: [0.02, 0.0, 0.03],
            opponents: [
                { name: 'Rex "King" Volta',   carId: 'apex_predator', aiDiff: 0.95 },
                { name: 'Camille Noir',        carId: 'circuit_king',  aiDiff: 0.93 },
                { name: 'Dante Storm',         carId: 'apex_predator', aiDiff: 0.92 }
            ],
            reward: { credits: 1500, xp: 2000, unlock: 'apex_predator', unlockTrack: null }
        }
    ];

    // ---- XP Table -------------------------------------------------------
    var XP_TABLE = [0,300,700,1300,2100,3100,4300,5700,7300,9100,11000,
                    13500,16500,20000,24000,28500,33500,39000,45000,52000];

    function xpForLevel(lvl) { return XP_TABLE[Math.min(lvl, XP_TABLE.length - 1)] || (lvl * 5000); }

    // ---- Default Save ---------------------------------------------------
    function defaultSave() {
        return {
            credits: 200,
            trophies: 0,
            totalWins: 0,
            playerLevel: 1,
            playerXP: 0,
            selectedCar: 'vector_x',
            unlockedCars: ['vector_x'],
            unlockedTracks: ['tulsa'],
            cityProgress: {},
            carTuning: {},
            settings: { sfx: true, music: true, vibration: true }
        };
    }

    // ---- CareerManager --------------------------------------------------
    function CareerManager() {
        this.save = this._loadSave();
        this.cars = JSON.parse(JSON.stringify(CAR_DEFS));
        this.cities = CITY_DEFS;
        this._applyUnlocks();
    }

    CareerManager.prototype._applyUnlocks = function () {
        var self = this;
        this.cars.forEach(function (c) {
            c.unlocked = self.save.unlockedCars.indexOf(c.id) !== -1;
        });
    };

    CareerManager.prototype._loadSave = function () {
        try {
            var raw = localStorage.getItem('riftline_v2');
            if (raw) {
                var parsed = JSON.parse(raw);
                // Migrate missing fields
                if (!parsed.trophies) parsed.trophies = 0;
                if (!parsed.unlockedTracks) parsed.unlockedTracks = ['tulsa'];
                if (!parsed.playerLevel) parsed.playerLevel = 1;
                if (!parsed.playerXP) parsed.playerXP = 0;
                if (!parsed.carTuning) parsed.carTuning = {};
                if (!parsed.settings) parsed.settings = { sfx: true, music: true, vibration: true };
                return parsed;
            }
        } catch (e) { /* ignore */ }
        return defaultSave();
    };

    CareerManager.prototype.persist = function () {
        try { localStorage.setItem('riftline_v2', JSON.stringify(this.save)); } catch (e) {}
    };

    CareerManager.prototype.getCity       = function (id) { return this.cities.find(function (c) { return c.id === id; }) || null; };
    CareerManager.prototype.getCar        = function (id) { return this.cars.find(function (c) { return c.id === id; }) || null; };
    CareerManager.prototype.getSelectedCar = function () { return this.getCar(this.save.selectedCar); };

    CareerManager.prototype.selectCar = function (id) {
        if (this.save.unlockedCars.indexOf(id) !== -1) {
            this.save.selectedCar = id;
            this.persist();
        }
    };

    CareerManager.prototype.buyCar = function (id) {
        var car = this.getCar(id);
        if (!car || car.unlocked) return false;
        if (this.save.credits < car.cost) return false;
        this.save.credits -= car.cost;
        car.unlocked = true;
        this.save.unlockedCars.push(id);
        this.persist();
        return true;
    };

    CareerManager.prototype.isCityUnlocked = function (id) {
        return this.save.unlockedTracks.indexOf(id) !== -1;
    };

    CareerManager.prototype.getCityProgress = function (id) {
        return this.save.cityProgress[id] || { wins: 0, bestTime: null };
    };

    // Apply tuning stats to physics params (call before race start)
    CareerManager.prototype.getEffectivePhysics = function (carId) {
        var car = this.getCar(carId);
        if (!car) return null;
        var p = JSON.parse(JSON.stringify(car.physics));
        var t = this.save.carTuning[carId] || car.tuning;

        // Suspension stiffness → turn speed
        p.turnSpeed  *= (0.85 + (t.suspension / 10) * 0.3);
        // Camber → handling (higher camber = more cornering, less straight-line speed)
        p.maxSpeed   *= (1.0 + ((5 - t.camber) / 10) * 0.08);
        p.turnSpeed  *= (0.9 + (t.camber / 10) * 0.2);
        // Ride height → stability at speed
        p.brakeForce *= (0.9 + ((10 - t.rideHeight) / 10) * 0.2);

        return p;
    };

    CareerManager.prototype.saveTuning = function (carId, tuning) {
        this.save.carTuning[carId] = tuning;
        var car = this.getCar(carId);
        if (car) car.tuning = tuning;
        this.persist();
    };

    CareerManager.prototype.recordRaceResult = function (cityId, position, timeMs) {
        var city = this.getCity(cityId);
        if (!city) return null;

        if (!this.save.cityProgress[cityId]) {
            this.save.cityProgress[cityId] = { wins: 0, bestTime: null };
        }
        var prog = this.save.cityProgress[cityId];
        var won = (position === 1);

        if (won) { prog.wins++; this.save.totalWins++; }
        if (!prog.bestTime || timeMs < prog.bestTime) prog.bestTime = timeMs;

        // Credits by finish position
        var creditMulti = [1, 0.55, 0.3, 0.1];
        var earned = Math.round(city.reward.credits * (creditMulti[Math.min(position - 1, 3)]));
        this.save.credits += earned;

        // XP award
        var xpMulti = [1, 0.6, 0.35, 0.15];
        var xpEarned = Math.round(city.reward.xp * (xpMulti[Math.min(position - 1, 3)]));
        this.save.playerXP += xpEarned;

        // Level up check
        var levelsGained = 0;
        while (this.save.playerXP >= xpForLevel(this.save.playerLevel) && this.save.playerLevel < 20) {
            this.save.playerXP -= xpForLevel(this.save.playerLevel);
            this.save.playerLevel++;
            levelsGained++;
        }

        // Handle car unlock
        var newCarUnlock = null;
        if (won && city.reward.unlock) {
            var unlockCar = this.getCar(city.reward.unlock);
            if (unlockCar && !unlockCar.unlocked) {
                unlockCar.unlocked = true;
                this.save.unlockedCars.push(city.reward.unlock);
                newCarUnlock = unlockCar;
            }
        }

        // Handle track unlock
        var newTrackUnlock = null;
        if (won && city.reward.unlockTrack) {
            if (this.save.unlockedTracks.indexOf(city.reward.unlockTrack) === -1) {
                this.save.unlockedTracks.push(city.reward.unlockTrack);
                newTrackUnlock = this.getCity(city.reward.unlockTrack);
            }
        }

        this.persist();
        return {
            won: won,
            credits: earned,
            xp: xpEarned,
            levelsGained: levelsGained,
            newLevel: this.save.playerLevel,
            newCarUnlock: newCarUnlock,
            newTrackUnlock: newTrackUnlock
        };
    };

    CareerManager.prototype.getXPProgress = function () {
        var lvl = this.save.playerLevel;
        var needed = xpForLevel(lvl);
        return { level: lvl, current: this.save.playerXP, needed: needed, pct: this.save.playerXP / needed };
    };

    CareerManager.prototype.resetSave = function () {
        this.save = defaultSave();
        this.cars = JSON.parse(JSON.stringify(CAR_DEFS));
        this.persist();
    };

    // Static data for external access
    CareerManager.CAR_DEFS  = CAR_DEFS;
    CareerManager.CITY_DEFS = CITY_DEFS;

    return CareerManager;
})();

window.CareerManager = CareerManager;
