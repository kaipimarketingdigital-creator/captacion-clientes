/* ============================================================
   KAIPI IMPULSA — Formulario de cualificación paso a paso
   (mismo sistema/lógica que /kaipimpulsa/js/form.js, adaptado con
   namespace "qf-" para convivir con el resto de la landing y con
   un campo "origen" fijo para distinguir el lead en la misma hoja).
   Vanilla JS · sin librerías (salvo widget Calendly lazy)
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    SUBMIT_ENDPOINT: './submit.php',
    CALENDLY_URL:    'https://calendly.com/kaipimarketingdigital/consultoria-gratuita-kaipi-impulsa',
    SCORE_THRESHOLD: 50,
    ORIGEN:          'pagina_informativa',
  };

  var TOTAL_STEPS = 7;

  var state = {
    step: 1,
    answers: {},           // nombre, email, negocio, freno, fact_act, inv_pub, web
    marketing: false,
  };

  // Payload calculado para un lead cualificado, pendiente de envío hasta
  // que reserve hora en Calendly (calendly.event_scheduled).
  var pendingPayload = null;

  // --- Refs ---
  var form        = document.getElementById('qf-form');
  var steps       = Array.prototype.slice.call(document.querySelectorAll('.qf-step'));
  var progressFill= document.getElementById('qf-progress-fill');
  var btnNext     = document.getElementById('qf-btn-next');
  var btnBack     = document.getElementById('qf-btn-back');
  var formUI      = document.getElementById('qf-ui');

  if (!form) return;

  /* ---------------- Captura de parámetros UTM ---------------- */
  var UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_adset', 'utm_ad', 'utm_content'];
  (function captureUTMs() {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      UTM_PARAMS.forEach(function (param) {
        var value = urlParams.get(param);
        if (value) sessionStorage.setItem(param, value);
      });
    } catch (e) { /* sessionStorage no disponible: no bloquea el formulario */ }
  })();

  function collectUTMs() {
    var utmData = {};
    UTM_PARAMS.forEach(function (param) {
      var value = '';
      try { value = sessionStorage.getItem(param) || ''; } catch (e) { value = ''; }
      utmData[param] = value;
    });
    return utmData;
  }

  /* ---------------- Selección de opciones (single) ---------------- */
  document.querySelectorAll('.qf-options[data-type="single"]').forEach(function (group) {
    var name = group.getAttribute('data-name');
    group.querySelectorAll('.qf-option').forEach(function (opt) {
      function select() {
        group.querySelectorAll('.qf-option').forEach(function (o) { o.classList.remove('is-selected'); });
        opt.classList.add('is-selected');
        state.answers[name] = opt.getAttribute('data-value');
        handleOtherField(group, opt.getAttribute('data-value'));
        clearError(group.closest('.qf-step'));
      }
      opt.addEventListener('click', select);
      opt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
    });
  });

  function handleOtherField(group, value) {
    var other = group.getAttribute('data-other');
    if (!other) return;
    var step = group.closest('.qf-step');
    var field = step.querySelector('.qf-field--other');
    if (!field) return;
    if (value === other) { field.classList.add('is-visible'); }
    else { field.classList.remove('is-visible'); clearError(step); }
  }

  /* ---------------- Inputs de texto ---------------- */
  form.querySelectorAll('input[data-name], textarea[data-name]').forEach(function (input) {
    input.addEventListener('input', function () {
      state.answers[input.getAttribute('data-name')] = input.value.trim();
      clearError(input.closest('.qf-step'));
    });
  });

  var consentPrivacy  = document.getElementById('qf-consent-privacy');
  var consentMarketing= document.getElementById('qf-consent-marketing');
  if (consentPrivacy) consentPrivacy.addEventListener('change', updateNextState);
  if (consentMarketing) consentMarketing.addEventListener('change', function () {
    state.marketing = consentMarketing.checked;
  });

  /* ---------------- Validación por paso ---------------- */
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validateStep(n) {
    var stepEl = steps[n - 1];
    switch (n) {
      case 1: return req(stepEl, !!(state.answers['nombre'] && state.answers['nombre'].length));
      case 2: return req(stepEl, isValidEmail(state.answers['email'] || ''));
      case 3: return req(stepEl, !!(state.answers['negocio'] && state.answers['negocio'].length));
      case 4:
        if (!state.answers['freno']) return req(stepEl, false);
        if (state.answers['freno'] === 'otro') {
          var v = (state.answers['freno_otro'] || '').length > 0;
          return req(stepEl.querySelector('.qf-field--other'), v) && true;
        }
        return true;
      case 5: return req(stepEl, !!state.answers['fact_act']);
      case 6: return req(stepEl, !!state.answers['inv_pub']);
      case 7: return consentPrivacy && consentPrivacy.checked; // web opcional
      default: return true;
    }
  }

  function req(scope, ok) {
    if (!ok && scope) {
      var err = scope.querySelector('.qf-field-error');
      if (err) err.classList.add('is-visible');
    }
    return ok;
  }
  function clearError(scope) {
    if (!scope) return;
    scope.querySelectorAll('.qf-field-error').forEach(function (e) { e.classList.remove('is-visible'); });
  }

  /* ---------------- Navegación ---------------- */
  function showStep(n, skipFocus) {
    steps.forEach(function (s) { s.classList.remove('is-active'); });
    steps[n - 1].classList.add('is-active');
    state.step = n;
    progressFill.style.width = ((n - 1) / (TOTAL_STEPS - 1) * 100) + '%';
    btnBack.hidden = (n === 1);
    var arrow = ' <span class="arw" aria-hidden="true">→</span>';
    btnNext.innerHTML = (n === TOTAL_STEPS ? 'Enviar' : 'Siguiente') + arrow;
    updateNextState();
    if (!skipFocus) {
      var firstInput = steps[n - 1].querySelector('input, textarea');
      if (firstInput) firstInput.focus({ preventScroll: true });
    }
  }

  function updateNextState() {
    if (state.step === TOTAL_STEPS) {
      btnNext.disabled = !(consentPrivacy && consentPrivacy.checked);
    } else {
      btnNext.disabled = false;
    }
  }

  btnNext.addEventListener('click', function () {
    if (!validateStep(state.step)) return;
    if (state.step < TOTAL_STEPS) {
      showStep(state.step + 1);
    } else {
      submitForm();
    }
  });

  btnBack.addEventListener('click', function () {
    if (state.step > 1) showStep(state.step - 1);
  });

  /* ---------------- Scoring (idéntico al de /kaipimpulsa/) ---------------- */
  function calculateScore() {
    var score = 0;

    var freno_scores = {
      'anuncios': 10,
      'mensaje':  10,
      'oferta':    7,
      'otro':      5,
      'cierre':    2,
    };
    score += freno_scores[state.answers['freno']] || 0;

    var fact_scores = {
      'menos_30k':  10,
      '30k_50k':    25,
      '50k_100k':   35,
      '100k_200k':  42,
      'mas_200k':   45,
    };
    score += fact_scores[state.answers['fact_act']] || 0;

    var inv_scores = {
      'no_invierto': 0,
      'menos_1k':   10,
      '1k_3k':      25,
      '3k_5k':      35,
      '5k_10k':     42,
      'mas_10k':    45,
    };
    score += inv_scores[state.answers['inv_pub']] || 0;

    return Math.max(0, score);
  }

  /* ---------------- Envío ---------------- */
  function sendToMailchimp(payload, onSuccess) {
    fetch(CONFIG.SUBMIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(function (r) { return r.json().catch(function () { return {}; }); })
    .then(function () { if (onSuccess) onSuccess(); })
    .catch(function () { if (onSuccess) onSuccess(); }); // no bloqueamos al usuario si falla
  }

  function submitForm() {
    var score = calculateScore();
    var qualified = score >= CONFIG.SCORE_THRESHOLD;

    btnNext.disabled = true;
    btnNext.textContent = 'Enviando…';

    var freno = state.answers['freno'] === 'otro'
      ? (state.answers['freno_otro'] || 'Otro')
      : (state.answers['freno'] || '');

    var utmData = collectUTMs();
    var payload = {
      nombre:            state.answers['nombre'] || '',
      email:             state.answers['email'] || '',
      negocio:           state.answers['negocio'] || '',
      freno:             freno,
      fact_act:          state.answers['fact_act'] || '',
      inv_pub:           state.answers['inv_pub'] || '',
      web:               state.answers['web'] || '',
      score:             score,
      qualified:         qualified,
      marketing_consent: !!state.marketing,
      origen:            CONFIG.ORIGEN,
    };
    UTM_PARAMS.forEach(function (param) { payload[param] = utmData[param]; });

    if (qualified) {
      // Cualificado: guardamos el payload y mostramos Calendly.
      // submit.php se llamará DESPUÉS de que el usuario reserve.
      pendingPayload = payload;
      showResult();
    } else {
      // No cualificado: enviamos a Mailchimp/Sheets ahora y redirigimos.
      sendToMailchimp(payload, function () {
        window.location.href = 'gracias.html';
      });
    }
  }

  /* ---------------- Pantalla de resultado (solo leads cualificados) ---------------- */
  function showResult() {
    if (formUI) formUI.style.display = 'none';
    document.getElementById('qf-result-calendly').classList.add('is-active');
    loadCalendly();
    document.getElementById('impulsa-form-slot').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- Calendly (lazy, solo si apto, una vez) ---------------- */
  var calendlyLoaded = false;
  function loadCalendly() {
    if (calendlyLoaded) return;
    calendlyLoaded = true;
    var script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.onload = function () {
      Calendly.initInlineWidget({
        url: CONFIG.CALENDLY_URL,
        parentElement: document.getElementById('qf-calendly-embed'),
        prefill: {
          name:  state.answers['nombre'] || '',
          email: state.answers['email'] || '',
        }
      });
    };
    document.head.appendChild(script);
  }

  // Detecta la reserva completada en Calendly: envía a Mailchimp/Sheets (ahora
  // que hay reserva confirmada) y redirige a la confirmación.
  window.addEventListener('message', function (e) {
    if (e.data && e.data.event === 'calendly.event_scheduled') {
      if (pendingPayload) {
        var payload = pendingPayload;
        pendingPayload = null; // evita doble envío si el evento se dispara dos veces
        sendToMailchimp(payload, function () {
          window.location.href = 'confirmacion.html';
        });
      } else {
        window.location.href = 'confirmacion.html';
      }
    }
  });

  // Init (sin foco automático: evita el scroll hasta el formulario al cargar)
  showStep(1, true);
})();
