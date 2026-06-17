/* =====================================================
   Checkpoint.js
   Trigger volume that notifies GameManager when crossed.
   Uses distance-based detection (no Ammo.js dependency).
   ===================================================== */

var Checkpoint = pc.createScript('checkpoint');

Checkpoint.attributes.add('checkpointIndex', { type: 'number', default: 0 });
Checkpoint.attributes.add('isStartFinish',   { type: 'boolean', default: false });
Checkpoint.attributes.add('triggerRadius',   { type: 'number', default: 9 });

Checkpoint.prototype.initialize = function () {
    this._triggered = {};
    this._cooldown  = 3000;
    this._pos = new pc.Vec3();
    this._otherPos = new pc.Vec3();
};

Checkpoint.prototype.update = function (dt) {
    var gm = this.app.globals && this.app.globals.gameManager;
    if (!gm || gm.state !== 'racing') return;

    var now = Date.now();
    this.entity.getPosition(this._pos);

    gm.allRacers.forEach(function (racer) {
        if (!racer || !racer.enabled) return;

        racer.getPosition(this._otherPos);
        var dx = this._otherPos.x - this._pos.x;
        var dz = this._otherPos.z - this._pos.z;
        var distSq = dx * dx + dz * dz;

        if (distSq <= this.triggerRadius * this.triggerRadius) {
            var id = racer._guid || racer.name;
            var lastTime = this._triggered[id] || 0;
            if (now - lastTime > this._cooldown) {
                this._triggered[id] = now;
                this.app.fire('checkpoint:hit', {
                    checkpointIndex: this.checkpointIndex,
                    isStartFinish:   this.isStartFinish,
                    racerEntity:     racer,
                    timestamp:       now
                });
            }
        }
    }, this);
};
