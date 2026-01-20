// Global Error Tracking (persists in localStorage)
(function() {
  // Helper to get/update error counts in localStorage
  function getErrorCounts() {
    const stored = localStorage.getItem('errorCounts');
    if (stored) return JSON.parse(stored);
    return { jsErrors: 0, networkErrors: 0, serverErrors: 0, clientErrors: 0, resourceErrors: 0 };
  }

  function incrementError(type) {
    const counts = getErrorCounts();
    if (counts[type] !== undefined) {
      counts[type]++;
      localStorage.setItem('errorCounts', JSON.stringify(counts));
    }
  }

  // Track JavaScript errors globally
  window.addEventListener('error', function(event) {
    incrementError('jsErrors');
    console.log('[Error Tracked] JS Error:', event.message);
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    incrementError('jsErrors');
    console.log('[Error Tracked] Unhandled Rejection:', event.reason);
  });

  // Track resource loading errors (images, scripts, etc.)
  window.addEventListener('error', function(event) {
    if (event.target && (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) {
      incrementError('resourceErrors');
      console.log('[Error Tracked] Resource Error:', event.target.src || event.target.href);
    }
  }, true);

  // Make incrementError available globally for manual tracking
  window.trackGlobalError = function(type) {
    const typeMap = {
      'js': 'jsErrors',
      'network': 'networkErrors',
      'server': 'serverErrors',
      'client': 'clientErrors',
      'resource': 'resourceErrors'
    };
    incrementError(typeMap[type] || type);
  };
})();

// Toast
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Password Toggle
function togglePassword(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
}

// Modal
function openUserModal() { document.getElementById('modalOverlay')?.classList.add('show'); }
function closeModal(e) { if (e.target.id === 'modalOverlay') closeModalBtn(); }
function closeModalBtn() { document.getElementById('modalOverlay')?.classList.remove('show'); }

// Identify Modal
function openIdentifyModal() {
  const existingSession = loadUserSession();
  if (existingSession && existingSession.email && existingSession.userId) {
    showToast('Already identified as ' + existingSession.email, 'info');
    return;
  }
  document.getElementById('identifyModalOverlay')?.classList.add('show');
  const form = document.getElementById('identifyForm');
  const success = document.getElementById('identifySuccess');
  const preview = document.getElementById('generatedIdPreview');
  if (form) form.style.display = 'block';
  if (success) success.style.display = 'none';
  if (preview) preview.style.display = 'none';
  const nameInput = document.getElementById('identifyName');
  const emailInput = document.getElementById('identifyEmail');
  if (nameInput) nameInput.value = '';
  if (emailInput) emailInput.value = '';
}
function closeIdentifyModal(e) { if (e.target.id === 'identifyModalOverlay') closeIdentifyModalBtn(); }
function closeIdentifyModalBtn() { document.getElementById('identifyModalOverlay')?.classList.remove('show'); }

// Generate consistent ID from email using a simple hash
function generateUserIdFromEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalizedEmail.length; i++) {
    const char = normalizedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const positiveHash = Math.abs(hash).toString(16).padStart(8, '0');
  return 'usr_' + positiveHash;
}

// Preview ID as user types email
document.addEventListener('DOMContentLoaded', function() {
  const emailInput = document.getElementById('identifyEmail');
  if (emailInput) {
    emailInput.addEventListener('input', function(e) {
      const email = e.target.value;
      const preview = document.getElementById('generatedIdPreview');
      const display = document.getElementById('generatedIdDisplay');
      if (email && email.includes('@')) {
        const userId = generateUserIdFromEmail(email);
        if (display) display.textContent = userId;
        if (preview) preview.style.display = 'block';
      } else {
        if (preview) preview.style.display = 'none';
      }
    });
  }

  // Initialize session on page load
  initUserSession();

  // Initialize page-specific features
  initPageFeatures();
});

// Update UI with user session
function updateUserDisplay(name, email, userId) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatar = document.getElementById('userAvatarDisplay');
  const nameEl = document.getElementById('userNameDisplay');
  if (avatar) avatar.textContent = initials;
  if (nameEl) nameEl.textContent = name;
}

// Save session to localStorage
function saveUserSession(name, email, userId) {
  const session = { name: name, email: email, userId: userId };
  localStorage.setItem('uzera_user_session', JSON.stringify(session));
}

