import React from 'react';
import { auth0 } from '../../lib/auth0';

export default async function SSRPage() {
  const session = await auth0.getSession();
  const { user } = session;

  // Separate known profile fields from the rest of the ID token claims
  const knownFields = ['sub', 'name', 'email', 'email_verified', 'picture', 'nickname', 'updated_at'];
  const extraClaims = Object.entries(user).filter(([key]) => !knownFields.includes(key));

  return (
    <div className="mb-5" data-testid="ssr" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ marginBottom: '4px' }}>User Profile</h2>
      <p className="text-muted" style={{ marginBottom: '32px' }}>
        Your session information and ID token claims are below. Rendered from server-side for enhanced security and SEO benefits.
      </p>

      {/* Avatar + Name + Email */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        {user.picture && (
          <img
            src={user.picture}
            alt={user.name}
            width="80"
            height="80"
            style={{ borderRadius: '50%', border: '2px solid #dee2e6' }}
          />
        )}
        <div>
          <h4 style={{ margin: 0 }}>{user.name}</h4>
          <p style={{ margin: 0, color: '#6c757d' }}>{user.email}</p>
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: user.email_verified ? '#d1e7dd' : '#f8d7da',
              color: user.email_verified ? '#0a3622' : '#58151c',
            }}
          >
            {user.email_verified ? 'Email verified' : 'Email not verified'}
          </span>
        </div>
      </div>

      {/* ID Token Claims Table */}
      <h5 style={{ marginBottom: '12px' }}>ID Token Claims</h5>
      <table className="table table-bordered table-sm" style={{ marginBottom: '32px' }}>
        <thead className="table-light">
          <tr>
            <th style={{ width: '35%' }}>Claim</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sub</code></td>
            <td style={{ wordBreak: 'break-all', fontSize: '13px' }}>{user.sub}</td>
          </tr>
          <tr>
            <td><code>name</code></td>
            <td>{user.name}</td>
          </tr>
          <tr>
            <td><code>nickname</code></td>
            <td>{user.nickname}</td>
          </tr>
          <tr>
            <td><code>email</code></td>
            <td>{user.email}</td>
          </tr>
          <tr>
            <td><code>email_verified</code></td>
            <td>{String(user.email_verified)}</td>
          </tr>
          <tr>
            <td><code>updated_at</code></td>
            <td>{new Date(user.updated_at).toLocaleString()}</td>
          </tr>
          {extraClaims.map(([key, value]) => (
            <tr key={key}>
              <td><code>{key}</code></td>
              <td style={{ wordBreak: 'break-all', fontSize: '13px' }}>
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Raw token for reference */}
      <details>
        <summary style={{ cursor: 'pointer', color: '#6c757d', fontSize: '14px', marginBottom: '8px' }}>
          View raw ID token claims
        </summary>
        <pre
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '13px',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(user, null, 2)}
        </pre>
      </details>
    </div>
  );
}
