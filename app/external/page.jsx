'use client';

import { useState, useEffect } from 'react';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';

export default function Permissions() {
  const [state, setState] = useState({ isLoading: true, data: null, error: null });

  useEffect(() => {
    fetch('/api/shows')
      .then(res => res.json())
      .then(data => setState({ isLoading: false, data, error: null }))
      .catch(error => setState({ isLoading: false, data: null, error }));
  }, []);

  const { isLoading, data, error } = state;

  return (
    <div data-testid="permissions">
      <div className="mb-5">
        <h1 data-testid="permissions-title">My Permissions</h1>
        <p className="lead">
          What your role allows you to do in tenant <strong>{data?.tenant ?? '...'}</strong> — enforced by{' '}
          <a href="https://play.fga.dev/" target="_blank" rel="noreferrer">Auth0 FGA</a> at the{' '}
          <a href="https://docs.fga.dev/authorization-concepts#what-is-relationship-based-access-control" target="_blank" rel="noreferrer">MCP server layer</a>.
        </p>
      </div>

      {isLoading && <Loading />}

      {error && <ErrorMessage>{error.message}</ErrorMessage>}

      {data && !data.error && (() => {
        const hasAccess = data.permissions?.some(t => t.allowed);
        if (!hasAccess) {
          return (
            <div className="text-center py-5">
              <p style={{ fontSize: '2rem' }}>💬</p>
              <h4>You have access to ask Phoenix questions!</h4>
              <p className="text-muted">
                Your role does not include direct tenant management tools, but Phoenix can still help you with NIST compliance, Auth0 configuration guidance, and authentication design questions.
              </p>
              <a href="/askphoenix" className="btn btn-primary mt-2">Ask Phoenix</a>
            </div>
          );
        }
        return (
          <>
            <p className="text-muted mb-4">
              Logged in as <strong>{data.user}</strong>
            </p>
            <table className="table" data-testid="permissions-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>What it does</th>
                  <th>Who can use it</th>
                  <th>You</th>
                </tr>
              </thead>
              <tbody>
                {data.permissions.map(tool => (
                  <tr key={tool.name}>
                    <td><code>{tool.name}</code></td>
                    <td>{tool.description}</td>
                    <td><small className="text-muted">{tool.roles}</small></td>
                    <td>
                      {tool.allowed
                        ? <span style={{ color: '#28a745', fontWeight: 600 }}>✓ Allowed</span>
                        : <span style={{ color: '#dc3545' }}>✗ Denied</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
      })()}

      {data?.error && (
        <div className="text-center py-5">
          <p style={{ fontSize: '2rem' }}>💬</p>
          <h4>You have access to ask Phoenix questions!</h4>
          <p className="text-muted">
            Your role does not include direct tenant management tools, but Phoenix can still help you with NIST compliance, Auth0 configuration guidance, and authentication design questions.
          </p>
          <a href="/askphoenix" className="btn btn-primary mt-2">Ask Phoenix</a>
        </div>
      )}
    </div>
  );
}
