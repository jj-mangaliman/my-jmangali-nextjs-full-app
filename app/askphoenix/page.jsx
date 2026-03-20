'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import Loading from '../../components/Loading';
import ReactMarkdown from 'react-markdown';

export default function CSRPage() {
  const { isLoading } = useUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    const assistantMessage = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([...updatedMessages, { role: 'assistant', content: assistantText }]);
      }
    } catch (err) {
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: `Error: ${err.message}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  if (isLoading) return <Loading />;

  return (
    <div data-testid="csr" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ marginBottom: '8px' }}>Got a question for Phoenix?</h2>
      <p className="text-muted" style={{ marginBottom: '24px' }}>
        Do you have a question about a control, a security requirement, the status of your Auth0 tenant? Phoenix will tell you whether your requirement is possible, whether it conforms with NIST standards (and later our own internal standards). And depending on your access, he may be able to configure your tenant for you! Don&apos;t be shy!
      </p>

      <div
        style={{
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '16px',
          minHeight: '400px',
          maxHeight: '500px',
          overflowY: 'auto',
          marginBottom: '16px',
          backgroundColor: '#f8f9fa',
        }}
      >
        {messages.length === 0 && (
          <p className="text-muted" style={{ textAlign: 'center', marginTop: '160px' }}>
            Ask a question to get started. <br />
            <small>e.g. "We want users to stay logged in for 30 days without re-authenticating"</small>
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: '16px',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: msg.role === 'user' ? '#0d6efd' : '#ffffff',
                color: msg.role === 'user' ? '#ffffff' : '#212529',
                border: msg.role === 'assistant' ? '1px solid #dee2e6' : 'none',
                textAlign: 'left',
              }}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown>{msg.content || (isStreaming && i === messages.length - 1 ? '▍' : '')}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Type something. We'll try our best to guess what you mean."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isStreaming || !input.trim()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {isStreaming ? 'Thinking...' : 'Ask Phoenix'}
        </button>
      </form>
    </div>
  );
}
