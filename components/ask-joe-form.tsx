'use client';

import { useState } from 'react';

export function AskJoeForm({ suggestedQuestions }: { suggestedQuestions: string[] }) {
  const [question, setQuestion] = useState(suggestedQuestions[0] || '');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ask-joe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setAnswer(data.answer || 'No answer returned.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="ask-box" onSubmit={handleSubmit}>
      <div className="chip-row">
        {suggestedQuestions.map((item) => (
          <button key={item} type="button" className="chip" onClick={() => setQuestion(item)}>
            {item}
          </button>
        ))}
      </div>
      <textarea
        className="textarea"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask Joe about research, teaching, grants, or collaborations."
      />
      <div className="action-row">
        <button className="btn btn-primary" type="submit" disabled={loading || !question.trim()}>
          {loading ? 'Thinking…' : 'Ask AskJoe'}
        </button>
      </div>
      {error ? <div className="status-error">{error}</div> : null}
      {answer ? (
        <div>
          <div className="eyebrow">Response</div>
          <div className="answer">{answer}</div>
        </div>
      ) : null}
    </form>
  );
}