// Load session from localStorage
function loadUserSession() {
  const stored = localStorage.getItem('uzera_user_session');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Clear user session
function clearUserSession() {
  localStorage.removeItem('uzera_user_session');
  const avatar = document.getElementById('userAvatarDisplay');
  const nameEl = document.getElementById('userNameDisplay');
  if (avatar) avatar.textContent = 'TS';
  if (nameEl) nameEl.textContent = 'Test User';
  showToast('Session cleared', 'info');
}

// Initialize session on page load
function initUserSession() {
  const session = loadUserSession();
  if (session && session.email && session.userId) {
    const name = session.name || session.email.split('@')[0];
    updateUserDisplay(name, session.email, session.userId);
    if (typeof uzera !== 'undefined' && uzera.identify) {
      uzera.identify(
       session.userId,
        {
          name: name,
          email: session.email,
        });
    } else {
      console.log('Session restored - uzera.identify({ id: "' + session.userId + '", userData: { name: "' + name + '", email: "' + session.email + '" } });');
    }
  }
}

// Handle identify form submission
function handleIdentifySubmit(e) {
  e.preventDefault();
  const name = document.getElementById('identifyName').value;
  const email = document.getElementById('identifyEmail').value;
  const userId = generateUserIdFromEmail(email);

  saveUserSession(name, email, userId);

  if (typeof uzera !== 'undefined' && uzera.identify) {
    uzera.identify(
       userId,
   {
        name: name,
        email: email,
      });
  } else {
    console.log('uzera.identify({ id: "' + userId + '", userData: { name: "' + name + '", email: "' + email + '" } });');
  }

  updateUserDisplay(name, email, userId);

  document.getElementById('identifyForm').style.display = 'none';
  document.getElementById('identifySuccess').style.display = 'block';
  document.getElementById('successUserId').textContent = userId;
  document.getElementById('successName').textContent = name;
  document.getElementById('successEmail').textContent = email;

  showToast('User identified successfully!', 'success');
}

// iFrame
function loadIframe(id, url) {
  const w = document.getElementById(id);
  if (w) {
    w.style.display = 'block';
    w.querySelector('iframe').src = url;
    showToast('Loading iframe...', 'info');
  }
}
function closeIframe(id) {
  const w = document.getElementById(id);
  if (w) { w.style.display = 'none'; w.querySelector('iframe').src = 'about:blank'; }
}

// Rage Click
let rageCount = 0;
function rageClick() {
  rageCount++;
  const el = document.getElementById('rageCount');
  if (el) el.textContent = rageCount;
  if (rageCount >= 5 && rageCount % 5 === 0) showToast('Rage click detected!', 'error');
}

// Storage Functions
function setLocalStorage() {
  const data = {
    'user_email': 'john@email.com',
    'auth_token': 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxMjN9',
    'user_ssn': '123-45-6789',
    'card_last4': '9012'
  };
  Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
  displayLocalStorage();
  showToast('localStorage set with sensitive data', 'success');
}
function displayLocalStorage() {
  const d = document.getElementById('localStorageDisplay');
  if (!d) return;
  d.innerHTML = '';
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const v = localStorage.getItem(k);
    d.innerHTML += `<div class="storage-item"><span class="storage-key">${k}</span><span class="storage-value">${v}</span></div>`;
  }
}
function clearLocalStorage() { localStorage.clear(); displayLocalStorage(); showToast('localStorage cleared', 'info'); }

function setSessionStorage() {
  const data = { 'session_id': 'sess_abc123', 'user_name': 'John Doe', 'temp_token': 'temp_xyz789' };
  Object.entries(data).forEach(([k, v]) => sessionStorage.setItem(k, v));
  displaySessionStorage();
  showToast('sessionStorage set', 'success');
}
function displaySessionStorage() {
  const d = document.getElementById('sessionStorageDisplay');
  if (!d) return;
  d.innerHTML = '';
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    const v = sessionStorage.getItem(k);
    d.innerHTML += `<div class="storage-item"><span class="storage-key">${k}</span><span class="storage-value">${v}</span></div>`;
  }
}
function clearSessionStorage() { sessionStorage.clear(); displaySessionStorage(); showToast('sessionStorage cleared', 'info'); }

