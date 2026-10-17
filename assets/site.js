(function () {
  var doc = document.documentElement;
  doc.classList.add("js");

  // ---------- Preview expiry (replaced at deploy time from the .expires file) ----------
  var expires = "2026-10-17";
  if (/^\d{4}-\d{2}-\d{2}$/.test(expires) && new Date() >= new Date(expires + "T23:59:59")) {
    location.replace("expired.html");
    return;
  }

  // ---------- Copy deterrents (casual only) ----------
  var isField = function (el) { return el && el.closest && el.closest("input, textarea, select"); };
  ["contextmenu", "copy", "cut", "dragstart", "selectstart"].forEach(function (type) {
    document.addEventListener(type, function (e) { if (!isField(e.target)) e.preventDefault(); });
  });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (k === "s" || k === "u" || k === "p")) e.preventDefault();
    if (mod && (k === "c" || k === "a") && !isField(e.target)) e.preventDefault();
    if (mod && e.altKey && (k === "i" || k === "j" || k === "u")) e.preventDefault();
    if (k === "f12") e.preventDefault();
  });

  // ---------- Header / mobile bar state ----------
  var onScroll = function () { document.body.classList.toggle("is-scrolled", window.scrollY > 120); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---------- Gentle reveal ----------
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  // ---------- Range: filter chips + live search ----------
  var products = Array.prototype.slice.call(document.querySelectorAll(".products .product"));
  var input = document.getElementById("range-search");
  var filters = Array.prototype.slice.call(document.querySelectorAll(".filter"));
  if (products.length) {
    var empty = document.getElementById("range-empty");
    var echo = document.getElementById("range-query");
    var active = "all";
    var apply = function () {
      var q = input ? input.value.trim().toLowerCase() : "";
      var shown = 0;
      products.forEach(function (el) {
        var tagOk = active === "all" || (" " + el.dataset.tags + " ").indexOf(" " + active + " ") !== -1;
        var textOk = !q || el.textContent.toLowerCase().indexOf(q) !== -1 || (el.dataset.keys || "").indexOf(q) !== -1;
        el.hidden = !(tagOk && textOk);
        if (!el.hidden) { shown++; el.classList.add("is-in"); }
      });
      empty.hidden = shown !== 0;
      echo.textContent = q ? input.value.trim() : (filters.filter(function (b) { return b.dataset.filter === active; })[0] || {}).textContent || "";
    };
    filters.forEach(function (b) {
      b.addEventListener("click", function () {
        active = b.dataset.filter;
        filters.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        apply();
      });
    });
    if (input) input.addEventListener("input", apply);
  }

  // ---------- Hero slideshow ----------
  var deck = document.querySelector(".slides");
  if (deck) {
    var slides = Array.prototype.slice.call(deck.querySelectorAll(".slide"));
    var dots = Array.prototype.slice.call(deck.querySelectorAll(".dot"));
    var cur = 0, timer = null;
    var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var show = function (n) {
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (sl, i) { sl.classList.toggle("is-active", i === cur); });
      dots.forEach(function (d, i) {
        d.classList.toggle("is-active", i === cur);
        if (i === cur) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
    };
    var stop = function () { clearInterval(timer); timer = null; };
    var play = function () { if (calm || timer) return; timer = setInterval(function () { show(cur + 1); }, 5500); };
    deck.querySelector(".prev").addEventListener("click", function () { show(cur - 1); stop(); play(); });
    deck.querySelector(".next").addEventListener("click", function () { show(cur + 1); stop(); play(); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { show(i); stop(); play(); }); });
    deck.addEventListener("mouseenter", stop);
    deck.addEventListener("mouseleave", play);
    deck.addEventListener("focusin", stop);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else play(); });
    play();
  }

  // ---------- Space cards jump to the range, filtered ----------
  document.querySelectorAll("[data-filter-link]").forEach(function (a) {
    a.addEventListener("click", function () {
      var btn = document.querySelector('.filter[data-filter="' + a.getAttribute("data-filter-link") + '"]');
      if (btn) btn.click();
    });
  });

  // ---------- Enquiry job card: validate, then open a pre-filled email ----------
  var form = document.getElementById("jobcard");
  if (form) {
    var status = document.getElementById("form-status");
    var params = new URLSearchParams(location.search);
    var pre = params.get("item");
    if (pre && form.elements.interest) {
      Array.prototype.forEach.call(form.elements.interest.options, function (o) { if (o.value === pre) o.selected = true; });
    }
    var setErr = function (name, msg) {
      var field = form.elements[name].closest(".field");
      field.classList.toggle("has-error", !!msg);
      field.querySelector(".err").textContent = msg || "";
      form.elements[name].setAttribute("aria-invalid", msg ? "true" : "false");
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      var ok = true, first = null;
      var check = function (name, test, msg) {
        var bad = !test(f[name].value.trim());
        setErr(name, bad ? msg : "");
        if (bad) { ok = false; first = first || f[name]; }
      };
      check("name", function (v) { return v.length > 1; }, "Please add your name so we know who to ask for.");
      check("phone", function (v) { return /^[+\d][\d\s-]{6,}$/.test(v); }, "Add a phone number we can call back, e.g. 9123 4567.");
      check("details", function (v) { return v.length > 9; }, "Tell us a little about the space: room type, rough size, what you need.");
      if (!ok) { status.textContent = "A few details are missing. They're marked in red below."; first.focus(); return; }
      var body = [
        "Name: " + f.name.value.trim(),
        "Company / school: " + (f.company.value.trim() || "-"),
        "Phone: " + f.phone.value.trim(),
        "Interested in: " + f.interest.value,
        "",
        f.details.value.trim()
      ].join("\n");
      var subject = "Enquiry: " + f.interest.value + " (" + (f.company.value.trim() || f.name.value.trim()) + ")";
      status.textContent = "Opening your email app with the job card filled in. If nothing opens, call +65 6638 8128.";
      location.href = "mailto:enquiry@wide-links.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
    ["name", "phone", "details"].forEach(function (n) {
      form.elements[n].addEventListener("input", function () { if (form.elements[n].closest(".field").classList.contains("has-error")) setErr(n, ""); });
    });
  }
})();
