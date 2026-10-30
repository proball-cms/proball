// ProBall booking modal
// Hijacks any link to how-to-join.html#register (or [data-book-trial])
// and opens an in-page modal containing the registration form.
// On phones the modal is a bottom sheet; on tablet+ it's a centered card.
// Submits to the same /api/register endpoint as the standalone page.
(function () {
  if (window.__proballModalInstalled) return;
  window.__proballModalInstalled = true;

  var STYLES = ''
    + '.pb-mb { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9990; opacity: 0; pointer-events: none; transition: opacity .2s ease; }'
    + '.pb-mb.is-open { opacity: 1; pointer-events: auto; }'
    + '.pb-mc { position: fixed; background: #fff; z-index: 9991; overflow-y: auto; -webkit-overflow-scrolling: touch; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }'
    + '@media (max-width: 767px) {'
    + '  .pb-mc { left: 0; right: 0; bottom: 0; max-height: 92vh; border-top-left-radius: 20px; border-top-right-radius: 20px; transform: translateY(100%); transition: transform .28s ease; }'
    + '  .pb-mc.is-open { transform: translateY(0); }'
    + '}'
    + '@media (min-width: 768px) {'
    + '  .pb-mc { left: 50%; top: 50%; width: min(640px, calc(100vw - 48px)); max-height: 88vh; border-radius: 20px; transform: translate(-50%, calc(-50% + 24px)); opacity: 0; pointer-events: none; transition: transform .25s ease, opacity .2s ease; }'
    + '  .pb-mc.is-open { transform: translate(-50%, -50%); opacity: 1; pointer-events: auto; }'
    + '}'
    + 'body.pb-locked { overflow: hidden; }'
    + '.pb-mc .pb-accent { height: 8px; background: #bc0008; border-top-left-radius: 20px; border-top-right-radius: 20px; }'
    + '.pb-mc .pb-input, .pb-mc .pb-select, .pb-mc .pb-textarea { width: 100%; border: 1px solid #e6bdb7; border-radius: 8px; padding: 12px 16px; font-size: 16px; line-height: 24px; font-family: Lexend, sans-serif; outline: none; transition: border-color .15s, box-shadow .15s; background: #fff; }'
    + '.pb-mc .pb-input:focus, .pb-mc .pb-select:focus, .pb-mc .pb-textarea:focus { border-color: #004aad; box-shadow: 0 0 0 1px #004aad; }'
    + '.pb-mc .pb-textarea { height: 88px; resize: none; }'
    + '.pb-mc .pb-label { font-size: 14px; line-height: 20px; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #1b1c1c; margin-bottom: 4px; display: block; }'
    + '.pb-mc .pb-row { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }'
    + '@media (max-width: 480px) { .pb-mc .pb-row { grid-template-columns: 1fr; } }'
    + '.pb-mc .pb-submit { width: 100%; background: #bc0008; color: #fff; font-weight: 700; padding: 16px; border-radius: 12px; border: 0; font-size: 16px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: background .15s, transform .1s; }'
    + '.pb-mc .pb-submit:hover { background: #e12720; }'
    + '.pb-mc .pb-submit:active { transform: scale(0.98); }'
    + '.pb-mc .pb-submit:disabled { cursor: default; }'
    + '.pb-mc .pb-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 10px 14px; font-size: 14px; }';

  var formFields = ''
    + '<p style="font-size:12px;color:#5b5c5c;margin:0 0 4px">All fields are optional — share whatever helps us get back to you.</p>'
    + '<div class="pb-row">'
    +   '<div><label class="pb-label" for="pb-fn">Athlete First Name</label><input class="pb-input" type="text" id="pb-fn" name="first_name" placeholder="e.g. Jamie"/></div>'
    +   '<div><label class="pb-label" for="pb-ln">Athlete Last Name</label><input class="pb-input" type="text" id="pb-ln" name="last_name" placeholder="e.g. Smith"/></div>'
    + '</div>'
    + '<div class="pb-row">'
    +   '<div><label class="pb-label" for="pb-dob">Athlete Date of Birth</label><input class="pb-input" type="date" id="pb-dob" name="dob"/></div>'
    +   '<div><label class="pb-label" for="pb-gender">Gender</label><select class="pb-select" id="pb-gender" name="gender"><option value="">Select…</option><option>Boy</option><option>Girl</option><option>Prefer not to say</option></select></div>'
    + '</div>'
    + '<div><label class="pb-label" for="pb-pname">Parent / Guardian Name</label><input class="pb-input" type="text" id="pb-pname" name="parent_name" placeholder="e.g. Alex Smith"/></div>'
    + '<div class="pb-row">'
    +   '<div><label class="pb-label" for="pb-email">Parent / Guardian Email <span style="color:#bc0008">*</span></label><input class="pb-input" type="email" id="pb-email" name="parent_email" placeholder="parent@example.com" required/></div>'
    +   '<div><label class="pb-label" for="pb-phone">Parent / Guardian Phone</label><input class="pb-input" type="tel" id="pb-phone" name="parent_phone" placeholder="04XX XXX XXX"/></div>'
    + '</div>'
    + '<div class="pb-row">'
    +   '<div><label class="pb-label" for="pb-program">Interested Program</label><select class="pb-select" id="pb-program" name="program"><option value="">Select a program…</option><option>Miniball (Ages 5–10)</option><option>Academy (Ages 5–15)</option><option>Teams / Competition (Ages 5–15)</option><option>Not sure — advise me</option></select></div>'
    +   '<div><label class="pb-label" for="pb-suburb">Suburb</label><input class="pb-input" type="text" id="pb-suburb" name="suburb" placeholder="e.g. Leichhardt"/></div>'
    + '</div>'
    + '<div><label class="pb-label" for="pb-hear">How did you hear about us?</label><select class="pb-select" id="pb-hear" name="hear_about"><option value="">Select…</option><option>Word of mouth / friend</option><option>Google search</option><option>Instagram</option><option>Facebook</option><option>TikTok</option><option>Flyer / school</option><option>Other</option></select></div>'
    + '<div><label class="pb-label" for="pb-notes">Additional Notes</label><textarea class="pb-textarea" id="pb-notes" name="notes" placeholder="Previous experience, specific goals, any questions for our coaches…"></textarea></div>'
    + '<div class="pb-error" id="pb-error" style="display:none"></div>'
    + '<button class="pb-submit" id="pb-submit" type="submit">Submit Registration</button>'
    + '<p style="font-size:12px;color:#5b5c5c;text-align:center;margin:0">We\'ll be in touch within 48 hours. Your first 4 weeks are free.</p>';

  var BACKDROP_HTML = '<div class="pb-mb" id="pb-mb" aria-hidden="true"></div>';
  var CARD_HTML = ''
    + '<div class="pb-mc" id="pb-mc" role="dialog" aria-modal="true" aria-labelledby="pb-title" aria-hidden="true">'
    +   '<div class="pb-accent"></div>'
    +   '<div style="padding:20px 20px 24px">'
    +     '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px">'
    +       '<div>'
    +         '<h2 id="pb-title" style="font-family:Lexend,sans-serif;font-weight:700;font-size:24px;line-height:30px;text-transform:uppercase;margin:0;color:#1b1c1c">Book Your Free Trial</h2>'
    +         '<p style="font-size:15px;line-height:22px;color:#5b5c5c;margin:6px 0 0">Fill in the form — we\'ll be in touch within 48 hours.</p>'
    +       '</div>'
    +       '<button type="button" id="pb-close" aria-label="Close" style="background:none;border:0;padding:6px;margin:-6px -6px 0 0;cursor:pointer;color:#5b5c5c;font-size:24px;line-height:1"><span class="material-symbols-outlined" style="font-size:28px">close</span></button>'
    +     '</div>'
    +     '<form id="pb-form" novalidate>'
    +       formFields
    +     '</form>'
    +   '</div>'
    + '</div>';

  function install() {
    // styles
    var style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    // markup
    var holder = document.createElement('div');
    holder.innerHTML = BACKDROP_HTML + CARD_HTML;
    while (holder.firstChild) document.body.appendChild(holder.firstChild);

    var backdrop = document.getElementById('pb-mb');
    var card = document.getElementById('pb-mc');
    var closeBtn = document.getElementById('pb-close');
    var form = document.getElementById('pb-form');
    var submitBtn = document.getElementById('pb-submit');
    var errorEl = document.getElementById('pb-error');
    var lastFocus = null;

    // Spread form fields out vertically
    var fields = form.children;
    for (var i = 0; i < fields.length; i++) {
      fields[i].style.marginBottom = (i === fields.length - 1) ? '0' : '16px';
    }

    function open() {
      lastFocus = document.activeElement;
      backdrop.classList.add('is-open');
      card.classList.add('is-open');
      card.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.classList.add('pb-locked');
      setTimeout(function () {
        var first = card.querySelector('input, select, textarea');
        if (first) first.focus({ preventScroll: true });
      }, 280);
    }

    function close() {
      backdrop.classList.remove('is-open');
      card.classList.remove('is-open');
      card.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('pb-locked');
      if (lastFocus && typeof lastFocus.focus === 'function') {
        try { lastFocus.focus({ preventScroll: true }); } catch (_) {}
      }
    }

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && card.classList.contains('is-open')) close();
    });

    // Hijack all "Book a Free Trial" / how-to-join links
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var isTrigger =
        a.hasAttribute('data-book-trial') ||
        /how-to-join\.html#register$/.test(href) ||
        href === '#register' && /how-to-join/.test(window.location.pathname);
      // The "#register" on how-to-join page should NOT open modal — let it
      // scroll natively to the inline form. Adjust:
      if (a.hasAttribute('data-book-trial')) {
        e.preventDefault();
        open();
        return;
      }
      if (/how-to-join\.html#register$/.test(href)) {
        // If we're already on /how-to-join.html, allow native scroll
        if (/\/how-to-join\.html$/.test(window.location.pathname)) return;
        e.preventDefault();
        open();
      }
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(form).entries());
      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;
      errorEl.style.display = 'none';
      try {
        var res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Submission failed');
        if (typeof gtag !== 'undefined') gtag('event', 'generate_lead', { event_category: 'registration' });
        if (typeof fbq !== 'undefined') fbq('track', 'Lead');
        submitBtn.textContent = "We'll be in touch within 48 hours!";
        submitBtn.style.background = '#004aad';
        Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) { el.disabled = true; });
      } catch (_) {
        submitBtn.textContent = 'Submit Registration';
        submitBtn.disabled = false;
        errorEl.textContent = 'Please enter a valid email address so we can get back to you.';
        errorEl.style.display = 'block';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