function setCookies() {
  document.cookie = "user_id=12345; path=/";
  document.cookie = "session_token=sess_abc123xyz; path=/";
  document.cookie = "email=john@email.com; path=/";
  displayCookies();
  showToast('Cookies set', 'success');
}
function displayCookies() {
  const el = document.getElementById('cookieRaw');
  if (el) el.textContent = document.cookie || '(no cookies)';
}
function clearCookies() {
  document.cookie.split(";").forEach(c => {
    document.cookie = c.split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });
  displayCookies();
  showToast('Cookies cleared', 'info');
}

function testStorage() { setLocalStorage(); setSessionStorage(); setCookies(); }

function testIndexedDB() {
  const d = document.getElementById('indexedDBDisplay');
  if (d) {
    d.style.display = 'block';
    d.textContent = 'IndexedDB test:\n{\n  "users": [{ "id": 1, "email": "john@email.com" }],\n  "tokens": [{ "access": "abc123" }]\n}';
  }
  showToast('IndexedDB simulated', 'info');
}

// Geolocation
let watchId = null;
function getLocation() {
  if (!navigator.geolocation) return showToast('Geolocation not supported', 'error');
  navigator.geolocation.getCurrentPosition(pos => {
    const coords = document.getElementById('coordsDisplay');
    const accuracy = document.getElementById('accuracyDisplay');
    const location = document.getElementById('locationDisplay');
    if (coords) coords.textContent = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
    if (accuracy) accuracy.textContent = `Accuracy: ±${pos.coords.accuracy.toFixed(0)}m`;
    if (location) {
      const muted = location.querySelector('.text-muted');
      if (muted) muted.textContent = '📍 Location captured!';
    }
    showToast('Location captured - MUST BE MASKED', 'error');
  }, err => showToast('Location error: ' + err.message, 'error'));
}
function watchLocation() {
  if (!navigator.geolocation) return;
  const d = document.getElementById('watchDisplay');
  if (d) d.innerHTML = '';
  watchId = navigator.geolocation.watchPosition(pos => {
    if (d) {
      d.innerHTML += `${new Date().toLocaleTimeString()}: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}\n`;
      d.scrollTop = d.scrollHeight;
    }
  });
  showToast('Location tracking started', 'info');
}
function stopWatching() { if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; showToast('Tracking stopped', 'info'); } }
function getIPLocation() {
  const display = document.getElementById('ipLocationDisplay');
  if (display) display.style.display = 'block';
  const ip = document.getElementById('ipAddress');
  const city = document.getElementById('ipCity');
  const country = document.getElementById('ipCountry');
  const isp = document.getElementById('ipISP');
  if (ip) ip.textContent = '203.0.113.42';
  if (city) city.textContent = 'New York';
  if (country) country.textContent = 'United States';
  if (isp) isp.textContent = 'Comcast';
  showToast('IP location detected (simulated)', 'info');
}
function updateTimezone() {
  const tz = document.getElementById('timezone');
  const locale = document.getElementById('locale');
  const lang = document.getElementById('language');
  if (tz) tz.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (locale) locale.textContent = navigator.language;
  if (lang) lang.textContent = navigator.languages.join(', ');
}

// Media
let cameraStream = null, micStream = null, screenStream = null, recognition = null;

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const v = document.getElementById('cameraVideo');
    if (v) {
      v.srcObject = cameraStream;
      v.style.display = 'block';
    }
    const preview = document.getElementById('cameraPreview');
    if (preview) preview.style.display = 'none';
    showToast('Camera active - MASK video feed', 'error');
  } catch(e) { showToast('Camera error: ' + e.message, 'error'); }
}
function stopCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  const v = document.getElementById('cameraVideo');
  const preview = document.getElementById('cameraPreview');
  if (v) v.style.display = 'none';
  if (preview) preview.style.display = 'flex';
}

async function startMicrophone() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preview = document.getElementById('micPreview');
    const level = document.getElementById('audioLevel');
    if (preview) preview.innerHTML = '<div style="font-size:3rem;">🎤</div><div style="color:#16a34a;">Microphone ACTIVE</div>';
    if (level) level.style.display = 'block';
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(micStream).connect(analyser);
    const data = new Uint8Array(256);
    function updateLevel() {
      if (!micStream) return;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b) / data.length;
      const bar = document.getElementById('audioBar');
      if (bar) bar.style.width = (avg / 2.56) + '%';
      requestAnimationFrame(updateLevel);
    }
    updateLevel();
    showToast('Microphone active - MASK audio', 'error');
  } catch(e) { showToast('Mic error: ' + e.message, 'error'); }
}
function stopMicrophone() {
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  const preview = document.getElementById('micPreview');
  const level = document.getElementById('audioLevel');
  if (preview) preview.innerHTML = '<div style="font-size:3rem;">🎤</div><div class="text-sm text-muted">Microphone not active</div>';
  if (level) level.style.display = 'none';
}

