/* =====================================================
   GameManager.js
   Race state machine: countdown → racing → results.
   Tracks laps, checkpoints, positions for player + AI.
   Fires UI events. Manages wrong-way detection.
   ===================================================== */

var GameManager = pc.createScript('gameManager');

GameManager.attributes.add('totalLaps',       { type: 'number', default: 3 });
GameManager.attributes.add('totalCheckpoints', { type: 'number', default: 8 });

GameManager.prototype.initialize = function () {
    this.app.globals = this.app.globals || {};
    this.app.globals.gameManager = this;

    this.state = 'idle';
    this.allRacers  = [];
    this.playerCar  = null;
    this.racerData  = new Map();
    this._startTime = 0;
    this._elapsedMs = 0;
    this._raceResultList = [];

    this.app.on('checkpoint:hit',   this._onCheckpoint, this);
    this.app.on('powerup:collected', this._onPowerup, this);
};

GameManager.prototype.setupRace = function (playerCar, aiCars, totalLaps, totalCheckpoints) {
    this.playerCar = playerCar;
    this.allRacers = [playerCar].concat(aiCars);
    this.totalLaps  = totalLaps  || this.totalLaps;
    this.totalCheckpoints = totalCheckpoints || this.totalCheckpoints;
    this._raceResultList = [];

    this.racerData = new Map();
    var self = this;
    this.allRacers.forEach(function (r, i) {
        self.racerData.set(r, {
            lap:        0,
            nextCp:     0,
            cpCount:    0,
            finished:   false,
            finishPos:  -1,
            finishTime: 0,
            isPlayer:   (r === self.playerCar)
        });
    });

    this.state = 'idle';
};

GameManager.prototype.startCountdown = function () {
    this.state = 'countdown';
    var self = this;
    var count = 3;

    this.app.fire('ui:countdown', count);

    var interval = setInterval(function () {
        count--;
        if (count <= 0) {
            clearInterval(interval);
            self.app.fire('ui:countdown', 'GO!');
            setTimeout(function () {
                self.app.fire('ui:countdown', null);
                self._beginRace();
            }, 700);
        } else {
            self.app.fire('ui:countdown', count);
        }
    }, 1000);
};

GameManager.prototype._beginRace = function () {
    this.state  = 'racing';
    this._startTime = Date.now();
    this.app.fire('race:started');
};

GameManager.prototype._onCheckpoint = function (evt) {
    var racer       = evt.racerEntity;
    var cpIndex     = evt.checkpointIndex;
    var isStartFinish = evt.isStartFinish;

    var data = this.racerData.get(racer);
    if (!data || data.finished) return;
    if (this.state !== 'racing') return;

    var expected = data.nextCp;
    var diff = (cpIndex - expected + this.totalCheckpoints) % this.totalCheckpoints;
    if (diff > 1) return;

    data.cpCount++;
    data.nextCp = (cpIndex + 1) % this.totalCheckpoints;

    if (data.isPlayer) {
        AudioManager.playCheckpoint();
    }

    if (isStartFinish && data.cpCount > 0 && cpIndex === 0) {
        data.lap++;
        if (data.isPlayer) {
            this.app.fire('ui:lapComplete', data.lap, this.totalLaps);
        }
        if (data.lap >= this.totalLaps) {
            this._racerFinished(racer, data);
        }
    }
};

GameManager.prototype._racerFinished = function (racer, data) {
    data.finished   = true;
    data.finishPos  = ++this._finishCounter || (this._finishCounter = 1);
    data.finishTime = Date.now() - this._startTime;

    this._raceResultList.push({
        racer: racer,
        position: data.finishPos,
        time: data.finishTime,
        isPlayer: data.isPlayer
    });

    if (data.isPlayer) {
        this.app.fire('race:playerFinished', data.finishPos, data.finishTime);
    }

    var allDone = true;
    this.racerData.forEach(function (d) { if (!d.finished) allDone = false; });
    if (allDone) {
        this._endRace();
    } else {
        var self = this;
        setTimeout(function () {
            self.racerData.forEach(function (d, r) {
                if (!d.finished) {
                    d.finished = true;
                    d.finishPos = ++self._finishCounter;
                    d.finishTime = Date.now() - self._startTime;
                    self._raceResultList.push({ racer: r, position: d.finishPos, time: d.finishTime, isPlayer: d.isPlayer });
                }
            });
            self._endRace();
        }, 8000);
    }
};

GameManager.prototype._endRace = function () {
    this.state = 'finished';
    this._raceResultList.sort(function (a, b) { return a.position - b.position; });
    this.app.fire('race:ended', this._raceResultList);
};

GameManager.prototype._onPowerup = function (type) {
    if (this.playerCar && this.playerCar.script && this.playerCar.script.carController) {
        this.playerCar.script.carController.activatePowerup(type);
    }
};

GameManager.prototype.update = function (dt) {
    if (this.state !== 'racing') return;

    this._elapsedMs = Date.now() - this._startTime;
    this.app.fire('ui:tick', this._elapsedMs);

    var order = [];
    this.racerData.forEach(function (data, racer) {
        order.push({ racer: racer, data: data, progress: data.cpCount + data.lap * 1000 });
    });
    order.sort(function (a, b) { return b.progress - a.progress; });

    var playerPos = 1;
    for (var i = 0; i < order.length; i++) {
        if (order[i].racer === this.playerCar) { playerPos = i + 1; break; }
    }
    this.app.fire('ui:position', playerPos, order.length);

    if (this.playerCar) {
        var pData = this.racerData.get(this.playerCar);
        if (pData) {
            this.app.fire('ui:lapInfo', pData.lap, this.totalLaps);
        }
    }
};

GameManager.prototype.getRacerData = function (racer) {
    return this.racerData.get(racer);
};

GameManager.prototype.resetRace = function () {
    this.state = 'idle';
    this._finishCounter = 0;
    this._raceResultList = [];
    this.racerData = new Map();
    this._startTime = 0;
};
