const editor = document.getElementById('editor');
const statusEl = document.getElementById('status');

function setStatus(text, error = false) {
  statusEl.textContent = text;
  statusEl.style.color = error ? '#b00020' : '#1b5e20';
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

  const token = document.getElementById('token').value;
  setStatus('Saving...');
  const res = await fetch('/api/content', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    setStatus(`Save failed: ${res.status} ${await res.text()}`, true);
    return;
  }

  setStatus('Saved');
}

document.getElementById('loadBtn').addEventListener('click', loadContent);
document.getElementById('saveBtn').addEventListener('click', saveContent);
loadContent();
