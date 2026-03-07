async function loadNews() {
            try {
                const res = await fetch('/api/content');
                if (!res.ok) return;
                const data = await res.json();
                if (!data || !Array.isArray(data.news)) return;

                const box = document.getElementById('news-updates');
                if (!box) return;
                box.innerHTML = '';

                data.news.forEach((item) => {
                    const row = document.createElement('div');
                    row.className = 'update-item';

                    const date = document.createElement('div');
                    date.className = 'update-date';
                    date.textContent = item.date || '';

                    const text = document.createElement('div');
                    text.className = 'update-text';
                    text.textContent = item.text || '';

                    row.appendChild(date);
                    row.appendChild(text);
                    box.appendChild(row);
                });
            } catch (_) {
                // keep fallback HTML when backend is unavailable
            }
        }

        loadNews();