async function startScreenShare() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const v = document.getElementById('screenVideo');
    const preview = document.getElementById('screenPreview');
    if (v) {
      v.srcObject = screenStream;
      v.style.display = 'block';
    }
    if (preview) preview.style.display = 'none';
    showToast('Screen sharing - MASK content', 'error');
  } catch(e) { showToast('Screen share error: ' + e.message, 'error'); }
}
function stopScreenShare() {
  if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
  const v = document.getElementById('screenVideo');
  const preview = document.getElementById('screenPreview');
  if (v) v.style.display = 'none';
  if (preview) preview.style.display = 'flex';
}

function startSpeech() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return showToast('Speech not supported', 'error');
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.onresult = e => {
    const t = Array.from(e.results).map(r => r[0].transcript).join(' ');
    const result = document.getElementById('speechResult');
    if (result) result.textContent = t;
  };
  recognition.start();
  showToast('Listening... speak now', 'info');
}
function stopSpeech() { if (recognition) { recognition.stop(); recognition = null; } }

// Autofill
function detectPasswordManager() {
  setTimeout(() => {
    const detected = document.querySelector('input[data-lpignore], input[data-1p-ignore], [data-bitwarden-watching]') ? 'Yes' : 'Not detected';
    const el = document.getElementById('pmDetected');
    if (el) el.textContent = detected;
  }, 500);
}

// URL
function updateURLDisplay() {
  const full = document.getElementById('urlFull');
  const protocol = document.getElementById('urlProtocol');
  const host = document.getElementById('urlHost');
  const path = document.getElementById('urlPath');
  const query = document.getElementById('urlQuery');
  const hash = document.getElementById('urlHash');
  const referrer = document.getElementById('docReferrer');
  const withParams = document.getElementById('urlWithParams');
  const withHash = document.getElementById('urlWithHash');

  if (full) full.textContent = location.href;
  if (protocol) protocol.textContent = location.protocol;
  if (host) host.textContent = location.host;
  if (path) path.textContent = location.pathname;
  if (query) query.textContent = location.search || '(none)';
  if (hash) hash.textContent = location.hash || '(none)';
  if (referrer) referrer.textContent = document.referrer || '(none)';
  if (withParams) withParams.textContent = location.href;
  if (withHash) withHash.textContent = location.href;
}
function addSensitiveParams() {
  const url = new URL(location.href);
  url.searchParams.set('email', 'john@email.com');
  url.searchParams.set('token', 'abc123xyz');
  url.searchParams.set('user_id', '12345');
  history.pushState({}, '', url);
  updateURLDisplay();
  showToast('Sensitive params added to URL', 'error');
}
function clearParams() { history.pushState({}, '', location.pathname); updateURLDisplay(); }
function addSensitiveHash() {
  location.hash = 'access_token=eyJhbGciOiJIUzI1NiJ9&user_id=123';
  updateURLDisplay();
  showToast('Token added to hash', 'error');
}
function clearHash() { history.pushState({}, '', location.pathname + location.search); updateURLDisplay(); }

// Recovery
function copyRecoveryCodes() {
  const codes = Array.from(document.querySelectorAll('.recovery-code')).map(e => e.textContent).join('\n');
  navigator.clipboard?.writeText(codes);
  showToast('Recovery codes copied!', 'success');
}
function simulateSecurityKey() {
  const status = document.getElementById('securityKeyStatus');
  if (status) status.style.display = 'block';
  showToast('Security key registered (simulated)', 'success');
}

// Canvas Animation
let canvasAnim = null;
function startCanvasAnim() {
  const canvas = document.getElementById('animCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push({ x: Math.random() * 400, y: Math.random() * 200, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, r: Math.random() * 5 + 2, color: `hsl(${Math.random() * 360}, 70%, 60%)` });
  }
  function animate() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
    ctx.fillRect(0, 0, 400, 200);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > 400) p.vx *= -1;
      if (p.y < 0 || p.y > 200) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    canvasAnim = requestAnimationFrame(animate);
  }
  animate();
  showToast('Canvas animation started', 'info');
}
function stopCanvasAnim() { if (canvasAnim) { cancelAnimationFrame(canvasAnim); canvasAnim = null; } }
function clearCanvas() {
  stopCanvasAnim();
  const canvas = document.getElementById('animCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 400, 200);
  }
}

