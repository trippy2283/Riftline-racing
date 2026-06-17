/* =====================================================
   TrackGenerator.js
   Builds the 3D track scene from TrackData waypoints.
   Creates road surface, guard rails, barriers, decorations,
   checkpoint triggers, power-up spawns, and AI waypoint entities.
   ===================================================== */

var TrackGenerator = (function () {

    // Materials cache (created once per app lifetime)
    var _matCache = {};

    function getMat(app, hex, emissive, metallic) {
        var key = hex + (emissive || '') + (metallic || '');
        if (_matCache[key]) return _matCache[key];
        var mat = new pc.StandardMaterial();
        mat.diffuse = hexToColor(hex);
        if (emissive) {
            mat.emissive = hexToColor(emissive);
            mat.emissiveIntensity = 2.5;
        }
        mat.metalness = metallic || 0;
        mat.gloss = metallic ? 0.7 : 0.1;
        mat.update();
        _matCache[key] = mat;
        return mat;
    }

    function hexToColor(hex) {
        hex = hex.replace('#', '');
        return new pc.Color(
            parseInt(hex.substring(0,2), 16) / 255,
            parseInt(hex.substring(2,4), 16) / 255,
            parseInt(hex.substring(4,6), 16) / 255
        );
    }

    // Create a box primitive entity
    function makeBox(app, name, w, h, d, matHex, emissiveHex) {
        var e = new pc.Entity(name);
        e.addComponent('model', { type: 'box' });
        e.model.material = getMat(app, matHex, emissiveHex || null);
        e.setLocalScale(w, h, d);
        return e;
    }

    // Interpolate along two points for smooth waypoint placement
    function lerpVec2(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }

    function distance2D(a, b) {
        var dx = b[0] - a[0], dy = b[1] - a[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    function angle2D(a, b) {
        return Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
    }

    // ---- Public API ----------------------------------------------------

    function generate(app, cityId, cityColor) {
        var data = TrackData.getTrack(cityId);
        var waypoints = data.waypoints;
        var trackW = data.width || 14;
        var trackColor = cityColor || '#1a1a3e';
        var n = waypoints.length;

        var root = new pc.Entity('track_root');
        app.root.addChild(root);

        // Collect world-space waypoint positions for other scripts
        var waypointEntities = [];

        for (var i = 0; i < n - 1; i++) {
            var p0 = waypoints[i];
            var p1 = waypoints[(i + 1) % n];

            var dx = p1[0] - p0[0];
            var dz = p1[1] - p0[1];
            var len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.01) continue;

            var midX = (p0[0] + p1[0]) * 0.5;
            var midZ = (p0[1] + p1[1]) * 0.5;
            var ang  = Math.atan2(dx, dz) * 180 / Math.PI;

            // --- Road surface ---
            var road = makeBox(app, 'road_' + i, trackW, 0.3, len, '#0d0d1f');
            road.setPosition(midX, -0.15, midZ);
            road.setEulerAngles(0, ang, 0);
            root.addChild(road);

            // --- Centre line dashes (every other segment) ---
            if (i % 3 === 0) {
                var dash = makeBox(app, 'dash_' + i, 0.4, 0.31, Math.min(len * 0.4, 2.5), '#ffffff', null);
                dash.setPosition(midX, 0, midZ);
                dash.setEulerAngles(0, ang, 0);
                root.addChild(dash);
            }

            // --- Left neon rail ---
            var lx = midX + Math.cos((ang - 90) * Math.PI / 180) * (trackW * 0.5);
            var lz = midZ - Math.sin((ang - 90) * Math.PI / 180) * (trackW * 0.5);
            var lRail = makeBox(app, 'lrail_' + i, 0.35, 0.6, len, '#0a0a28', cityColor);
            lRail.setPosition(lx, 0.3, lz);
            lRail.setEulerAngles(0, ang, 0);
            root.addChild(lRail);

            // --- Right neon rail ---
            var rx = midX - Math.cos((ang - 90) * Math.PI / 180) * (trackW * 0.5);
            var rz = midZ + Math.sin((ang - 90) * Math.PI / 180) * (trackW * 0.5);
            var rRail = makeBox(app, 'rrail_' + i, 0.35, 0.6, len, '#0a0a28', cityColor);
            rRail.setPosition(rx, 0.3, rz);
            rRail.setEulerAngles(0, ang, 0);
            root.addChild(rRail);

            // Guard barriers are visual only (no Ammo.js required)
            var lWall = makeBox(app, 'lwall_' + i, 0.8, 1.8, len, '#0a0a1a', null);
            lWall.setPosition(lx, 0.9, lz);
            lWall.setEulerAngles(0, ang, 0);
            root.addChild(lWall);

            var rWall = makeBox(app, 'rwall_' + i, 0.8, 1.8, len, '#0a0a1a', null);
            rWall.setPosition(rx, 0.9, rz);
            rWall.setEulerAngles(0, ang, 0);
            root.addChild(rWall);

            // --- Waypoint marker (invisible, for AI + checkpoint logic) ---
            var wp = new pc.Entity('wp_' + i);
            wp.setPosition(midX, 0.5, midZ);
            root.addChild(wp);
            waypointEntities.push(wp);

            // --- Decorations (every N segments) ---
            if (i % 5 === 0) {
                _addDecoration(app, root, midX, midZ, ang, trackW, cityColor, i);
            }
        }

        // --- Ground plane (large flat base) ---
        var ground = new pc.Entity('ground');
        ground.addComponent('model', { type: 'plane' });
        ground.model.material = getMat(app, '#080810');
        ground.setLocalScale(500, 1, 500);
        ground.setPosition(50, -0.3, 50);
        root.addChild(ground);

        // --- Skybox colour (set clear colour) ---
        app.scene.ambientLight = new pc.Color(0.05, 0.05, 0.12);

        // --- Directional light (moonlight) ---
        var moonLight = new pc.Entity('moonLight');
        moonLight.addComponent('light', {
            type: 'directional',
            color: new pc.Color(0.6, 0.7, 1.0),
            intensity: 0.8,
            castShadows: true,
            shadowResolution: 1024,
            shadowDistance: 200
        });
        moonLight.setEulerAngles(35, 30, 0);
        app.root.addChild(moonLight);

        return {
            root: root,
            waypoints: waypointEntities,
            trackWidth: trackW,
            waypointPositions: waypoints.map(function (p) {
                return new pc.Vec3(p[0], 0, p[1]);
            })
        };
    }

    function _addDecoration(app, root, midX, midZ, ang, trackW, cityColor, idx) {
        // Neon pillar pair on sides
        var types = ['pillar', 'arch', 'sign'];
        var type = types[idx % types.length];

        var offset = trackW * 0.6;
        var rad = (ang - 90) * Math.PI / 180;
        var nx = Math.cos(rad), nz = -Math.sin(rad);

        for (var side = -1; side <= 1; side += 2) {
            var ex = midX + nx * offset * side;
            var ez = midZ + nz * offset * side;

            var pillar = makeBox(app, 'deco_' + idx + '_' + side, 0.5, 4, 0.5, '#08082a', cityColor);
            pillar.setPosition(ex, 2, ez);
            root.addChild(pillar);
        }
    }

    // Build checkpoint trigger entities spaced evenly around the track
    function placeCheckpoints(app, trackRoot, waypointPositions, totalCheckpoints) {
        var n = waypointPositions.length;
        var step = Math.max(1, Math.floor(n / totalCheckpoints));
        var cps = [];

        for (var i = 0; i < totalCheckpoints; i++) {
            var idx = (i * step) % n;
            var pos = waypointPositions[idx];

            var cp = new pc.Entity('checkpoint_' + i);
            cp.addComponent('script');
            cp.addComponent('rigidbody', { type: pc.BODYTYPE_KINEMATIC });
            cp.addComponent('collision', {
                type: 'box',
                halfExtents: new pc.Vec3(10, 3, 2),
                trigger: true
            });

            // Aim at next waypoint
            var nextPos = waypointPositions[(idx + 1) % n];
            var dx = nextPos.x - pos.x;
            var dz = nextPos.z - pos.z;
            var ang = Math.atan2(dx, dz) * 180 / Math.PI;

            cp.setPosition(pos.x, 1.5, pos.z);
            cp.setEulerAngles(0, ang, 0);

            // Visual gate
            var gate = makeBox(app, 'cp_gate_' + i, 12, 4, 0.4,
                i === 0 ? '#002200' : '#000022',
                i === 0 ? '#00ff44' : '#0044ff');
            cp.addChild(gate);

            cp.script.create('checkpoint', {
                properties: {
                    checkpointIndex: i,
                    isStartFinish: (i === 0)
                }
            });

            trackRoot.addChild(cp);
            cps.push(cp);
        }
        return cps;
    }

    // Place power-up orbs around the track
    function placePowerUps(app, trackRoot, waypointPositions) {
        var spawns = [];
        var positions = waypointPositions;
        var n = positions.length;
        var types = ['nitro', 'nitro', 'shield', 'nitro', 'repair'];

        for (var i = 0; i < types.length; i++) {
            var idx = Math.floor((i / types.length) * n + n * 0.1) % n;
            var pos = positions[idx];

            var pu = new pc.Entity('powerup_' + i);
            pu.addComponent('script');

            var orb = makeBox(app, 'pu_orb_' + i, 2, 2, 2,
                types[i] === 'nitro' ? '#331100' : (types[i] === 'shield' ? '#001133' : '#002200'),
                types[i] === 'nitro' ? '#ff6600' : (types[i] === 'shield' ? '#0088ff' : '#00ff88')
            );
            pu.addChild(orb);

            pu.setPosition(pos.x, 1, pos.z);
            pu.script.create('powerUp', {
                properties: { powerType: types[i] }
            });

            trackRoot.addChild(pu);
            spawns.push(pu);
        }
        return spawns;
    }

    // Destroy existing track
    function destroy(trackRoot) {
        if (trackRoot) {
            trackRoot.destroy();
        }
        // Clear material cache entries tied to this track if needed
    }

    return {
        generate: generate,
        placeCheckpoints: placeCheckpoints,
        placePowerUps: placePowerUps,
        destroy: destroy,
        hexToColor: hexToColor
    };
})();

window.TrackGenerator = TrackGenerator;
