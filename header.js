(function () {
  /* =========================================================
     EDIT YOUR HEADER IN ONE PLACE
     Brand text and the two non-tool links live here.
     ========================================================= */
  var BRAND_DARK   = "Social";   // dark part of the wordmark
  var BRAND_ACCENT = "worky";    // coral part of the wordmark
  var LINKS = {
    home:     "/",            // brand (top left)
    training: "/training",    // Training & consultation page
    tools:    "/tools/"       // "All Tools" hub (set to your real tools path)
  };
  var TRAINING_LABEL = "Training";   // the nav label for the training link

  /* =========================================================
     ADD NEW TOOLS HERE  ->  the dropdown builds itself.
     Drop a new line under the right category and it appears
     in the menu automatically. Empty categories are hidden.
     ========================================================= */
  var TOOLS = [
    { category: "MI Tools", items: [
      { name: "ClientBot",                    href: "/clientbot/" },
      { name: "Reflection Batting Practice",  href: "/batting-practice/" },
      { name: "Mining for Affirmations",      href: "/affirmations/" },
      { name: "Intentional Reflections",      href: "/intentional-reflections/" },
      { name: "Balancing the Scale",          href: "/balancing-the-scale/" }
    ]},
    { category: "SRA Tools", items: [
      { name: "Empathy as a Pathway to Screening", href: "/empathy-screening/" },
      { name: "Treatment Planning Practice",       href: "/treatment-planning/" }
    ]},
    { category: "Other Tools", items: [
      { name: "Practicing ASSIST",        href: "/practicing-assist/" },
      { name: "Delusions vs. Obsessions", href: "/delusions-obsessions/" }
    ]}
  ];

  /* Capture the script tag now so the header drops where you placed it. */
  var here = document.currentScript;

  /* --- Ship the font with the header so it never depends on the page --- */
  if (!document.getElementById("sw-font-hanken")) {
    var pc1 = document.createElement("link");
    pc1.rel = "preconnect"; pc1.href = "https://fonts.googleapis.com";
    var pc2 = document.createElement("link");
    pc2.rel = "preconnect"; pc2.href = "https://fonts.gstatic.com"; pc2.crossOrigin = "";
    var font = document.createElement("link");
    font.id = "sw-font-hanken"; font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(pc1);
    document.head.appendChild(pc2);
    document.head.appendChild(font);
  }

  /* --- The header owns its own styles, scoped to .sw-nav --- */
  var css =
    ".sw-nav,.sw-nav *{box-sizing:border-box;}" +
    /* the bar fades and settles in on load instead of popping */
    ".sw-nav{font-family:'Hanken Grotesk',Arial,Helvetica,system-ui,sans-serif;" +
      "display:flex;align-items:center;justify-content:space-between;gap:16px;" +
      "padding:14px 0;margin:0 0 8px;position:relative;z-index:1000;" +
      "animation:sw-nav-in .42s ease both;}" +
    ".sw-nav__brand{font-size:20px;font-weight:800;letter-spacing:-.02em;" +
      "color:#1A1A1A;text-decoration:none;line-height:1;}" +
    ".sw-nav__brand-accent{color:#EB786B;}" +
    ".sw-nav__brand:hover{opacity:.85;}" +
    ".sw-nav__links{display:flex;align-items:center;gap:22px;}" +
    ".sw-nav__links a{font-size:15px;font-weight:600;color:#5B5B5B;text-decoration:none;}" +
    ".sw-nav__links a:hover{color:#C2452F;}" +
    /* dropdown */
    ".sw-dd{position:relative;}" +
    ".sw-dd__btn{font-family:inherit;font-size:15px;font-weight:600;color:#5B5B5B;background:none;" +
      "border:0;padding:0;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}" +
    ".sw-dd__btn:hover,.sw-dd.open .sw-dd__btn{color:#C2452F;}" +
    ".sw-dd__caret{font-size:10px;transition:transform .18s ease;}" +
    ".sw-dd.open .sw-dd__caret{transform:rotate(180deg);}" +
    /* panel: animated open/close (fade + slight slide + scale from the corner) */
    ".sw-dd__panel{position:absolute;top:calc(100% + 10px);right:0;min-width:248px;max-height:72vh;overflow:auto;" +
      "background:#fff;border:1px solid #E4E4E7;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.12);" +
      "padding:8px;z-index:1000;" +
      "opacity:0;visibility:hidden;transform:translateY(-6px) scale(.985);transform-origin:top right;" +
      "transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s;pointer-events:none;}" +
    ".sw-dd.open .sw-dd__panel{opacity:1;visibility:visible;transform:none;pointer-events:auto;" +
      "transition:opacity .18s ease,transform .18s ease,visibility 0s;}" +
    /* invisible bridge so the mouse can cross the gap to the panel */
    ".sw-dd__panel::before{content:'';position:absolute;top:-10px;left:0;right:0;height:10px;}" +
    ".sw-dd__panel a{display:block;text-decoration:none;color:#1A1A1A;font-size:14px;font-weight:500;" +
      "padding:8px 10px;border-radius:8px;white-space:nowrap;transition:background .12s ease,color .12s ease;}" +
    ".sw-dd__panel a:hover,.sw-dd__panel a:focus{background:#FBF5F1;color:#C2452F;outline:none;}" +
    ".sw-dd__all{font-weight:700;}" +
    ".sw-dd__group{margin-top:4px;padding-top:6px;border-top:1px solid #F0F0F2;}" +
    ".sw-dd__label{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;font-weight:700;" +
      "color:#C2452F;padding:6px 10px 2px;}" +
    "@keyframes sw-nav-in{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:none;}}" +
    "@media (max-width:640px){.sw-nav{padding:12px 0;}.sw-nav__links{gap:16px;}.sw-dd__panel{min-width:210px;}}" +
    /* respect reduced-motion: show instantly, no slide or fade */
    "@media (prefers-reduced-motion: reduce){" +
      ".sw-nav{animation:none;}" +
      ".sw-dd__panel{transform:none;transition:visibility 0s linear .001s,opacity .001s;}" +
      ".sw-dd.open .sw-dd__panel{transform:none;transition:none;}" +
      ".sw-dd__caret{transition:none;}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* --- Build the Tools dropdown contents from the TOOLS list --- */
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function buildMenu(){
    var html = '<a class="sw-dd__all" href="' + esc(LINKS.tools) + '">All Tools</a>';
    for (var i = 0; i < TOOLS.length; i++) {
      var cat = TOOLS[i];
      if (!cat.items || !cat.items.length) continue;        // skip empty categories
      html += '<div class="sw-dd__group"><div class="sw-dd__label">' + esc(cat.category) + '</div>';
      for (var j = 0; j < cat.items.length; j++) {
        html += '<a href="' + esc(cat.items[j].href) + '">' + esc(cat.items[j].name) + '</a>';
      }
      html += '</div>';
    }
    return html;
  }

  /* --- The header markup --- */
  var nav = document.createElement("nav");
  nav.className = "sw-nav";
  nav.innerHTML =
    '<a class="sw-nav__brand" href="' + LINKS.home + '">' +
      BRAND_DARK + '<span class="sw-nav__brand-accent">' + BRAND_ACCENT + "</span></a>" +
    '<div class="sw-nav__links">' +
      '<a href="' + LINKS.training + '">' + esc(TRAINING_LABEL) + '</a>' +
      '<div class="sw-dd">' +
        '<button class="sw-dd__btn" type="button" aria-haspopup="true" aria-expanded="false">' +
          'Tools <span class="sw-dd__caret" aria-hidden="true">&#9662;</span></button>' +
        '<div class="sw-dd__panel" role="menu">' + buildMenu() + '</div>' +
      '</div>' +
    '</div>';

  if (here && here.parentNode) {
    here.parentNode.insertBefore(nav, here);
  } else {
    document.body.insertBefore(nav, document.body.firstChild);
  }

  /* --- Open / close: hover on a mouse, focus for keyboard, tap on touch --- */
  var dd  = nav.querySelector(".sw-dd");
  var btn = nav.querySelector(".sw-dd__btn");
  var closeTimer;

  function setOpen(open){
    clearTimeout(closeTimer);
    dd.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function scheduleClose(){
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function(){ setOpen(false); }, 150);
  }

  var canHover = window.matchMedia &&
    window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* Keyboard works on every device: focus opens it, leaving it closes it. */
  dd.addEventListener("focusin", function(){ setOpen(true); });
  dd.addEventListener("focusout", function(e){
    if (!dd.contains(e.relatedTarget)) scheduleClose();
  });

  if (canHover) {
    /* Mouse: hover reveals the menu. The brief close delay plus the
       invisible bridge let the pointer travel to the panel without flicker. */
    dd.addEventListener("mouseenter", function(){ setOpen(true); });
    dd.addEventListener("mouseleave", scheduleClose);
    /* On a mouse, clicking "Tools" jumps to the full hub; hovering shows the menu. */
    btn.addEventListener("click", function(){ window.location.href = LINKS.tools; });
  } else {
    /* Touch: tap toggles the menu open and closed. */
    btn.addEventListener("click", function(e){
      e.preventDefault();
      setOpen(!dd.classList.contains("open"));
    });
  }

  /* Close on outside tap/click or Escape. */
  document.addEventListener("click", function(e){
    if (!dd.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape") setOpen(false);
  });
})();
