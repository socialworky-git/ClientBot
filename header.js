(function () {
  /* =========================================================
     EDIT YOUR HEADER IN ONE PLACE
     Change the text or the three links here and it updates
     across the whole site. Nothing else needs editing.
     ========================================================= */
  var BRAND_DARK   = "Social";   // dark part of the wordmark
  var BRAND_ACCENT = "worky";    // coral part of the wordmark
  var LINKS = {
    home:      "/",            // brand (top left) goes here
    workshops: "/#workshops",  // Workshops link
    tools:     "/tools/"       // Tools link  (set to your real tools path)
  };

  /* Capture the script tag now, while it is the current script,
     so we can drop the header exactly where you placed it. */
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
    ".sw-nav{font-family:'Hanken Grotesk',Arial,Helvetica,system-ui,sans-serif;" +
      "display:flex;align-items:center;justify-content:space-between;gap:16px;" +
      "padding:14px 0;margin:0 0 8px;}" +
    ".sw-nav__brand{font-size:20px;font-weight:800;letter-spacing:-.02em;" +
      "color:#1A1A1A;text-decoration:none;line-height:1;}" +
    ".sw-nav__brand-accent{color:#EB786B;}" +
    ".sw-nav__brand:hover{opacity:.85;}" +
    ".sw-nav__links{display:flex;align-items:center;gap:22px;}" +
    ".sw-nav__links a{font-size:15px;font-weight:600;color:#5B5B5B;text-decoration:none;}" +
    ".sw-nav__links a:hover{color:#C2452F;}" +
    "@media (max-width:640px){.sw-nav{padding:12px 0;}.sw-nav__links{gap:16px;}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* --- The header markup --- */
  var nav = document.createElement("nav");
  nav.className = "sw-nav";
  nav.innerHTML =
    '<a class="sw-nav__brand" href="' + LINKS.home + '">' +
      BRAND_DARK + '<span class="sw-nav__brand-accent">' + BRAND_ACCENT + "</span></a>" +
    '<div class="sw-nav__links">' +
      '<a href="' + LINKS.workshops + '">Workshops</a>' +
      '<a href="' + LINKS.tools + '">Tools</a>' +
    "</div>";

  if (here && here.parentNode) {
    here.parentNode.insertBefore(nav, here);
  } else {
    document.body.insertBefore(nav, document.body.firstChild);
  }
})();
