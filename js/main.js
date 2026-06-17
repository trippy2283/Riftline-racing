/* =====================================================
   main.js
   Entry point: creates PlayCanvas app, scene hierarchy,
   and orchestrates the race loop.

   Flow:
     1. Create pc.Application & configure renderer
     2. Init career data + UIManager
     3. Listen for 'game:startRace' event from UI
     4. Build track → spawn cars → start countdown
     5. Update minimap each frame
     6. On race end → record results → show results screen
   ===================================================== */

document.addEventListener('DOMContentLoaded', function () {

    // ---- Application Setup -------------------------------------------
    var canvas = document.getElementById('application-canvas');

    var app = new pc.Application(canvas, {
        keyboard: new pc.Keyboard(window),
        touch:    window.ontouchstart !== undefined ? new pc.TouchDevice(canvas) : null,
        graphicsDeviceOptions: {
            antialias:   true,
            alpha:       false,
            preserveDrawingBuffer: false
        }
    });

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    window.addEventListener('resize', function () { app.resizeCanvas(); });

    app.globals = {};

    // ---- Career & UI -------------------------------------------------
    var career = new CareerManager();
    UIManager.init(app, career);

    // ---- Persistent Scene Entities (created once) --------------------
    var cameraEntity = _createCamera(app);
    var gmEntity     = _createGameManager(app);

    // ---- Race State --------------------------------------------------
    var currentTrackRoot  = null;
    var playerCarEntity   = null;
    var aiCarEntities     = [];
    var currentCityId     = null;
    var raceEndHandled    = false;
    var minimapUpdateTimer = 0;

    // ---- Start Race Event --------------------------------------------
    app.on('game:startRace', function (cityId) {
        currentCityId = cityId || 'tulsa';
        _launchRace(cityId);
    });

    // ---- Race Ended Event -------------------------------------------
    app.on('race:ended', function (results) {
        if (raceEndHandled) return;
        raceEndHandled = true;

        var gm = app.globals.gameManager;
        var timeMs = gm ? gm._elapsedMs : 0;

        // Annotate racer display names
        results.forEach(function (r) {
            if (r.isPlayer) {
                r.racer._displayName = 'YOU';
            }
        });

        setTimeout(function () {
            UIManager.showResults(results, currentCityId, timeMs);
            AudioManager.stopEngine();
        }, 1500);
    });

    // ---- Per-frame Update -------------------------------------------
    app.on('update', function (dt) {
        // Minimap
        minimapUpdateTimer += dt;
        if (minimapUpdateTimer > 0.05) {  // 20 fps minimap
            minimapUpdateTimer = 0;
            var gm = app.globals.gameManager;
            if (gm && gm.state === 'racing' && playerCarEntity) {
                var aiPositions = aiCarEntities.map(function (e) { return e.getPosition(); });
                UIManager.updateMinimap(playerCarEntity.getPosition(), aiPositions);
            }
        }
    });

    // ---- Start PlayCanvas -------------------------------------------
    app.start();

    // ========================================================
    //  INTERNAL HELPERS
    // ========================================================

    function _launchRace(cityId) {
        // Tear down previous race if any
        _tearDownRace();
        raceEndHandled = false;

        var city = career.getCity(cityId);
        if (!city) { console.error('City not found:', cityId); return; }

        var trackData = TrackData.getTrack(cityId);
        var carDef    = career.getSelectedCar();

        // ---- Scene background colour ----
        var sky = city.skyColor || [0.01, 0.01, 0.03];
        app.scene.ambientLight = new pc.Color(sky[0], sky[1], sky[2]);
        app.renderer && (app.renderer.clearColor = new pc.Color(sky[0], sky[1], sky[2]));

        // ---- Build track ----
        var trackResult = TrackGenerator.generate(app, cityId, city.color);
        currentTrackRoot = trackResult.root;

        var waypointPositions = trackResult.waypointPositions;
        UIManager.setMinimapWaypoints(waypointPositions);

        // ---- Checkpoints ----
        var totalCPs = 8;
        var checkpoints = TrackGenerator.placeCheckpoints(app, currentTrackRoot, waypointPositions, totalCPs);

        // ---- Power-ups ----
        TrackGenerator.placePowerUps(app, currentTrackRoot, waypointPositions);

        // ---- Spawn player car ----
        var startPt = waypointPositions[trackData.startIndex || 0];
        var nextPt  = waypointPositions[(trackData.startIndex || 0) + 1] || waypointPositions[1];

        playerCarEntity = _spawnCar(app, 'player', carDef, startPt, nextPt, true);

        // ---- Spawn AI cars ----
        aiCarEntities = [];
        city.opponents.forEach(function (opp, idx) {
            var aiCarDef = career.getCar(opp.carId) || carDef;
            var offset   = idx + 1;
            var aiStartPt = waypointPositions[(trackData.startIndex + offset) % waypointPositions.length] || startPt;
            var aiNextPt  = waypointPositions[(trackData.startIndex + offset + 1) % waypointPositions.length] || nextPt;
            var aiCar = _spawnCar(app, 'ai_' + idx, aiCarDef, aiStartPt, aiNextPt, false);

            // Setup AI controller
            var aiCtrl = aiCar.script && aiCar.script.aiController;
            if (aiCtrl) {
                aiCtrl.difficulty = opp.aiDiff;
                aiCtrl.setupWaypoints(waypointPositions, (trackData.startIndex || 0) + offset);
            }

            aiCar._displayName = opp.name;
            aiCarEntities.push(aiCar);
        });

        // ---- Camera target ----
        var camFollow = cameraEntity.script && cameraEntity.script.cameraFollow;
        if (camFollow) {
            camFollow.target = playerCarEntity;
            camFollow.startIntro(2);
        }

        // ---- GameManager setup ----
        var gm = app.globals.gameManager;
        if (gm) {
            gm.setupRace(playerCarEntity, aiCarEntities, city.laps, totalCPs);
        }

        // ---- Show HUD & city banner ----
        UIManager.showHUD();
        UIManager.showCityBanner(city, 3);

        // ---- Countdown → Race ----
        setTimeout(function () {
            if (gm) gm.startCountdown();
            AudioManager.startEngine();
        }, 2800);
    }

    function _spawnCar(app, name, carDef, startPos, nextPos, isPlayer) {
        var car = new pc.Entity(name);

        // Visual body
        var body = new pc.Entity('body');
        body.addComponent('model', { type: 'box' });
        var mat = new pc.StandardMaterial();
        mat.diffuse = TrackGenerator.hexToColor(carDef.color);
        mat.metalness = 0.6;
        mat.gloss = 0.7;
        mat.update();
        body.model.material = mat;
        body.setLocalScale(2.2, 0.9, 4.2);
        car.addChild(body);

        // Cabin roof
        var roof = new pc.Entity('roof');
        roof.addComponent('model', { type: 'box' });
        var roofMat = new pc.StandardMaterial();
        roofMat.diffuse = TrackGenerator.hexToColor(carDef.color);
        roofMat.metalness = 0.5;
        roofMat.update();
        roof.model.material = roofMat;
        roof.setLocalScale(1.6, 0.65, 2.2);
        roof.setLocalPosition(0, 0.77, -0.2);
        car.addChild(roof);

        // Headlights (glowing boxes)
        _addLight(car, -0.8, -0.1, 2.1, '#ffffff');
        _addLight(car,  0.8, -0.1, 2.1, '#ffffff');
        // Taillights
        _addLight(car, -0.8, -0.1, -2.1, '#cc0000');
        _addLight(car,  0.8, -0.1, -2.1, '#cc0000');

        // Wheels
        _addWheel(car, -1.3, -0.45,  1.5);
        _addWheel(car,  1.3, -0.45,  1.5);
        _addWheel(car, -1.3, -0.45, -1.5);
        _addWheel(car,  1.3, -0.45, -1.5);

        // Calculate start heading toward next waypoint
        var heading = 0;
        if (nextPos) {
            heading = Math.atan2(nextPos.x - startPos.x, nextPos.z - startPos.z) * 180 / Math.PI;
        }

        car.setPosition(startPos.x, 0.5, startPos.z);
        car.setEulerAngles(0, heading, 0);

        // Scripts
        car.addComponent('script');
        car.script.create('carController', {
            properties: {
                maxSpeed:     carDef.physics.maxSpeed,
                acceleration: carDef.physics.acceleration,
                turnSpeed:    carDef.physics.turnSpeed,
                brakeForce:   carDef.physics.brakeForce,
                nitroPower:   carDef.physics.nitroPower,
                isPlayer:     isPlayer
            }
        });

        if (!isPlayer) {
            car.script.create('aiController', {
                properties: { difficulty: 0.8 }
            });
        }

        // Point light under car (neon underglow effect)
        var glowLight = new pc.Entity('glow');
        glowLight.addComponent('light', {
            type: 'point',
            color: TrackGenerator.hexToColor(carDef.color),
            intensity: 1.5,
            range: 6
        });
        glowLight.setLocalPosition(0, -0.5, 0);
        car.addChild(glowLight);

        app.root.addChild(car);

        // Register with game manager
        var gm = app.globals.gameManager;
        if (gm) { gm.allRacers = gm.allRacers || []; }

        // Audio engine update binding for player
        if (isPlayer) {
            app.on('update', function () {
                var ctrl = car.script && car.script.carController;
                if (ctrl) {
                    var ratio = ctrl.getSpeed() / ctrl.maxSpeed;
                    AudioManager.updateEngine(ratio, ctrl._nitroActive);
                }
            });
        }

        return car;
    }

    function _addLight(parent, x, y, z, hex) {
        var e = new pc.Entity('light_' + x);
        e.addComponent('model', { type: 'box' });
        var mat = new pc.StandardMaterial();
        mat.emissive = TrackGenerator.hexToColor(hex);
        mat.emissiveIntensity = 3;
        mat.update();
        e.model.material = mat;
        e.setLocalScale(0.4, 0.15, 0.1);
        e.setLocalPosition(x, y, z);
        parent.addChild(e);
    }

    function _addWheel(parent, x, y, z) {
        var w = new pc.Entity('wheel');
        w.addComponent('model', { type: 'cylinder' });
        var mat = new pc.StandardMaterial();
        mat.diffuse = new pc.Color(0.1, 0.1, 0.1);
        mat.metalness = 0.3;
        mat.update();
        w.model.material = mat;
        w.setLocalScale(0.35, 0.6, 0.35);
        w.setLocalPosition(x, y, z);
        w.setLocalEulerAngles(0, 0, 90);
        parent.addChild(w);
    }

    function _createCamera(app) {
        var cam = new pc.Entity('camera');
        cam.addComponent('camera', {
            fov: 65,
            nearClip: 0.3,
            farClip: 800,
            clearColor: new pc.Color(0.01, 0.01, 0.03)
        });
        cam.addComponent('script');
        cam.script.create('cameraFollow', {
            properties: { height: 5.5, distance: 13, lag: 7, baseFOV: 62, maxFOV: 82 }
        });
        cam.setPosition(0, 8, -15);
        app.root.addChild(cam);
        return cam;
    }

    function _createGameManager(app) {
        var gm = new pc.Entity('gameManager');
        gm.addComponent('script');
        gm.script.create('gameManager', { properties: { totalLaps: 3, totalCheckpoints: 8 } });
        app.root.addChild(gm);
        return gm;
    }

    function _tearDownRace() {
        // Destroy track
        if (currentTrackRoot) { currentTrackRoot.destroy(); currentTrackRoot = null; }

        // Destroy cars
        if (playerCarEntity)  { playerCarEntity.destroy();  playerCarEntity  = null; }
        aiCarEntities.forEach(function (e) { if (e) e.destroy(); });
        aiCarEntities = [];

        // Reset GM
        var gm = app.globals.gameManager;
        if (gm) gm.resetRace();

        AudioManager.stopEngine();
    }

});
