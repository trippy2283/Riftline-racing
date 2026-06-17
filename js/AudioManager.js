/* =====================================================
   AudioManager.js
   Procedural audio via Web Audio API.
   Engine oscillator changes pitch with speed.
   UI sound effects via short tone bursts.
   (No external audio files required — all synthesised)
   ===================================================== */

var AudioManager = (function () {

    var _ctx    = null;
    var _engine = null;  // oscillator node for engine sound
    var _gainNode = null;
    var _enabled  = true;

    function init() {
        try {
            _ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return; }
    }

    function _resume() {
        if (_ctx && _ctx.state === 'suspended') _ctx.resume();
    }

    // ---- Engine Sound ---------------------------------------------------
    function startEngine() {
        if (!_ctx || _engine) return;
        _resume();

        _gainNode = _ctx.createGain();
        _gainNode.gain.value = 0.25;

        // Base oscillator (engine rumble)
        _engine = _ctx.createOscillator();
        _engine.type = 'sawtooth';
        _engine.frequency.value = 55;

        // Low-pass filter for warmth
        var filter = _ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;

        _engine.connect(filter);
        filter.connect(_gainNode);
        _gainNode.connect(_ctx.destination);
        _engine.start();
    }

    function updateEngine(speedRatio, isNitro) {
        if (!_ctx || !_engine) return;
        if (!_enabled) { _gainNode.gain.value = 0; return; }

        // Frequency: 55 Hz idle → 280 Hz top speed
        var baseFreq = 55 + speedRatio * 225;
        if (isNitro) baseFreq *= 1.3;
        _engine.frequency.setTargetAtTime(baseFreq, _ctx.currentTime, 0.08);

        var vol = 0.12 + speedRatio * 0.18;
        _gainNode.gain.setTargetAtTime(vol, _ctx.currentTime, 0.1);
    }

    function stopEngine() {
        if (_engine) {
            try { _engine.stop(); } catch (e) {}
            _engine = null;
        }
    }

    // ---- One-shot tones ------------------------------------------------
    function playTone(freq, duration, type, vol) {
        if (!_ctx || !_enabled) return;
        _resume();
        var osc  = _ctx.createOscillator();
        var gain = _ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.value = vol || 0.3;
        gain.gain.exponentialRampToValueAtTime(0.001, _ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(_ctx.destination);
        osc.start();
        osc.stop(_ctx.currentTime + duration);
    }

    function playCountdown(number) {
        if (number === 'GO!') {
            playTone(880, 0.25, 'square', 0.4);
            setTimeout(function () { playTone(1100, 0.3, 'square', 0.3); }, 120);
        } else {
            playTone(440, 0.18, 'square', 0.25);
        }
    }

    function playCheckpoint() { playTone(660, 0.15, 'sine', 0.2); }
    function playLapComplete() {
        playTone(523, 0.12, 'sine', 0.25);
        setTimeout(function () { playTone(659, 0.12, 'sine', 0.25); }, 120);
        setTimeout(function () { playTone(784, 0.2, 'sine', 0.3); }, 240);
    }
    function playPowerup()   { playTone(880, 0.12, 'sine', 0.2); }
    function playNitro()     {
        playTone(110, 0.08, 'sawtooth', 0.15);
        setTimeout(function () { playTone(165, 0.1, 'sawtooth', 0.12); }, 50);
    }
    function playFinish()    {
        [523,659,784,1047].forEach(function (f, i) {
            setTimeout(function () { playTone(f, 0.3, 'sine', 0.3); }, i * 150);
        });
    }
    function playUIClick()   { playTone(660, 0.06, 'sine', 0.15); }

    function setEnabled(on) { _enabled = on; }

    return {
        init, startEngine, updateEngine, stopEngine,
        playCountdown, playCheckpoint, playLapComplete,
        playPowerup, playNitro, playFinish, playUIClick,
        setEnabled,
        _resume   // exposed for touch handler to resume suspended AudioContext
    };
})();

window.AudioManager = AudioManager;
