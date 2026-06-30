(function () {
  /* =========================================================
     EDIT YOUR HEADER IN ONE PLACE
     Brand text and the brand link live here.
     ========================================================= */
  var BRAND_DARK   = "Social";   // dark part of the wordmark
  var BRAND_ACCENT = "worky";    // coral part of the wordmark
  var LINKS = {
    home:     "/",            // brand (top left)
    training: "/training",    // Training & consultation hub (top of the Training menu)
    tools:    "/tools/"       // "All Tools" hub (top of the Tools menu)
  };
  var TRAINING_LABEL = "Training";   // nav label for the Training dropdown
  var TOOLS_LABEL    = "Tools";      // nav label for the Tools dropdown

  /* =========================================================
     LOGIN GATE (Clerk)  --  added for the account system
     ---------------------------------------------------------
     These two values come from your Clerk dashboard. They are
     safe to live in this file (publishable, client-side only).
     When you go live on your real domain, swap them for your
     pk_live_ key and live frontend address.
     ========================================================= */
  var CLERK_FRONTEND_API    = "clerk.socialworky.com";
  var CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsuc29jaWFsd29ya3kuY29tJA";
  var LOGIN_PAGE            = "/login.html";

  /* Which pages require a signed-in user?
     Default: every individual tool under /tools/ is protected,
     but the Tools catalog page (/tools/) and all other pages
     (home, training) stay public so people can browse first.
     To ALSO gate the catalog, delete the line that returns false.
     To open a single tool up for free, add its path here. */
  function swIsProtectedPage(){
    var p = window.location.pathname;
    if (p === "/tools/" || p === "/tools" || p === "/tools/index.html") return false; // public catalog
    return p.indexOf("/tools/") === 0; // any individual tool is protected
  }

  /* Hide the page immediately on protected pages so a signed-out
     visitor never glimpses the tool before the redirect happens.
     A failsafe reveals the page after 8s so it can never get stuck. */
  var SW_PROTECTED = swIsProtectedPage();
  var swRevealTimer;
  function swRevealPage(){
    clearTimeout(swRevealTimer);
    document.documentElement.style.visibility = "";
  }
  if (SW_PROTECTED) {
    document.documentElement.style.visibility = "hidden";
    swRevealTimer = setTimeout(swRevealPage, 8000);
  }

  /* =========================================================
     ADD NEW TRAINING PAGES HERE  ->  the Training dropdown
     builds itself. Simple flat list, no categories.
     ========================================================= */
  var TRAININGS = [
    { name: "What is Motivational Interviewing?", href: "/training/what-is-MI/" }
    // , { name: "Example workshop", href: "/training/example/" }
  ];

  /* =========================================================
     ADD NEW TOOLS HERE  ->  the Tools dropdown builds itself.
     ========================================================= */
  var TOOLS = [
    { category: "MI Tools", items: [
      { name: "ClientBot",                    href: "/tools/clientbot/" },
      { name: "Reflection Batting Practice",  href: "/tools/batting-practice/" },
      { name: "Mining for Affirmations",      href: "/tools/affirmations/" },
      { name: "Intentional Reflections",      href: "/tools/intentional-reflections/" },
      { name: "Balancing the Scale",          href: "/tools/balancing-the-scale/" },
      { name: "MITI Tools",                   href: "/tools/miti-tools/" }
    ]},
    { category: "SRA Tools", items: [
      { name: "Empathy as a Pathway to Screening", href: "/tools/empathy-screening/" },
      { name: "Treatment Planning Practice",       href: "/tools/treatment-planning/" }
    ]},
    { category: "Other Tools", items: [
      { name: "LMSW Practice Test",       href: "/tools/lmsw-practice/index.html" },
      { name: "MSE Simulation",           href: "/tools/mse-simulation/index.html" },
      { name: "Practicing ASSIST",        href: "/tools/practicing-assist/" },
      { name: "Delusions vs. Obsessions", href: "/tools/delusions-obsessions/" },
      { name: "Distortion Decoder",       href: "/tools/distortion-decoder/" }
    ]}
  ];

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
    /* Full-width band: the bar spans the page so its position never depends on
       whatever column a page drops the <script> tag into. */
    ".sw-nav{font-family:'Hanken Grotesk',Arial,Helvetica,system-ui,sans-serif;" +
      "display:block;width:100%;margin:0 0 8px;position:relative;z-index:1000;" +
      "animation:sw-nav-in .42s ease both;}" +
    /* Inner rail: centered at the shared site width with the shared gutter, so
       the brand + links line up with page content identically on every page. */
    ".sw-nav__inner{max-width:var(--sw-maxw,820px);margin:0 auto;" +
      "padding:14px var(--sw-gutter,24px);display:flex;align-items:center;" +
      "justify-content:space-between;gap:16px;}" +
    ".sw-nav__brand{font-size:20px;font-weight:800;letter-spacing:-.02em;" +
      "color:#1A1A1A;text-decoration:none;line-height:1;}" +
    ".sw-nav__brand-accent{color:#EB786B;}" +
    ".sw-nav__brand:hover{opacity:.85;}" +
    ".sw-nav__links{display:flex;align-items:center;gap:22px;}" +
    ".sw-nav__links a{font-size:15px;font-weight:600;color:#5B5B5B;text-decoration:none;}" +
    ".sw-nav__links a:hover{color:#C2452F;}" +
    /* auth control (Sign in link / account button) sits at the end of the nav */
    ".sw-nav__auth{display:flex;align-items:center;min-height:28px;}" +
    ".sw-nav__auth a{font-size:15px;font-weight:600;color:#5B5B5B;text-decoration:none;}" +
    ".sw-nav__auth a:hover{color:#C2452F;}" +
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
    "@media (max-width:640px){.sw-nav__inner{padding:12px var(--sw-gutter,16px);}.sw-nav__links{gap:16px;}.sw-dd__panel{min-width:210px;}}" +
    /* respect reduced-motion: show instantly, no slide or fade */
    "@media (prefers-reduced-motion: reduce){" +
      ".sw-nav{animation:none;}" +
      ".sw-dd__panel{transform:none;transition:visibility 0s linear .001s,opacity .001s;}" +
      ".sw-dd.open .sw-dd__panel{transform:none;transition:none;}" +
      ".sw-dd__caret{transition:none;}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* --- Helpers to build a dropdown's menu from a list --- */
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function buildMenu(topHref, topLabel, list){
    var html = '<a class="sw-dd__all" href="' + esc(topHref) + '">' + esc(topLabel) + '</a>';
    if (list.length && list[0].href) {
      /* flat list: items with no category labels */
      html += '<div class="sw-dd__group">';
      for (var k = 0; k < list.length; k++) {
        html += '<a href="' + esc(list[k].href) + '">' + esc(list[k].name) + '</a>';
      }
      html += '</div>';
    } else {
      /* categorized list: each group gets a label */
      for (var i = 0; i < list.length; i++) {
        var cat = list[i];
        if (!cat.items || !cat.items.length) continue;      // skip empty categories
        html += '<div class="sw-dd__group"><div class="sw-dd__label">' + esc(cat.category) + '</div>';
        for (var j = 0; j < cat.items.length; j++) {
          html += '<a href="' + esc(cat.items[j].href) + '">' + esc(cat.items[j].name) + '</a>';
        }
        html += '</div>';
      }
    }
    return html;
  }

  /* --- Build one dropdown element (button + panel) --- */
  function makeDropdown(opts){
    var dd = document.createElement("div");
    dd.className = "sw-dd";
    dd.setAttribute("data-hub", opts.hubHref);   // where a click on the label goes
    dd.innerHTML =
      '<button class="sw-dd__btn" type="button" aria-haspopup="true" aria-expanded="false">' +
        esc(opts.label) + ' <span class="sw-dd__caret" aria-hidden="true">&#9662;</span></button>' +
      '<div class="sw-dd__panel" role="menu">' +
        buildMenu(opts.hubHref, opts.hubLabel, opts.groups) +
      '</div>';
    return dd;
  }

  /* --- The header markup ---
     nav = full-width band; inner = the centered rail that holds brand + links. */
  var nav = document.createElement("nav");
  nav.className = "sw-nav";
  var inner = document.createElement("div");
  inner.className = "sw-nav__inner";
  inner.innerHTML =
    '<a class="sw-nav__brand" href="' + LINKS.home + '">' +
      BRAND_DARK + '<span class="sw-nav__brand-accent">' + BRAND_ACCENT + "</span></a>";

  var linksWrap = document.createElement("div");
  linksWrap.className = "sw-nav__links";
  linksWrap.appendChild(makeDropdown({
    label: TRAINING_LABEL, hubHref: LINKS.training, hubLabel: "Training & consultation", groups: TRAININGS
  }));
  linksWrap.appendChild(makeDropdown({
    label: TOOLS_LABEL, hubHref: LINKS.tools, hubLabel: "All Tools", groups: TOOLS
  }));

  /* Auth control slot: filled in once Clerk has loaded (see below). */
  var authSlot = document.createElement("div");
  authSlot.className = "sw-nav__auth";
  linksWrap.appendChild(authSlot);

  inner.appendChild(linksWrap);
  nav.appendChild(inner);

  /* Always mount the bar at the very top of <body>, so its on-screen position
     is identical on every page regardless of where the <script> tag sits. */
  if (document.body.firstChild) {
    document.body.insertBefore(nav, document.body.firstChild);
  } else {
    document.body.appendChild(nav);
  }

  /* --- Open / close: hover on a mouse, focus for keyboard, tap on touch --- */
  var canHover = window.matchMedia &&
    window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  var dropdowns = nav.querySelectorAll(".sw-dd");
  for (var d = 0; d < dropdowns.length; d++) {
    wireDropdown(dropdowns[d]);
  }

  function wireDropdown(dd){
    var btn = dd.querySelector(".sw-dd__btn");
    var hub = dd.getAttribute("data-hub");
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
      /* On a mouse, clicking the label jumps to that section's hub. */
      btn.addEventListener("click", function(){ window.location.href = hub; });
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
  }

  /* =========================================================
     LOGIN GATE LOGIC
     Loads Clerk from the CDN, then:
       - on a protected tool page, sends signed-out visitors to login
       - everywhere, shows a Sign in link or the account button
     ========================================================= */
  function swLoadClerk(cb){
    if (window.Clerk) { cb(); return; }
    var ui = document.createElement("script");
    ui.src = "https://" + CLERK_FRONTEND_API + "/npm/@clerk/ui@1/dist/ui.browser.js";
    ui.crossOrigin = "anonymous";
    ui.onerror = function(){ console.error("Clerk UI bundle failed to load"); swRevealPage(); };
    ui.onload = function(){
      var core = document.createElement("script");
      core.src = "https://" + CLERK_FRONTEND_API + "/npm/@clerk/clerk-js@6/dist/clerk.browser.js";
      core.crossOrigin = "anonymous";
      core.setAttribute("data-clerk-publishable-key", CLERK_PUBLISHABLE_KEY);
      core.onerror = function(){ console.error("Clerk core failed to load"); swRevealPage(); };
      core.onload = function(){ cb(); };
      document.head.appendChild(core);
    };
    document.head.appendChild(ui);
  }

  function swOnClerkReady(){
    var signedIn = !!Clerk.isSignedIn;

    // Protected page + not signed in -> send to login, remembering this page.
    if (SW_PROTECTED && !signedIn) {
      var dest = window.location.pathname + window.location.search + window.location.hash;
      window.location.replace(LOGIN_PAGE + "?redirect_url=" + encodeURIComponent(dest));
      return; // stay hidden; we're navigating away
    }

    // Otherwise the page may show.
    swRevealPage();

    // Fill the header's auth control.
    if (signedIn) {
      authSlot.innerHTML = "";
      Clerk.mountUserButton(authSlot);
    } else {
      authSlot.innerHTML = '<a href="' + LOGIN_PAGE + '">Sign in</a>';
    }
  }

  swLoadClerk(function(){
    if (!window.Clerk) { swRevealPage(); return; }
    Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } })
      .then(swOnClerkReady)
      .catch(function(e){ console.error("Clerk load error:", e); swRevealPage(); });
  });
})();
