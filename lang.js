/* Practice-language preference for the AI tools.
   Stored in localStorage for everyone and mirrored to the Clerk profile
   (unsafeMetadata.language) when signed in, so it follows the account. */
(function () {
  var KEY = "sw_lang";
  var DEFAULT = "English";
  var LANGS = [
    "English", "Spanish", "Portuguese", "French", "German", "Italian", "Dutch",
    "Swedish", "Norwegian", "Danish", "Finnish", "Polish", "Russian", "Turkish",
    "Japanese", "Chinese", "Korean", "Arabic", "Hindi", "Te Reo Māori"
  ];
  var NATIVE = {
    "Spanish": "Español", "Portuguese": "Português", "French": "Français", "German": "Deutsch",
    "Italian": "Italiano", "Dutch": "Nederlands", "Swedish": "Svenska", "Norwegian": "Norsk",
    "Danish": "Dansk", "Finnish": "Suomi", "Polish": "Polski", "Russian": "Русский",
    "Turkish": "Türkçe", "Japanese": "日本語", "Chinese": "中文", "Korean": "한국어",
    "Arabic": "العربية", "Hindi": "हिन्दी"
  };
  var OTHER = "__other__";

  var current = DEFAULT;
  try { current = localStorage.getItem(KEY) || DEFAULT; } catch (e) {}
  var listeners = [];

  function clerkUser() {
    return (window.Clerk && window.Clerk.user) ? window.Clerk.user : null;
  }

  function set(lang, opts) {
    lang = String(lang || "").trim().slice(0, 40) || DEFAULT;
    current = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    var u = clerkUser();
    if (u && !(opts && opts.skipClerk)) {
      var meta = Object.assign({}, u.unsafeMetadata || {}, { language: lang });
      u.update({ unsafeMetadata: meta }).catch(function (e) { console.warn("language sync failed", e); });
    }
    listeners.forEach(function (fn) { fn(lang); });
  }

  /* Once Clerk is up, a saved profile preference wins over the local one. */
  function syncFromClerk() {
    var u = clerkUser();
    if (!u) return false;
    var remote = u.unsafeMetadata && u.unsafeMetadata.language;
    if (remote && remote !== current) set(remote, { skipClerk: true });
    else if (!remote && current !== DEFAULT) set(current);
    return true;
  }
  var tries = 0;
  var poll = setInterval(function () {
    if (syncFromClerk() || ++tries > 40) clearInterval(poll);
  }, 500);

  var css = document.createElement("style");
  css.textContent =
    ".sw-lang{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;font-family:'Hanken Grotesk',Arial,Helvetica,system-ui,sans-serif;}" +
    ".sw-lang__lbl{font-size:13px;font-weight:700;color:inherit;}" +
    ".sw-lang select,.sw-lang input{font:inherit;font-size:14px;padding:7px 10px;border:1px solid #D9D9DE;border-radius:8px;background:#fff;color:#1A1A1A;}" +
    ".sw-lang input{min-width:160px;}" +
    ".sw-lang__note{flex-basis:100%;font-size:12.5px;color:#5B5B5B;}";
  document.head.appendChild(css);

  function mount(el, opts) {
    opts = opts || {};
    var sel = document.createElement("select");
    sel.setAttribute("aria-label", "Practice language");
    LANGS.forEach(function (l) {
      var o = document.createElement("option");
      o.value = l;
      o.textContent = NATIVE[l] ? l + " · " + NATIVE[l] : l;
      sel.appendChild(o);
    });
    var other = document.createElement("option");
    other.value = OTHER; other.textContent = "Other…";
    sel.appendChild(other);

    var inp = document.createElement("input");
    inp.type = "text"; inp.placeholder = "Type a language"; inp.maxLength = 40; inp.hidden = true;

    var lbl = document.createElement("span");
    lbl.className = "sw-lang__lbl";
    lbl.textContent = opts.label || "Practice language";

    var note = document.createElement("div");
    note.className = "sw-lang__note";
    note.textContent = opts.note || "The client, the coaching, and the feedback will use this language.";

    el.classList.add("sw-lang");
    el.appendChild(lbl); el.appendChild(sel); el.appendChild(inp);
    if (opts.note !== false) el.appendChild(note);

    function reflect(lang) {
      if (LANGS.indexOf(lang) >= 0) { sel.value = lang; inp.hidden = true; }
      else { sel.value = OTHER; inp.hidden = false; inp.value = lang; }
    }
    reflect(current);
    listeners.push(reflect);

    sel.addEventListener("change", function () {
      if (sel.value === OTHER) { inp.hidden = false; inp.focus(); }
      else set(sel.value);
    });
    inp.addEventListener("change", function () { if (inp.value.trim()) set(inp.value); });
  }

  window.SW_LANG = {
    get: function () { return current; },
    set: set,
    isDefault: function () { return current === DEFAULT; },
    mount: mount,
    onChange: function (fn) { listeners.push(fn); }
  };
})();
