const editor = document.getElementById('editor');
const statusEl = document.getElementById('status');
const passwordEl = document.getElementById('password');

let sessionToken = sessionStorage.getItem('adminSessionToken') || '';

function setStatus(text, error = false) {
  statusEl.textContent = text;
  statusEl.style.color = error ? '#b00020' : '#1b5e20';
}

async function login() {
  const password = passwordEl.value.trim();
  if (!password) {
    setStatus('Please enter your admin password first.', true);
    return;
  }

  setStatus('Logging in...');
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    setStatus(`Login failed: ${res.status} ${await res.text()}`, true);
    return;
  }

  const data = await res.json();
  sessionToken = data.sessionToken || '';
  sessionStorage.setItem('adminSessionToken', sessionToken);
  setStatus('Logged in. You can now save content.');
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
    setStatus('Please log in first before saving.', true);
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

document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('loadBtn').addEventListener('click', loadContent);
document.getElementById('saveBtn').addEventListener('click', saveContent);
loadContent();
