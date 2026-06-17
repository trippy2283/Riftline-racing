/* =====================================================
   UIManager.js
   DOM-based HUD, menus, touch controls, story modal,
   settings screen, and toast notifications.
   ===================================================== */

var UIManager = (function () {

    var _career  = null;
    var _app     = null;
    var _selectedCityId   = null;
    var _carSelectIndex   = 0;
    var _miniCtx = null;
    var _waypointPositions = [];

    // Story
    var _storyQueue = [];
    var _storyIndex = 0;
    var _storyDone  = null;

    // Choice
    var _choiceCbs = null;

    // Toast
    var _toastTimer = null;

    // Character display map
    var CHAR_META = {
        player:      { name: 'YOU',         portrait: '🧑' },
        father:      { name: 'DAD',          portrait: '👨‍🔧' },
        doyle:       { name: 'DOYLE',        portrait: '🧓' },
        blaze:       { name: 'BLAZE',        portrait: '😤' },
        enforcer:    { name: 'VIC CRANE',    portrait: '🕶' },
        grandfather: { name: 'GRANDDAD',     portrait: '👴' }
    };

    function ordinal(n) {
        var s = ['th','st','nd','rd'], v = n % 100;
        return n + (s[(v-20)%10] || s[v] || s[0]);
    }

    function fmtTime(ms) {
        if (!ms) return '--:--.---';
        var mins  = Math.floor(ms / 60000);
        var secs  = Math.floor((ms % 60000) / 1000);
        var milli = ms % 1000;
        return mins + ':' + (secs < 10 ? '0' : '') + secs + '.' +
               (milli < 100 ? '0' : '') + (milli < 10 ? '0' : '') + milli;
    }

    function stars(n) {
        var s = '';
        for (var i = 0; i < 5; i++) s += (i < n ? '★' : '☆');
        return s;
    }

    function el(id) { return document.getElementById(id); }

    // =========================================================
    //  INIT
    // =========================================================
    function init(app, career) {
        _app    = app;
        _career = career;

        _setupTouchControls();
        _bindMenuButtons();
        _bindGameEvents();
        _setupMinimap();
        _renderSaveInfo();

        AudioManager.init();

        // Animate loading bar then reveal menu
        var bar  = el('loading-bar');
        var tips = ['Warming up engines…','Laying down rubber…','Calibrating turbo…','Checking tire pressure…'];
        var t    = el('loading-tip');
        var pct  = 0;
        var iv   = setInterval(function () {
            pct += Math.random() * 18 + 8;
            if (pct >= 100) { pct = 100; clearInterval(iv); }
            bar.style.width = pct + '%';
            t.textContent = tips[Math.floor(Math.random() * tips.length)];
        }, 220);

        setTimeout(function () {
            el('screen-loading').classList.add('hidden');
            el('screen-menu').style.display = '';
        }, 1200);
    }

    function _renderSaveInfo() {
        var s = _career.save;
        el('save-info').textContent =
            'LVL ' + s.playerLevel + '  ·  ★ ' + s.credits + ' CR  ·  ' + s.totalWins + ' WINS';
    }

    // =========================================================
    //  BUTTON BINDINGS
    // =========================================================
    function _bindMenuButtons() {
        // ---- Main menu ----
        el('btn-career').addEventListener('click', function () {
            AudioManager.playUIClick(); showCareerScreen();
        });
        el('btn-quickrace').addEventListener('click', function () {
            AudioManager.playUIClick();
            _selectedCityId = 'tulsa';
            showCarSelectScreen('QUICK RACE');
        });
        el('btn-garage').addEventListener('click', function () {
            AudioManager.playUIClick(); showGarageScreen();
        });
        el('btn-settings').addEventListener('click', function () {
            AudioManager.playUIClick(); showSettingsScreen();
        });

        // ---- Career ----
        el('career-back').addEventListener('click', function () {
            AudioManager.playUIClick(); showMainMenu();
        });

        // ---- Car select ----
        el('car-prev').addEventListener('click', function () { AudioManager.playUIClick(); _navCarousel(-1); });
        el('car-next').addEventListener('click', function () { AudioManager.playUIClick(); _navCarousel(1); });
        el('carselect-back').addEventListener('click', function () {
            AudioManager.playUIClick();
            if (_selectedCityId) showCareerScreen(); else showMainMenu();
        });
        el('btn-startrace').addEventListener('click', function () {
            AudioManager.playUIClick();
            var unlockedCars = _career.cars.filter(function (c) { return c.unlocked; });
            var car = unlockedCars[_carSelectIndex];
            if (car) { _career.selectCar(car.id); _app.fire('game:startRace', _selectedCityId); }
        });

        // ---- Garage ----
        el('garage-back').addEventListener('click', function () {
            AudioManager.playUIClick(); showMainMenu();
        });
        document.querySelectorAll('.garage-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                AudioManager.playUIClick();
                document.querySelectorAll('.garage-tab').forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                if (tab.dataset.tab === 'tuning') {
                    el('garage-tab-cars').classList.add('hidden');
                    el('garage-tab-tuning').classList.remove('hidden');
                    _renderTuning();
                } else {
                    el('garage-tab-tuning').classList.add('hidden');
                    el('garage-tab-cars').classList.remove('hidden');
                }
            });
        });
        el('btn-save-tuning').addEventListener('click', function () {
            AudioManager.playUIClick();
            var carId   = _career.save.selectedCar;
            var inputs  = el('tuning-sliders').querySelectorAll('input[type=range]');
            var tuning  = {};
            inputs.forEach(function (s) { tuning[s.dataset.key] = parseFloat(s.value); });
            _career.saveTuning(carId, tuning);
            showToast('TUNING SAVED!', 1500);
        });

        // ---- Settings ----
        el('settings-back').addEventListener('click', function () {
            AudioManager.playUIClick(); showMainMenu();
        });
        el('toggle-sfx').addEventListener('click', function () {
            _career.save.settings.sfx = !_career.save.settings.sfx;
            AudioManager.setEnabled(_career.save.settings.sfx);
            _career.persist();
            _syncSettingsToggles();
        });
        el('toggle-vibration').addEventListener('click', function () {
            _career.save.settings.vibration = !_career.save.settings.vibration;
            _career.persist();
            _syncSettingsToggles();
        });
        el('btn-reset-save').addEventListener('click', function () {
            if (confirm('Reset ALL progress? This cannot be undone.')) {
                _career.resetSave();
                showToast('SAVE RESET', 2000);
                showMainMenu();
            }
        });
        el('btn-owner-unlock').addEventListener('click', function () {
            var code = el('owner-code-input').value.trim();
            var valid = (code === 'gallowaytrippy22@gmail.com' ||
                         code === 'RIFTOWNER' ||
                         code === 'OWNER2024');
            if (valid) {
                _career.ownerUnlock();
                el('owner-code-input').value = '';
                _renderSaveInfo();
                showToast('OWNER MODE — ALL UNLOCKED!', 4000);
            } else {
                showToast('Invalid code', 2000);
                el('owner-code-input').style.borderColor = '#cc0000';
                setTimeout(function () { el('owner-code-input').style.borderColor = ''; }, 800);
            }
        });

        // ---- Results ----
        el('btn-retry').addEventListener('click', function () {
            AudioManager.playUIClick(); _app.fire('game:startRace', _selectedCityId);
        });
        el('btn-continue').addEventListener('click', function () {
            AudioManager.playUIClick(); showCareerScreen();
        });

        // ---- Story modal ----
        el('story-next').addEventListener('click', function () {
            _storyIndex++;
            if (_storyIndex >= _storyQueue.length) _dismissStory();
            else _renderStoryScene();
        });
        el('story-skip').addEventListener('click', _dismissStory);

        // ---- Choice modal ----
        el('choice-legal').addEventListener('click', function () {
            el('choice-modal').classList.add('hidden');
            if (_choiceCbs && _choiceCbs.legal) _choiceCbs.legal();
            _choiceCbs = null;
        });
        el('choice-underground').addEventListener('click', function () {
            el('choice-modal').classList.add('hidden');
            if (_choiceCbs && _choiceCbs.underground) _choiceCbs.underground();
            _choiceCbs = null;
        });
    }

    // =========================================================
    //  SETTINGS SCREEN
    // =========================================================
    function showSettingsScreen() {
        _hideAll();
        el('screen-settings').classList.remove('hidden');
        _syncSettingsToggles();
    }

    function _syncSettingsToggles() {
        var s = _career.save.settings;
        var sfxBtn = el('toggle-sfx');
        var vibBtn = el('toggle-vibration');
        sfxBtn.textContent = s.sfx ? 'ON' : 'OFF';
        sfxBtn.classList.toggle('off', !s.sfx);
        vibBtn.textContent = s.vibration ? 'ON' : 'OFF';
        vibBtn.classList.toggle('off', !s.vibration);
    }

    // =========================================================
    //  CAREER SCREEN
    // =========================================================
    function showCareerScreen() {
        _hideAll();
        el('screen-career').classList.remove('hidden');
        el('career-wins-total').textContent = '🏆 ' + _career.save.totalWins + ' WINS';

        var list = el('city-list');
        list.innerHTML = '';

        _career.cities.forEach(function (city) {
            var unlocked = _career.isCityUnlocked(city.id);
            var progress = _career.getCityProgress(city.id);

            var card = document.createElement('div');
            card.className = 'city-card' + (unlocked ? '' : ' locked') + (progress.wins > 0 ? ' won' : '');

            var bar = document.createElement('div');
            bar.className = 'city-accent-bar';
            bar.style.background = city.color;
            card.appendChild(bar);

            var nameEl = document.createElement('div');
            nameEl.className = 'city-card-name';
            nameEl.textContent = city.city;
            card.appendChild(nameEl);

            var trackEl = document.createElement('div');
            trackEl.className = 'city-card-track';
            trackEl.textContent = city.track + ' · ' + city.country;
            card.appendChild(trackEl);

            var meta = document.createElement('div');
            meta.className = 'city-card-meta';

            var diff = document.createElement('span');
            diff.className = 'city-diff-stars';
            diff.textContent = stars(city.difficulty);
            meta.appendChild(diff);

            if (progress.wins > 0) {
                var status = document.createElement('span');
                status.className = 'city-status-won';
                status.textContent = '✓ ' + progress.wins + ' WIN' + (progress.wins > 1 ? 'S' : '');
                meta.appendChild(status);
            } else if (!unlocked) {
                var req = document.createElement('span');
                req.className = 'city-req';
                req.textContent = 'Need ' + city.requiredWins + ' wins';
                meta.appendChild(req);
            }

            if (progress.bestTime) {
                var bt = document.createElement('span');
                bt.style.color = 'var(--text-dim)';
                bt.style.fontSize = '0.68rem';
                bt.textContent = 'BEST ' + fmtTime(progress.bestTime);
                meta.appendChild(bt);
            }

            card.appendChild(meta);

            if (unlocked) {
                card.addEventListener('click', function () {
                    AudioManager.playUIClick();
                    _selectedCityId = city.id;
                    showCarSelectScreen(city.city);
                });
            }

            list.appendChild(card);
        });
    }

    // =========================================================
    //  CAR SELECT
    // =========================================================
    function showCarSelectScreen(titleText) {
        _hideAll();
        el('screen-carselect').classList.remove('hidden');
        el('carselect-title').textContent = titleText || 'SELECT YOUR CAR';

        var unlockedCars = _career.cars.filter(function (c) { return c.unlocked; });
        var selIdx = unlockedCars.findIndex(function (c) { return c.id === _career.save.selectedCar; });
        _carSelectIndex = Math.max(0, selIdx);

        _renderCarousel();

        if (_selectedCityId) {
            var city = _career.getCity(_selectedCityId);
            var raceBar = el('race-details-bar');
            if (city && raceBar) {
                raceBar.innerHTML =
                    '<b>' + city.laps + ' LAPS</b> &nbsp;·&nbsp; ' +
                    city.opponents.map(function (o) { return o.name; }).join(' &nbsp;|&nbsp; ');
            }
        }
    }

    function _navCarousel(dir) {
        var unlockedCars = _career.cars.filter(function (c) { return c.unlocked; });
        _carSelectIndex = (_carSelectIndex + dir + unlockedCars.length) % unlockedCars.length;
        _renderCarousel();
    }

    function _renderCarousel() {
        var unlockedCars = _career.cars.filter(function (c) { return c.unlocked; });
        var car = unlockedCars[_carSelectIndex];
        if (!car) return;

        el('car-visual').innerHTML = '<span style="font-size:4rem">' + car.icon + '</span>';
        el('car-visual').style.borderColor = car.color;
        el('car-name-display').textContent = car.name;
        el('car-name-display').style.color = car.color;

        var classEl = el('car-class-display');
        if (classEl) classEl.textContent = 'CLASS ' + car.class;

        var descEl = el('car-desc-display');
        if (descEl) descEl.textContent = car.description || '';

        var statsEl = el('car-stats-display');
        statsEl.innerHTML = '';
        var statKeys = ['speed', 'accel', 'handling', 'nitro'];
        var labels   = ['SPEED', 'ACCEL', 'HANDLNG', 'NITRO'];
        statKeys.forEach(function (key, i) {
            var val = car.stats[key];
            var row = document.createElement('div');
            row.className = 'car-stat-row';
            row.innerHTML =
                '<span class="car-stat-label">' + labels[i] + '</span>' +
                '<div class="car-stat-bar-bg"><div class="car-stat-bar" style="width:' +
                (val * 10) + '%;background:' + car.color + '"></div></div>' +
                '<span class="car-stat-num">' + val + '</span>';
            statsEl.appendChild(row);
        });
    }

    // =========================================================
    //  GARAGE
    // =========================================================
    function showGarageScreen() {
        _hideAll();
        el('screen-garage').classList.remove('hidden');
        el('credit-count').textContent = _career.save.credits;

        document.querySelectorAll('.garage-tab').forEach(function (t) { t.classList.remove('active'); });
        var carsTab = document.querySelector('.garage-tab[data-tab="cars"]');
        if (carsTab) carsTab.classList.add('active');
        el('garage-tab-cars').classList.remove('hidden');
        el('garage-tab-tuning').classList.add('hidden');

        var grid = el('garage-cars');
        grid.innerHTML = '';

        _career.cars.forEach(function (car) {
            var card = document.createElement('div');
            card.className = 'garage-car-card' +
                (car.unlocked ? ' owned' : ' locked') +
                (car.id === _career.save.selectedCar ? ' selected' : '');

            card.innerHTML =
                '<span class="garage-car-icon">' + car.icon + '</span>' +
                '<div class="garage-car-name" style="color:' + car.color + '">' + car.name + '</div>' +
                (car.unlocked
                    ? '<div class="garage-car-owned">OWNED' + (car.id === _career.save.selectedCar ? ' · SELECTED' : '') + '</div>'
                    : '<div class="garage-car-cost">★ ' + car.cost + ' CR</div>');

            card.addEventListener('click', function () {
                AudioManager.playUIClick();
                if (car.unlocked) {
                    _career.selectCar(car.id);
                    showGarageScreen();
                } else {
                    if (_career.buyCar(car.id)) {
                        AudioManager.playPowerup();
                        showGarageScreen();
                    } else {
                        showToast('NOT ENOUGH CREDITS', 1800);
                        card.style.borderColor = '#cc0000';
                        setTimeout(function () { card.style.borderColor = ''; }, 600);
                    }
                }
            });

            grid.appendChild(card);
        });
    }

    function _renderTuning() {
        var carId = _career.save.selectedCar;
        var car   = _career.getCar(carId);
        if (!car) return;

        el('tuning-car-name').textContent = car.name;
        var t    = _career.save.carTuning[carId] || car.tuning;
        var keys = ['rideHeight', 'camber', 'tireWidth', 'suspension'];
        var lbls = ['RIDE HEIGHT', 'CAMBER', 'TIRE WIDTH', 'SUSPENSION'];
        var cont = el('tuning-sliders');
        cont.innerHTML = '';

        keys.forEach(function (key, i) {
            var row = document.createElement('div');
            row.className = 'tuning-row';

            var lbl = document.createElement('label');
            lbl.className = 'tuning-label';
            lbl.textContent = lbls[i];

            var slider = document.createElement('input');
            slider.type  = 'range';
            slider.min   = 1;
            slider.max   = 10;
            slider.step  = 1;
            slider.value = (t && t[key] !== undefined) ? t[key] : 5;
            slider.dataset.key = key;
            slider.className   = 'tuning-slider';

            var val = document.createElement('span');
            val.className   = 'tuning-val';
            val.textContent = slider.value;
            slider.addEventListener('input', function () { val.textContent = this.value; });

            row.appendChild(lbl);
            row.appendChild(slider);
            row.appendChild(val);
            cont.appendChild(row);
        });
    }

    // =========================================================
    //  RACE HUD
    // =========================================================
    function showHUD() {
        el('hud').classList.remove('hidden');
        el('touch-controls').classList.remove('hidden');
        el('minimap').classList.remove('hidden');
    }

    function hideHUD() {
        el('hud').classList.add('hidden');
        el('touch-controls').classList.add('hidden');
    }

    // =========================================================
    //  COUNTDOWN
    // =========================================================
    function showCountdown(value) {
        if (value === null || value === undefined) {
            el('countdown').classList.add('hidden');
            return;
        }
        el('countdown').classList.remove('hidden');
        el('countdown-text').textContent = String(value);
        var ct = el('countdown-text');
        ct.style.animation = 'none';
        ct.offsetHeight;
        ct.style.animation = '';
        AudioManager.playCountdown(value);
    }

    // =========================================================
    //  CITY BANNER
    // =========================================================
    function showCityBanner(city, duration) {
        var b = el('city-banner');
        el('banner-city').textContent  = city.city;
        el('banner-track').textContent = city.track;
        el('banner-laps').textContent  = city.laps + ' LAPS · ' + stars(city.difficulty);
        b.classList.remove('hidden');
        setTimeout(function () { b.classList.add('hidden'); }, (duration || 3) * 1000);
    }

    // =========================================================
    //  RACE RESULTS
    // =========================================================
    function showResults(results, cityId, timeMs) {
        hideHUD();
        _hideAll();
        el('screen-results').classList.remove('hidden');

        var playerResult = results.find(function (r) { return r.isPlayer; });
        var pos = playerResult ? playerResult.position : 4;
        var won = (pos === 1);

        var badges = ['🥇','🥈','🥉','💀'];
        el('results-badge').textContent = badges[Math.min(pos - 1, 3)];
        el('results-title').textContent =
            won ? 'VICTORY!' : (pos === 2 ? 'RUNNER UP' : pos === 3 ? 'THIRD PLACE' : 'DEFEAT');
        el('results-title').style.color =
            won ? 'var(--gold)' : (pos <= 2 ? 'var(--white)' : 'var(--red-hi)');

        var table = el('results-table');
        table.innerHTML = '';
        results.forEach(function (r) {
            var row = document.createElement('div');
            row.className = 'result-row' + (r.isPlayer ? ' player-row' : '');
            var name = r.racer ? (r.racer._displayName || r.racer.name) : 'Racer';
            row.innerHTML =
                '<span class="result-pos">'  + ordinal(r.position) + '</span>' +
                '<span class="result-name">' + name                + '</span>' +
                '<span class="result-time">' + fmtTime(r.time)     + '</span>';
            table.appendChild(row);
        });

        var result = null;
        if (cityId) {
            result = _career.recordRaceResult(cityId, pos, timeMs);
            if (result) {
                var html = '★ +' + result.credits + ' CR';
                if (result.xp)           html += '  ·  +' + result.xp + ' XP';
                if (result.levelsGained) html += '  ·  LEVEL UP → ' + result.newLevel + '!';
                if (result.newCarUnlock)   html += '<br>🚗 UNLOCKED: ' + result.newCarUnlock.name;
                if (result.newTrackUnlock) html += '<br>🗺 NEW CITY: '  + result.newTrackUnlock.city;
                el('results-rewards').innerHTML = html;
                el('results-rewards').style.display = '';
            }

            if (window.StoryManager) {
                StoryManager.checkTriggers('race:playerFinished', {
                    position: pos,
                    cityId:   cityId
                });
                StoryManager.checkTriggers('career:wins', {
                    wins:   _career.save.totalWins,
                    cityId: cityId
                });
            }
        }

        _renderSaveInfo();
        if (won) AudioManager.playFinish();
    }

    // =========================================================
    //  STORY MODAL
    // =========================================================
    function showStoryModal(scenes, onComplete) {
        _storyQueue = scenes || [];
        _storyIndex = 0;
        _storyDone  = onComplete || null;
        if (!_storyQueue.length) { if (_storyDone) _storyDone(); return; }
        el('story-modal').classList.remove('hidden');
        _renderStoryScene();
    }

    function _renderStoryScene() {
        var scene = _storyQueue[_storyIndex];
        if (!scene) { _dismissStory(); return; }

        var meta = CHAR_META[scene.char] || { name: String(scene.char).toUpperCase(), portrait: '👤' };
        el('story-portrait').textContent  = meta.portrait;
        el('story-char-name').textContent = meta.name;
        el('story-text').textContent      = scene.text;

        var relBar = el('story-relationship-bar');
        if (window.StoryManager && scene.char !== 'player') {
            var rel = StoryManager.getRelationship(scene.char);
            el('story-rel-fill').style.width = rel + '%';
            if (relBar) relBar.classList.remove('hidden');
        } else {
            if (relBar) relBar.classList.add('hidden');
        }
    }

    function _dismissStory() {
        el('story-modal').classList.add('hidden');
        _storyQueue = [];
        _storyIndex = 0;
        if (_storyDone) { var cb = _storyDone; _storyDone = null; cb(); }
    }

    // =========================================================
    //  CHOICE MODAL
    // =========================================================
    function showChoiceModal(onLegal, onUnderground) {
        _choiceCbs = { legal: onLegal, underground: onUnderground };
        el('choice-modal').classList.remove('hidden');
    }

    // =========================================================
    //  TOAST
    // =========================================================
    function showToast(message, duration) {
        var toastEl = el('toast');
        toastEl.textContent = message;
        toastEl.classList.remove('hidden');
        if (_toastTimer) clearTimeout(_toastTimer);
        _toastTimer = setTimeout(function () {
            toastEl.classList.add('hidden');
            _toastTimer = null;
        }, duration || 2500);
    }

    // =========================================================
    //  TOUCH CONTROLS
    // =========================================================
    function _setupTouchControls() {
        var map = {
            'btn-left':  'left',
            'btn-right': 'right',
            'btn-accel': 'accel',
            'btn-brake': 'brake',
            'btn-nitro': 'nitro'
        };
        Object.keys(map).forEach(function (id) {
            var key   = map[id];
            var btnEl = el(id);
            if (!btnEl) return;
            ['touchstart','touchend','touchcancel'].forEach(function (evtName) {
                btnEl.addEventListener(evtName, function (e) {
                    e.preventDefault();
                    var on = (evtName === 'touchstart');
                    btnEl.classList.toggle('active', on);
                    _app.fire('input:' + key, on);
                    if (on) AudioManager._resume && AudioManager._resume();
                }, { passive: false });
            });
        });
    }

    // =========================================================
    //  MINIMAP
    // =========================================================
    function _setupMinimap() {
        var canvas = el('minimap');
        if (canvas) _miniCtx = canvas.getContext('2d');
    }

    function setMinimapWaypoints(positions) {
        _waypointPositions = positions || [];
    }

    function updateMinimap(playerPos, aiPositions) {
        if (!_miniCtx || !_waypointPositions.length) return;
        var ctx = _miniCtx;
        var W = 160, H = 160;
        ctx.clearRect(0, 0, W, H);

        var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        _waypointPositions.forEach(function (p) {
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
            minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
        });
        var scaleX = (W - 20) / Math.max(maxX - minX, 1);
        var scaleZ = (H - 20) / Math.max(maxZ - minZ, 1);
        var scale  = Math.min(scaleX, scaleZ);

        function toMap(x, z) {
            return { x: 10 + (x - minX) * scale, y: H - 10 - (z - minZ) * scale };
        }

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        _waypointPositions.forEach(function (p, i) {
            var m = toMap(p.x, p.z);
            if (i === 0) ctx.moveTo(m.x, m.y); else ctx.lineTo(m.x, m.y);
        });
        ctx.closePath();
        ctx.stroke();

        if (aiPositions) {
            aiPositions.forEach(function (pos) {
                var m = toMap(pos.x, pos.z);
                ctx.beginPath();
                ctx.fillStyle = 'rgba(200,200,200,0.7)';
                ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        if (playerPos) {
            var pm = toMap(playerPos.x, playerPos.z);
            ctx.beginPath();
            ctx.fillStyle = '#cc0000';
            ctx.arc(pm.x, pm.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // =========================================================
    //  GAME EVENT BINDINGS
    // =========================================================
    function _bindGameEvents() {
        _app.on('ui:countdown', showCountdown);

        _app.on('ui:speed', function (mph, ratio) {
            el('speed-value').textContent = mph;
            var arcLen = Math.round(ratio * 173);
            el('speed-arc-fill').setAttribute('stroke-dasharray', arcLen + ' 173');
            var color = ratio > 0.85 ? '#ff2200' : ratio > 0.6 ? '#ff8800' : '#cc0000';
            el('speed-arc-fill').setAttribute('stroke', color);
        });

        _app.on('ui:nitroCharge', function (charge) {
            el('nitro-bar-fill').style.width = Math.round(charge * 100) + '%';
        });

        _app.on('ui:nitroActive', function (on) {
            el('nitro-bar-fill').style.boxShadow = on ? '0 0 12px #ff4400' : '';
        });

        _app.on('ui:lapInfo', function (lap, total) {
            el('lap-count').textContent = Math.min(lap + 1, total) + ' / ' + total;
        });

        _app.on('ui:lapComplete', function (lap, total) {
            var flash = el('lap-flash');
            flash.textContent = lap >= total ? 'FINAL LAP!' : 'LAP ' + lap + ' / ' + total;
            flash.style.color = lap >= total ? 'var(--red-hi)' : 'var(--white)';
            flash.classList.remove('hidden');
            flash.style.animation = 'none';
            flash.offsetHeight;
            flash.style.animation = '';
            setTimeout(function () { flash.classList.add('hidden'); }, 1600);
            AudioManager.playLapComplete();
        });

        _app.on('ui:position', function (pos) {
            el('race-position').innerHTML = ordinal(pos);
        });

        _app.on('ui:tick', function (ms) {
            el('race-timer').textContent = fmtTime(ms);
        });

        _app.on('ui:wrongWay', function (on) {
            el('wrong-way-banner').classList.toggle('hidden', !on);
        });

        _app.on('ui:powerupFlash', function (name) {
            if (!name) { el('active-powerup').classList.add('hidden'); return; }
            el('active-powerup').classList.remove('hidden');
            el('powerup-icon').textContent =
                name === 'NITRO' ? '⚡' : name === 'SHIELD' ? '🛡' : '❤️';
        });

        _app.on('story:showScene', function (data) {
            if (data && data.scenes) showStoryModal(data.scenes);
        });

        _app.on('story:showChoice', function (choiceId) {
            showChoiceModal(
                function () { _app.fire('career:pathChosen', 'legal'); },
                function () { _app.fire('career:pathChosen', 'underground'); }
            );
        });

        _app.on('story:pathChanged', function (pathId, pathData) {
            var name = pathData ? pathData.name : pathId.toUpperCase();
            showToast('PATH: ' + name, 3000);
        });
    }

    // =========================================================
    //  HELPERS
    // =========================================================
    function _hideAll() {
        ['screen-menu','screen-career','screen-carselect','screen-garage',
         'screen-settings','screen-results','city-banner','countdown','hud',
         'touch-controls','minimap','wrong-way-banner','lap-flash','active-powerup',
         'story-modal','choice-modal'].forEach(function (id) {
            var e = el(id);
            if (e) e.classList.add('hidden');
        });
        el('screen-menu').style.display = 'none';
    }

    function showMainMenu() {
        _hideAll();
        el('screen-menu').style.display = '';
        _renderSaveInfo();
    }

    // =========================================================
    //  PUBLIC API
    // =========================================================
    return {
        init,
        showMainMenu,
        showCareerScreen,
        showCarSelectScreen,
        showGarageScreen,
        showSettingsScreen,
        showHUD,
        hideHUD,
        showCountdown,
        showCityBanner,
        showResults,
        showStoryModal,
        showChoiceModal,
        showToast,
        setMinimapWaypoints,
        updateMinimap,
        fmtTime,
        ordinal
    };
})();

window.UIManager = UIManager;
