/* =====================================================
   CameraFollow.js
   Smooth chase camera with speed-based FOV expansion,
   lag offset, and optional cinematic intro sweep.
   ===================================================== */

var CameraFollow = pc.createScript('cameraFollow');

CameraFollow.attributes.add('target',       { type: 'entity' });
CameraFollow.attributes.add('height',       { type: 'number', default: 5   });
CameraFollow.attributes.add('distance',     { type: 'number', default: 12  });
CameraFollow.attributes.add('lag',          { type: 'number', default: 6   }); // lerp speed
CameraFollow.attributes.add('baseFOV',      { type: 'number', default: 62  });
CameraFollow.attributes.add('maxFOV',       { type: 'number', default: 82  });

CameraFollow.prototype.initialize = function () {
    this._desiredPos  = new pc.Vec3();
    this._currentPos  = new pc.Vec3();
    this._lookAtPos   = new pc.Vec3();
    this._targetFOV   = this.baseFOV;
    this._camComp     = this.entity.camera;

    if (this._camComp) this._camComp.fov = this.baseFOV;

    this._preRaceAngle = 0;
    this._isIntro = false;
};

CameraFollow.prototype.startIntro = function (duration) {
    this._isIntro = true;
    this._introTime = 0;
    this._introDuration = duration || 2.5;
};

CameraFollow.prototype.update = function (dt) {
    if (!this.target) return;

    var targetPos = this.target.getPosition();
    var targetAngles = this.target.getEulerAngles();
    var heading = targetAngles.y * Math.PI / 180;

    // Camera sits behind and above the target
    var behindX = -Math.sin(heading) * this.distance;
    var behindZ = -Math.cos(heading) * this.distance;

    this._desiredPos.set(
        targetPos.x + behindX,
        targetPos.y + this.height,
        targetPos.z + behindZ
    );

    // Smooth camera position
    this._currentPos.copy(this.entity.getPosition());
    this._currentPos.lerp(this._currentPos, this._desiredPos, this.lag * dt);
    this.entity.setPosition(this._currentPos);

    // Look at a point slightly ahead of the car
    var aheadX = Math.sin(heading) * 4;
    var aheadZ = Math.cos(heading) * 4;
    this._lookAtPos.set(targetPos.x + aheadX, targetPos.y + 1, targetPos.z + aheadZ);
    this.entity.lookAt(this._lookAtPos);

    // Speed-based FOV
    var ctrl = this.target.script && this.target.script.carController;
    if (ctrl && this._camComp) {
        var gm = this.app.globals && this.app.globals.gameManager;
        if (gm && gm.state === 'racing') {
            var speedRatio = ctrl.getSpeed() / ctrl.maxSpeed;
            this._targetFOV = this.baseFOV + (this.maxFOV - this.baseFOV) * speedRatio;
        } else {
            this._targetFOV = this.baseFOV;
        }
        this._camComp.fov = this._lerp(this._camComp.fov, this._targetFOV, 3 * dt);
    }

    // Intro sweep: orbit around the car
    if (this._isIntro) {
        this._introTime += dt;
        var t = this._introTime / this._introDuration;
        if (t >= 1) {
            this._isIntro = false;
            return;
        }
        var orbitAngle = heading + (1 - t) * Math.PI;
        var orbitDist  = this.distance * 1.8;
        var orbitH     = this.height   * 1.5;
        this.entity.setPosition(
            targetPos.x + Math.sin(orbitAngle) * orbitDist,
            targetPos.y + orbitH,
            targetPos.z + Math.cos(orbitAngle) * orbitDist
        );
        this.entity.lookAt(targetPos);
    }
};

CameraFollow.prototype._lerp = function (a, b, t) {
    return a + (b - a) * Math.min(t, 1);
};
