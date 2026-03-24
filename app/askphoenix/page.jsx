'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import Loading from '../../components/Loading';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function CSRPage() {
  const { user, isLoading } = useUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef(null);

  // On mount: read saved conversation from localStorage for this user
  useEffect(() => {
    if (!user?.sub) return;
    const saved = localStorage.getItem(`phoenix-chat-${user.sub}`);
    if (saved) setMessages(JSON.parse(saved));
  }, [user?.sub]);

  // On every message update: persist to localStorage
  useEffect(() => {
    if (!user?.sub || messages.length === 0) return;
    localStorage.setItem(`phoenix-chat-${user.sub}`, JSON.stringify(messages));
  }, [messages, user?.sub]);

  function clearSession() {
    if (!user?.sub) return;
    localStorage.removeItem(`phoenix-chat-${user.sub}`);
    setMessages([]);
  }

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

  function downloadAsMarkdown() {
    const lines = messages.map((msg) => {
      const label = msg.role === 'user' ? '## You' : '## Phoenix';
      return `${label}\n\n${msg.content}`;
    });
    const content = `# Phoenix Session\n\n${lines.join('\n\n---\n\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phoenix-session-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <Loading />;

  return (
    <>
      <style>{`
        .phoenix-page {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - 64px);
          width: 100%;
          padding: 24px;
          box-sizing: border-box;
        }
        .phoenix-chat-box {
          flex: 1;
          min-height: 0;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 16px;
          overflow-y: auto;
          margin-bottom: 16px;
          background-color: #f8f9fa;
        }
        .phoenix-chat-form {
          display: flex;
          gap: 8px;
        }
        @media (max-width: 576px) {
          .phoenix-page {
            padding: 12px;
          }
          .phoenix-chat-form {
            flex-direction: column;
          }
          .phoenix-chat-form button {
            width: 100%;
          }
        }
        @media (min-width: 577px) and (max-width: 768px) {
          .phoenix-page { padding: 16px; }
        }
        @media (min-width: 769px) and (max-width: 992px) {
          .phoenix-page { padding: 20px; }
        }
        @media (min-width: 993px) {
          .phoenix-page { padding: 24px 32px; }
        }
      `}</style>

      <div data-testid="csr" className="phoenix-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h2 style={{ margin: 0 }}>Got a question for Phoenix?</h2>
          {messages.length > 0 && !isStreaming && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline-secondary btn-sm" onClick={downloadAsMarkdown}>
                ↓ Download session
              </button>
              <button className="btn btn-outline-danger btn-sm" onClick={clearSession}>
                New session
              </button>
            </div>
          )}
        </div>
        <p className="text-muted" style={{ marginBottom: '16px' }}>
          Do you have a question about a control, a security requirement, the status of your Auth0 tenant? Phoenix will tell you whether your requirement is possible, whether it conforms with NIST standards (and later our own internal standards). And depending on your access, he may be able to configure your tenant for you! Don&apos;t be shy!
        </p>

        <div className="phoenix-chat-box">
          {messages.length === 0 && (
            <p className="text-muted" style={{ textAlign: 'center', marginTop: '20vh' }}>
              Ask a question to get started. <br />
              <small>e.g. &quot;We want users to stay logged in for 30 days without re-authenticating&quot;</small>
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
                  maxWidth: msg.role === 'assistant' ? '100%' : '80%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: msg.role === 'user' ? '#ffb700' : '#ffffff',
                  color: '#212529',
                  border: msg.role === 'assistant' ? '1px solid #dee2e6' : 'none',
                  textAlign: 'left',
                }}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || (isStreaming && i === messages.length - 1 ? '...' : '')}</ReactMarkdown>
                    {isStreaming && i === messages.length - 1 && !msg.content
                      ? <p style={{ fontSize: '0.75rem', color: '#6c757d', margin: '4px 0 0' }}>Phoenix is thinking — this may take a moment if tenant data is being fetched...</p>
                      : null}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="phoenix-chat-form">
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
          {isStreaming && (
            <p className="text-muted" style={{ fontSize: '0.75rem', margin: '6px 0 0', textAlign: 'center' }}>
              This may take a moment if Phoenix is fetching live data from your tenant...
            </p>
          )}
        </form>
      </div>
    </>
  );
}
