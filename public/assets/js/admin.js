const editor = document.getElementById('editor');
const statusEl = document.getElementById('status');
const emailEl = document.getElementById('email');
const codeEl = document.getElementById('code');

let sessionToken = sessionStorage.getItem('adminSessionToken') || '';

function setStatus(text, error = false) {
  statusEl.textContent = text;
  statusEl.style.color = error ? '#b00020' : '#1b5e20';
}

function getEmail() {
  return emailEl.value.trim().toLowerCase();
}

async function requestCode() {
  const email = getEmail();
  if (!email) {
    setStatus('Please enter your admin email first.', true);
    return;
  }

  setStatus('Sending code...');
  const res = await fetch('/api/admin/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    setStatus(`Send code failed: ${res.status} ${await res.text()}`, true);
    return;
  }

  setStatus('Verification code sent. Please check your email.');
}

async function verifyCode() {
  const email = getEmail();
  const code = codeEl.value.trim();

  if (!email || !code) {
    setStatus('Please enter both email and code.', true);
    return;
  }

  setStatus('Verifying...');
  const res = await fetch('/api/admin/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  if (!res.ok) {
    setStatus(`Verify failed: ${res.status} ${await res.text()}`, true);
    return;
  }

  const data = await res.json();
  sessionToken = data.sessionToken || '';
  sessionStorage.setItem('adminSessionToken', sessionToken);
  setStatus('Verified. You can now save content.');
}

async function loadContent() {
  setStatus('Loading...');
  const res = await fetch('/api/content');
  if (!res.ok) {
    setStatus(`Load failed: ${res.status}`, true);
    return;
  }
  editor.value = JSON.stringify(await res.json(), null, 2);
  setStatus('Loaded');
}

async function saveContent() {
  let payload;
  try {
    payload = JSON.parse(editor.value);
  } catch (err) {
    setStatus(`Invalid JSON: ${err.message}`, true);
    return;
  }

  if (!sessionToken) {
    setStatus('Please verify your email first before saving.', true);
    return;
  }

  setStatus('Saving...');
  const res = await fetch('/api/content', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': sessionToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    setStatus(`Save failed: ${res.status} ${await res.text()}`, true);
    return;
  }

  setStatus('Saved');
}

document.getElementById('requestCodeBtn').addEventListener('click', requestCode);
document.getElementById('verifyCodeBtn').addEventListener('click', verifyCode);
document.getElementById('loadBtn').addEventListener('click', loadContent);
document.getElementById('saveBtn').addEventListener('click', saveContent);
loadContent();
