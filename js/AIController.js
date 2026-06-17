/* =====================================================
   AIController.js
   AI opponent driver. Follows track waypoints using a
   look-ahead steering system. Difficulty adjusts speed
   multiplier and corner braking behaviour.
   ===================================================== */

var AIController = pc.createScript('aiController');

AIController.attributes.add('difficulty',     { type: 'number', default: 0.8  }); // 0-1
AIController.attributes.add('lookaheadDist',  { type: 'number', default: 20   }); // units ahead to target
AIController.attributes.add('brakingAngle',   { type: 'number', default: 35   }); // degrees before braking

AIController.prototype.initialize = function () {
    this._waypointPositions = [];
    this._currentWpIndex    = 0;
    this._input = { accel: false, brake: false, left: false, right: false, nitro: false };
    this._carCtrl    = this.entity.script.carController;
    this._baseMaxSpeed = this._carCtrl ? this._carCtrl.maxSpeed : 50;
    this._targetPos  = new pc.Vec3();
    this._myPos      = new pc.Vec3();
    this._rubberBandTimer = 0;

    // Offset start index to spread AI cars around track
    this._startOffset = 0;
    this._activated   = false;
};

AIController.prototype.setupWaypoints = function (waypointPositions, startIndex) {
    this._waypointPositions = waypointPositions;
    this._currentWpIndex    = startIndex || 0;
    this._startOffset       = startIndex || 0;
    this._activated         = true;
};

AIController.prototype.update = function (dt) {
    if (!this._activated || this._waypointPositions.length === 0) return;

    var gm = this.app.globals && this.app.globals.gameManager;
    if (!gm || gm.state !== 'racing') return;

    this._myPos.copy(this.entity.getPosition());

    // Pick the lookahead waypoint
    var target = this._getLookaheadTarget();
    if (!target) return;

    // Compute angle to target
    var toTarget = new pc.Vec3(target.x - this._myPos.x, 0, target.z - this._myPos.z);
    var distToTarget = toTarget.length();

    // Convert to angle in world space
    var targetAngle = Math.atan2(toTarget.x, toTarget.z) * 180 / Math.PI;
    var myHeading   = this._carCtrl ? this._carCtrl.getHeading() : 0;

    // Angle delta (normalise to -180..180)
    var delta = targetAngle - myHeading;
    while (delta >  180) delta -= 360;
    while (delta < -180) delta += 360;

    // Steering decision
    var input = this._input;
    input.left  = delta < -5;
    input.right = delta >  5;

    // Speed / braking decision
    var sharpTurn = Math.abs(delta) > this.brakingAngle;
    var diffMod   = 0.7 + this.difficulty * 0.3;  // 0.7 – 1.0

    // Rubber-band: if AI is far behind player, speed up
    if (gm.playerCar) {
        var playerPos = gm.playerCar.getPosition();
        var distToPlayer = this._myPos.distance(playerPos);
        if (distToPlayer > 40) diffMod = Math.min(diffMod + 0.15, 1.0);
        if (distToPlayer < 8)  diffMod = Math.max(diffMod - 0.1,  0.5);
    }

    // Apply difficulty to max speed (use saved base to avoid drift)
    if (this._carCtrl) {
        if (!this._baseMaxSpeed) this._baseMaxSpeed = this._carCtrl.maxSpeed;
        this._carCtrl.maxSpeed = this._baseMaxSpeed * diffMod;
    }

    input.accel = !sharpTurn;
    input.brake = sharpTurn && distToTarget < 15;
    input.nitro = this.difficulty > 0.85 && !sharpTurn && Math.random() < 0.005;

    if (this._carCtrl) {
        this._carCtrl.setAIInput(input);
    }

    // Advance waypoint when close enough
    var WP_REACH = 10;
    if (distToTarget < WP_REACH) {
        this._currentWpIndex = (this._currentWpIndex + 1) % this._waypointPositions.length;
    }
};

AIController.prototype._getLookaheadTarget = function () {
    var pts = this._waypointPositions;
    if (!pts.length) return null;

    // Find point roughly lookaheadDist ahead along the waypoint path
    var idx   = this._currentWpIndex;
    var accum = 0;
    var from  = this._myPos;
    var n     = pts.length;

    for (var i = 0; i < n; i++) {
        var wpIdx = (idx + i) % n;
        var wp    = pts[wpIdx];
        var d     = from.distance(wp);
        accum += d;
        from = wp;
        if (accum >= this.lookaheadDist) return wp;
    }
    return pts[idx];
};
