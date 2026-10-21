/* Practice-history tracking for the AI tools.
   Signed-in users get sessions saved to their account; batting practice also
   records anonymous usage stats when nobody is signed in. Verbatim text is sent
   along but the server only keeps it for research-consented users. */
(function () {
  var ANON_TOOLS = { "batting-practice": true };
  var ANON_KEY = "sw_anon";
  var FLUSH_MS = 1200;

  var current = null;      // { id, tool, scenario, meta, started_at, seq }
  var queue = [];
  var pendingEnd = null;
  var timer = null;
  var inflight = false;
  var noticeEls = [];

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  function anonId() {
    try {
      var v = localStorage.getItem(ANON_KEY);
      if (!v) { v = uuid(); localStorage.setItem(ANON_KEY, v); }
      return v;
    } catch (e) { return null; }
  }
  function signedIn() { return !!(window.Clerk && window.Clerk.user); }
  function clerkSettled() { return !!(window.Clerk && window.Clerk.loaded); }

  function mode(tool) {
    if (signedIn()) return "account";
    if (ANON_TOOLS[tool]) return "anonymous";
    return "off";
  }

  async function token() {
    try { if (window.Clerk && window.Clerk.session) return await window.Clerk.session.getToken(); } catch (e) {}
    return null;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(flush, FLUSH_MS);
  }

  async function flush(opts) {
    clearTimeout(timer);
    if (!current || inflight) return;
    if (!queue.length && !pendingEnd && !current.unsent) return;
    var m = mode(current.tool);
    if (m === "off") { queue = []; pendingEnd = null; return; }

    var events = queue; queue = [];
    var end = pendingEnd; pendingEnd = null;
    var payload = {
      session: {
        id: current.id, tool: current.tool, scenario: current.scenario,
        language: window.SW_LANG ? SW_LANG.get() : null,
        meta: current.meta, started_at: current.started_at,
        anon_id: m === "anonymous" ? anonId() : undefined
      },
      events: events, end: end
    };
    var headers = { "content-type": "application/json" };
    var t = m === "account" ? await token() : null;
    if (t) headers.authorization = "Bearer " + t;

    inflight = true;
    try {
      var res = await fetch("/api/track", {
        method: "POST", headers: headers, body: JSON.stringify(payload),
        keepalive: !!(opts && opts.keepalive)
      });
      if (res.status === 503 || res.status === 401 || res.status === 403) {
        // Storage not configured or not allowed: drop quietly rather than retry.
        current.unsent = false;
      } else if (!res.ok) {
        queue = events.concat(queue); pendingEnd = pendingEnd || end; current.unsent = true;
      } else {
        current.unsent = false;
      }
    } catch (e) {
      queue = events.concat(queue); pendingEnd = pendingEnd || end; current.unsent = true;
    } finally {
      inflight = false;
      if (queue.length || pendingEnd) schedule();
    }
  }

  function start(tool, opts) {
    opts = opts || {};
    if (current && !current.ended) end({ completed: false });
    current = {
      id: uuid(), tool: tool, scenario: opts.scenario || null,
      meta: Object.assign({ path: location.pathname }, opts.meta || {}),
      started_at: new Date().toISOString(), seq: 0, ended: false, unsent: true
    };
    schedule();
    return current.id;
  }

  function event(type, data, text) {
    if (!current || current.ended) return;
    queue.push({ seq: ++current.seq, type: type, data: data || null, text: text || null, at: new Date().toISOString() });
    schedule();
  }

  function end(opts) {
    if (!current || current.ended) return;
    opts = opts || {};
    current.ended = true;
    pendingEnd = { completed: opts.completed === true, summary: opts.summary || null };
    flush();
  }

  window.addEventListener("pagehide", function () { flush({ keepalive: true }); });

  /* ---- Small notice for tool start screens ---- */
  var css = document.createElement("style");
  css.textContent =
    ".sw-track{font-family:'Hanken Grotesk',Arial,Helvetica,system-ui,sans-serif;font-size:12.5px;color:#5B5B5B;line-height:1.5;}" +
    ".sw-track a{color:inherit;text-decoration:underline;text-underline-offset:2px;}" +
    ".sw-track a:hover{color:#C2452F;}";
  document.head.appendChild(css);

  function noticeText(tool) {
    var m = mode(tool);
    if (m === "account") return 'Signed in: your sessions are saved to <a href="/account/">your practice history</a>. Manage history and research participation there.';
    if (m === "anonymous") return 'Not signed in: only anonymous usage stats are recorded. <a href="/login.html?redirect_url=' + encodeURIComponent(location.pathname) + '">Sign in</a> to keep your practice history.';
    return 'Sign in to keep your practice history.';
  }
  function renderNotices() {
    noticeEls.forEach(function (n) { n.el.innerHTML = noticeText(n.tool); });
  }
  function mountNotice(el, tool) {
    el.classList.add("sw-track");
    noticeEls.push({ el: el, tool: tool });
    renderNotices();
  }
  var tries = 0;
  var poll = setInterval(function () {
    if (clerkSettled() || ++tries > 40) { clearInterval(poll); renderNotices(); }
  }, 500);

  window.SW_TRACK = { start: start, event: event, end: end, flush: flush, mode: mode, mountNotice: mountNotice };
})();