// Signature Canvas
function initSignatureCanvas() {
  const sigCanvas = document.getElementById('signatureCanvas');
  if (sigCanvas) {
    const sigCtx = sigCanvas.getContext('2d');
    let drawing = false;
    sigCanvas.addEventListener('mousedown', e => { drawing = true; sigCtx.beginPath(); sigCtx.moveTo(e.offsetX, e.offsetY); });
    sigCanvas.addEventListener('mousemove', e => { if (drawing) { sigCtx.lineTo(e.offsetX, e.offsetY); sigCtx.stroke(); } });
    sigCanvas.addEventListener('mouseup', () => drawing = false);
    sigCanvas.addEventListener('mouseleave', () => drawing = false);
    sigCtx.strokeStyle = '#000';
    sigCtx.lineWidth = 2;
    sigCtx.lineCap = 'round';
  }
}
function clearSignature() {
  const canvas = document.getElementById('signatureCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 400, 150);
  }
}

// Error triggers
function triggerJSError() { throw new Error('Test JavaScript Error - Should be captured'); }
function triggerTypeError() { const obj = null; obj.nonExistent(); }
function triggerNetworkError() {
  fetch('https://nonexistent.invalid/api')
    .catch(() => showToast('Network error triggered', 'error'));
}
function triggerPromiseRejection() { Promise.reject(new Error('Unhandled Promise Rejection')); }
function triggerConsoleError() { console.error('Console error with PII: john@email.com, SSN: 123-45-6789'); showToast('Check console for error', 'info'); }

// API Simulation
function simulateAPICall(endpoint) {
  showToast(`Calling ${endpoint}...`, 'info');
  setTimeout(() => {
    const display = document.getElementById('apiResponseDisplay');
    if (display) {
      display.style.display = 'block';
      if (endpoint === '/api/user') {
        display.textContent = JSON.stringify({ id: 123, email: 'john@email.com', ssn: '123-45-6789', name: 'John Doe' }, null, 2);
      } else if (endpoint === '/api/payment') {
        display.textContent = JSON.stringify({ card: '4532-1234-5678-9012', cvv: '123', expiry: '12/28' }, null, 2);
      } else {
        display.textContent = JSON.stringify({ token: 'eyJhbGciOiJIUzI1NiJ9...', refresh: 'ref_abc123' }, null, 2);
      }
    }
    showToast('API response received - check masking', 'success');
  }, 500);
}

// Initialize page-specific features
function initPageFeatures() {
  // Keystroke test
  const keystrokeTest = document.getElementById('keystrokeTest');
  if (keystrokeTest) {
    keystrokeTest.addEventListener('input', e => {
      const display = document.getElementById('keystrokeDisplay');
      if (display) display.textContent = 'Keystrokes: ' + e.target.value;
    });
  }

  // Clipboard events
  const copySource = document.getElementById('copySource');
  if (copySource) {
    copySource.addEventListener('copy', e => {
      const lastCopied = document.getElementById('lastCopied');
      if (lastCopied) lastCopied.textContent = window.getSelection().toString().substring(0, 50) + '...';
    });
  }

  const pasteTarget = document.getElementById('pasteTarget');
  if (pasteTarget) {
    pasteTarget.addEventListener('paste', e => {
      setTimeout(() => {
        const lastPasted = document.getElementById('lastPasted');
        if (lastPasted) lastPasted.textContent = e.target.value.substring(0, 50) + '...';
      }, 0);
    });
  }

  const cutSource = document.getElementById('cutSource');
  if (cutSource) {
    cutSource.addEventListener('cut', e => {
      const lastCut = document.getElementById('lastCut');
      if (lastCut) lastCut.textContent = e.target.value;
    });
  }

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection().toString();
    const selectedText = document.getElementById('selectedText');
    if (sel && selectedText) {
      selectedText.textContent = sel.substring(0, 50);
    }
  });

  // Initialize signature canvas
  initSignatureCanvas();

  // Page-specific initializations
  const currentPage = document.body.dataset.page;
  if (currentPage === 'urldata') updateURLDisplay();
  if (currentPage === 'geolocation') updateTimezone();
  if (currentPage === 'autofill') detectPasswordManager();
}
