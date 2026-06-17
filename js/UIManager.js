/* =====================================================
   UIManager.js
   DOM-based HUD, menus, and touch controls.
   Bridges PlayCanvas game events → DOM updates.
   Also handles the garage tuning screen.
   ===================================================== */

var UIManager = (function () {

    var _career  = null;
    var _app     = null;
    var _selectedCityId = null;
    var _carSelectIndex  = 0;
    var _miniCtx = null;
    var _waypointPositions = [];

    // Ordinal suffix
    function ordinal(n) {
        var s = ['th','st','nd','rd'], v = n % 100;
        return n + (s[(v-20)%10] || s[v] || s[0]);
    }

    // Format ms to M:SS.mmm
    function fmtTime(ms) {
        if (!ms) return '--:--.---';
        var mins = Math.floor(ms / 60000);
        var secs = Math.floor((ms % 60000) / 1000);
        var milli = ms % 1000;
        return mins + ':' + (secs < 10 ? '0' : '') + secs + '.' + (milli < 100 ? '0' : '') + (milli < 10 ? '0' : '') + milli;
    }

    // Difficulty stars
    function stars(n) {
        var s = '';
        for (var i = 0; i < 5; i++) s += (i < n ? '★' : '☆');
        return s;
    }

    function el(id) { return document.getElementById(id); }

    // ---- Init -----------------------------------------------------------
    function init(app, career) {
        _app    = app;
        _career = career;

        _setupTouchControls();
        _bindMenuButtons();
        _bindGameEvents();
        _setupMinimap();
        _renderSaveInfo();

        AudioManager.init();

        // Hide loading screen
        setTimeout(function () {
            el('screen-loading').classList.add('hidden');
            el('screen-menu').style.display = '';
        }, 1200);

        // Animate loading bar
        var bar = el('loading-bar');
        var tips = ['Warming up engines…', 'Laying down rubber…', 'Calibrating turbo…', 'Checking tire pressure…'];
        var t = el('loading-tip');
        var pct = 0;
        var iv = setInterval(function () {
            pct += Math.random() * 18 + 8;
            if (pct >= 100) { pct = 100; clearInterval(iv); }
            bar.style.width = pct + '%';
            t.textContent = tips[Math.floor(Math.random() * tips.length)];
        }, 220);
    }

    function _renderSaveInfo() {
        var s = _career.save;
        el('save-info').textContent = 'LVL ' + s.playerLevel + '  ·  ★ ' + s.credits + ' CR  ·  ' + s.totalWins + ' WINS';
    }

    // ---- Menu Buttons ---------------------------------------------------
    function _bindMenuButtons() {
        // Main menu
        el('btn-career').addEventListener('click', function () { AudioManager.playUIClick(); showCareerScreen(); });
        el('btn-quickrace').addEventListener('click', function () { AudioManager.playUIClick(); _selectedCityId = 'tulsa'; showCarSelectScreen('QUICK RACE'); });
        el('btn-garage').addEventListener('click', function () { AudioManager.playUIClick(); showGarageScreen(); });

        // Career back
        el('career-back').addEventListener('click', function () { AudioManager.playUIClick(); showMainMenu(); });

        // Car select
        el('car-prev').addEventListener('click', function () { AudioManager.playUIClick(); _navCarousel(-1); });
        el('car-next').addEventListener('click', function () { AudioManager.playUIClick(); _navCarousel(1); });
        el('carselect-back').addEventListener('click', function () { AudioManager.playUIClick();
            _selectedCityId ? showCareerScreen() : showMainMenu(); });
        el('btn-startrace').addEventListener('click', function () { AudioManager.playUIClick();
            var car = _career.cars.filter(function (c) { return c.unlocked; })[_carSelectIndex];
            if (car) { _career.selectCar(car.id); _app.fire('game:startRace', _selectedCityId); }
        });

        // Garage back
        el('garage-back').addEventListener('click', function () { AudioManager.playUIClick(); showMainMenu(); });

        // Results
        el('btn-retry').addEventListener('click', function () { AudioManager.playUIClick(); _app.fire('game:startRace', _selectedCityId); });
        el('btn-continue').addEventListener('click', function () { AudioManager.playUIClick(); showCareerScreen(); });
    }

    // ---- Career Screen --------------------------------------------------
    function showCareerScreen() {
        _hideAll();
        el('screen-career').classList.remove('hidden');

        var totalWins = _career.save.totalWins;
        el('career-wins-total').textContent = '🏆 ' + totalWins + ' WINS';

        var list = el('city-list');
        list.innerHTML = '';

        _career.cities.forEach(function (city) {
            var unlocked = _career.isCityUnlocked(city.id);
            var progress = _career.getCityProgress(city.id);

            var card = document.createElement('div');
            card.className = 'city-card' + (unlocked ? '' : ' locked') + (progress.wins > 0 ? ' won' : '');

            // Accent bar
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

    // ---- Car Select Screen ----------------------------------------------
    function showCarSelectScreen(titleText) {
        _hideAll();
        el('screen-carselect').classList.remove('hidden');
        el('carselect-title').textContent = titleText || 'SELECT YOUR CAR';

        // Start carousel at selected car
        var unlockedCars = _career.cars.filter(function (c) { return c.unlocked; });
        var selIdx = unlockedCars.findIndex(function (c) { return c.id === _career.save.selectedCar; });
        _carSelectIndex = Math.max(0, selIdx);

        _renderCarousel();

        // Show city opponent info
        if (_selectedCityId) {
            var city = _career.getCity(_selectedCityId);
            if (city) {
                el('opponent-info').innerHTML =
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
                '<div class="car-stat-bar-bg"><div class="car-stat-bar" style="width:' + (val * 10) + '%;background:' + car.color + '"></div></div>' +
                '<span class="car-stat-num">' + val + '</span>';
            statsEl.appendChild(row);
        });
    }

    // ---- Garage Screen --------------------------------------------------
    function showGarageScreen() {
        _hideAll();
        el('screen-garage').classList.remove('hidden');
        el('credit-count').textContent = _career.save.credits;

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
                        // Flash insufficient credits
                        card.style.borderColor = '#cc0000';
                        setTimeout(function () { card.style.borderColor = ''; }, 600);
                    }
                }
            });

            grid.appendChild(card);
        });
    }

    // ---- Race HUD -------------------------------------------------------
    function showHUD() {
        el('hud').classList.remove('hidden');
        el('touch-controls').classList.remove('hidden');
        el('minimap').classList.remove('hidden');
    }

    function hideHUD() {
        el('hud').classList.add('hidden');
        el('touch-controls').classList.add('hidden');
    }

    // ---- Countdown ------------------------------------------------------
    function showCountdown(value) {
        if (value === null || value === undefined) {
            el('countdown').classList.add('hidden');
            return;
        }
        el('countdown').classList.remove('hidden');
        el('countdown-text').textContent = String(value);
        // Re-trigger animation
        var ct = el('countdown-text');
        ct.style.animation = 'none';
        ct.offsetHeight; // reflow
        ct.style.animation = '';
        AudioManager.playCountdown(value);
    }

    // ---- City Banner ----------------------------------------------------
    function showCityBanner(city, duration) {
        var b = el('city-banner');
        el('banner-city').textContent  = city.city;
        el('banner-track').textContent = city.track;
        el('banner-laps').textContent  = city.laps + ' LAPS · ' + stars(city.difficulty);
        b.classList.remove('hidden');
        setTimeout(function () { b.classList.add('hidden'); }, (duration || 3) * 1000);
    }

    // ---- Race Results ---------------------------------------------------
    function showResults(results, cityId, timeMs) {
        hideHUD();
        _hideAll();
        el('screen-results').classList.remove('hidden');

        var playerResult = results.find(function (r) { return r.isPlayer; });
        var pos  = playerResult ? playerResult.position : 4;
        var won  = pos === 1;

        var badges = ['🥇', '🥈', '🥉', '💀'];
        el('results-badge').textContent = badges[Math.min(pos - 1, 3)];
        el('results-title').textContent = won ? 'VICTORY!' : (pos === 2 ? 'RUNNER UP' : pos === 3 ? 'THIRD PLACE' : 'DEFEAT');
        el('results-title').style.color = won ? 'var(--gold)' : (pos <= 2 ? 'var(--off-white)' : 'var(--red-bright)');

        // Results table
        var table = el('results-table');
        table.innerHTML = '';
        results.forEach(function (r) {
            var row = document.createElement('div');
            row.className = 'result-row' + (r.isPlayer ? ' player-row' : '');
            var name = r.racer ? (r.racer._displayName || r.racer.name) : 'Racer';
            row.innerHTML =
                '<span class="result-pos">' + ordinal(r.position) + '</span>' +
                '<span class="result-name">' + name + '</span>' +
                '<span class="result-time">' + fmtTime(r.time) + '</span>';
            table.appendChild(row);
        });

        // Reward summary
        if (cityId) {
            var result = _career.recordRaceResult(cityId, pos, timeMs);
            if (result) {
                var rewardHtml = '★ +' + result.credits + ' CR';
                if (result.xp) rewardHtml += '  ·  +' + result.xp + ' XP';
                if (result.levelsGained) rewardHtml += '  ·  LEVEL UP → ' + result.newLevel + '!';
                if (result.newCarUnlock) rewardHtml += '<br>🚗 UNLOCKED: ' + result.newCarUnlock.name;
                if (result.newTrackUnlock) rewardHtml += '<br>🗺 NEW CITY: ' + result.newTrackUnlock.city;
                el('results-rewards').innerHTML = rewardHtml;
                el('results-rewards').style.display = '';
            }
        }

        _renderSaveInfo();
        if (won) AudioManager.playFinish();
    }

    // ---- Touch Controls -------------------------------------------------
    function _setupTouchControls() {
        function press(event, btn, state) {
            event.preventDefault();
            el(btn).classList.toggle('active', state);
            _app.fire('input:' + btn.replace('btn-', '').replace('left','left').replace('right','right'), state);
        }

        var map = {
            'btn-left':  'left',
            'btn-right': 'right',
            'btn-accel': 'accel',
            'btn-brake': 'brake',
            'btn-nitro': 'nitro'
        };

        Object.keys(map).forEach(function (id) {
            var key = map[id];
            var btnEl = el(id);
            if (!btnEl) return;
            ['touchstart','touchend','touchcancel'].forEach(function (evtName) {
                btnEl.addEventListener(evtName, function (e) {
                    e.preventDefault();
                    var on = (evtName === 'touchstart');
                    btnEl.classList.toggle('active', on);
                    _app.fire('input:' + key, on);
                    if (evtName === 'touchstart') AudioManager._resume && AudioManager._resume();
                }, { passive: false });
            });
        });
    }

    // ---- Minimap --------------------------------------------------------
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

        // Compute bounds
        var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        _waypointPositions.forEach(function (p) {
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
            minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
        });
        var scaleX = (W - 20) / Math.max(maxX - minX, 1);
        var scaleZ = (H - 20) / Math.max(maxZ - minZ, 1);
        var scale  = Math.min(scaleX, scaleZ);

        function toMap(x, z) {
            return {
                x: 10 + (x - minX) * scale,
                y: H - 10 - (z - minZ) * scale
            };
        }

        // Draw track line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        _waypointPositions.forEach(function (p, i) {
            var m = toMap(p.x, p.z);
            if (i === 0) ctx.moveTo(m.x, m.y);
            else ctx.lineTo(m.x, m.y);
        });
        ctx.closePath();
        ctx.stroke();

        // AI dots
        if (aiPositions) {
            aiPositions.forEach(function (pos) {
                var m = toMap(pos.x, pos.z);
                ctx.beginPath();
                ctx.fillStyle = 'rgba(200,200,200,0.7)';
                ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Player dot
        if (playerPos) {
            var pm = toMap(playerPos.x, playerPos.z);
            ctx.beginPath();
            ctx.fillStyle = '#cc0000';
            ctx.arc(pm.x, pm.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ---- Game Event Listeners ------------------------------------------
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
            flash.style.color = lap >= total ? 'var(--red-bright)' : 'var(--white)';
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
            el('powerup-icon').textContent = name === 'NITRO' ? '⚡' : name === 'SHIELD' ? '🛡' : '❤️';
        });
    }

    // ---- Helpers --------------------------------------------------------
    function _hideAll() {
        ['screen-menu','screen-career','screen-carselect','screen-garage',
         'screen-results','city-banner','countdown','hud','touch-controls',
         'minimap','wrong-way-banner','lap-flash','active-powerup'].forEach(function (id) {
            el(id).classList.add('hidden');
        });
        el('screen-menu').style.display = 'none';
    }

    function showMainMenu() {
        _hideAll();
        el('screen-menu').style.display = '';
        _renderSaveInfo();
    }

    return {
        init,
        showMainMenu,
        showCareerScreen,
        showCarSelectScreen,
        showGarageScreen,
        showHUD,
        hideHUD,
        showCountdown,
        showCityBanner,
        showResults,
        setMinimapWaypoints,
        updateMinimap,
        fmtTime,
        ordinal
    };
})();

window.UIManager = UIManager;
