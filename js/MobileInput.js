/* =====================================================
   MobileInput.js
   On-screen touch controls.
   Attaches to: MobileInput entity (created in main.js)
   Fires: input:gas, input:brake, input:left, input:right,
          input:handbrake, input:nitro (+ input:accel alias)
   ===================================================== */

var MobileInput = pc.createScript('mobileInput');

MobileInput.prototype.initialize = function () {
    this.app.globals = this.app.globals || {};
    this.app.globals.mobileInput = this;
    this._overlay = null;
    this._createUI();
};

MobileInput.prototype._createUI = function () {
    var app = this.app;

    var css = document.createElement('style');
    css.textContent = [
        '#mi-overlay {',
        '  position:fixed; bottom:0; left:0; right:0; height:230px;',
        '  pointer-events:none; z-index:600;',
        '  user-select:none; -webkit-user-select:none;',
        '}',
        '.mi-btn {',
        '  position:absolute; display:flex; align-items:center; justify-content:center;',
        '  border-radius:50%; background:rgba(255,255,255,0.10);',
        '  border:2px solid rgba(255,255,255,0.28); color:#fff;',
        '  font-size:20px; font-weight:bold; pointer-events:auto;',
        '  touch-action:none; cursor:pointer;',
        '  box-shadow: 0 2px 8px rgba(0,0,0,0.5);',
        '  transition:background 0.08s, border-color 0.08s;',
        '}',
        '.mi-btn.pressed { background:rgba(255,255,255,0.32); border-color:#fff; }'
    ].join('\n');
    document.head.appendChild(css);

    var overlay = document.createElement('div');
    overlay.id = 'mi-overlay';
    document.body.appendChild(overlay);
    this._overlay = overlay;

    var S = 76;
    var btns = [
        { id:'mi-left',  label:'◀', left:20,   bottom:72,  w:S, h:S, ev:'input:left' },
        { id:'mi-right', label:'▶', left:110,  bottom:72,  w:S, h:S, ev:'input:right' },
        { id:'mi-gas',   label:'⬆', right:20,  bottom:116, w:S, h:S, ev:'input:gas', alias:'input:accel' },
        { id:'mi-brake', label:'⬇', right:20,  bottom:26,  w:S, h:S, ev:'input:brake' },
        {
            id:'mi-hb', label:'HB', right:112, bottom:26, w:S, h:S, ev:'input:handbrake',
            extra:'font-size:14px;letter-spacing:1px;'
        },
        {
            id:'mi-nitro', label:'N', right:112, bottom:116, w:S, h:S, ev:'input:nitro',
            extra:'background:rgba(180,20,20,0.22);border-color:#ff3333;color:#ff4444;'
        }
    ];

    btns.forEach(function (b) {
        var el = document.createElement('div');
        el.id  = b.id;
        el.className = 'mi-btn';
        el.textContent = b.label;

        var pos = '';
        if (b.left  !== undefined) pos += 'left:'  + b.left  + 'px;';
        if (b.right !== undefined) pos += 'right:' + b.right + 'px;';
        pos += 'bottom:' + b.bottom + 'px;';
        pos += 'width:'  + b.w + 'px;height:' + b.h + 'px;';
        if (b.extra) pos += b.extra;
        el.style.cssText = pos;
        overlay.appendChild(el);

        var alias = b.alias || null;
        var fire = function (on) {
            app.fire(b.ev, on);
            if (alias) app.fire(alias, on);
            el.classList.toggle('pressed', on);
        };

        el.addEventListener('touchstart',  function (e) { e.preventDefault(); fire(true);  }, { passive: false });
        el.addEventListener('touchend',    function (e) { e.preventDefault(); fire(false); }, { passive: false });
        el.addEventListener('touchcancel', function (e) { e.preventDefault(); fire(false); }, { passive: false });
    });
};

MobileInput.prototype.show = function () { if (this._overlay) this._overlay.style.display = 'block'; };
MobileInput.prototype.hide = function () { if (this._overlay) this._overlay.style.display = 'none';  };
