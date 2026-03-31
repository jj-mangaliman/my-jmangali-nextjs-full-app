'use client';

import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import Loading from '../../components/Loading';

const CONFIDENCE_STYLE = {
  'High':     { background: '#d1fae5', borderColor: '#10b981', color: '#065f46' },
  'Medium':   { background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' },
  'Low':      { background: '#fee2e2', borderColor: '#ef4444', color: '#7f1d1d' },
  'No Match': { background: '#f3f4f6', borderColor: '#9ca3af', color: '#374151' },
};

const COMPLEXITY_COLOR = {
  'Low':       '#10b981',
  'Medium':    '#f59e0b',
  'High':      '#ef4444',
  'Very High': '#7c3aed',
};

const ENDPOINT_LABELS = {
  apps:                 'Applications',
  groups:               'Groups',
  idps:                 'Identity Providers',
  authorizationServers: 'Auth Servers',
  signonPolicies:       'Sign-On Policies',
  passwordPolicies:     'Password Policies',
  mfaPolicies:          'MFA Policies',
  accessPolicies:       'Access Policies',
  eventHooks:           'Event Hooks',
  inlineHooks:          'Inline Hooks',
  brands:               'Brands',
  features:             'Features',
};

export default function OktaMigrationPage() {
  const { user, isLoading } = useUser();
  const [extracting, setExtracting]     = useState(false);
  const [analyzing, setAnalyzing]       = useState(false);
  const [extracted, setExtracted]       = useState(null);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);
  const [filterCategory, setFilterCategory]       = useState('All');
  const [filterConfidence, setFilterConfidence]   = useState('All');

  if (isLoading) return <Loading />;

  async function runExtract() {
    setExtracting(true);
    setError(null);
    setExtracted(null);
    setResult(null);
    try {
      const res = await fetch('/api/okta-migration/extract');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setExtracted(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/okta-migration/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extracted: extracted.extracted }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      if (raw.includes('__ERROR__')) {
        throw new Error(raw.replace('__ERROR__', ''));
      }

      let mapping;
      try {
        mapping = JSON.parse(raw);
      } catch {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          mapping = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Phoenix returned unparseable output. Try again.');
        }
      }

      setResult(mapping);
      setFilterCategory('All');
      setFilterConfidence('All');
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function downloadMapping() {
    if (!result) return;
    const lines = [
      `# Okta → Auth0 Migration Mapping`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `## Summary`,
      result.summary,
      ``,
      `**Overall Complexity:** ${result.overallComplexity}`,
      ``,
      `## Mappings`,
      ``,
      `| Category | Okta Resource | Objective & Intent | Auth0 Equivalent | Confidence | Rationale |`,
      `|---|---|---|---|---|---|`,
      ...(result.mappings || []).map(m =>
        `| ${m.category} | ${m.oktaResource} | ${m.objective || ''} | ${m.auth0Equivalent} | ${m.confidence} | ${m.rationale} |`
      ),
      ``,
      `## Gaps`,
      ...(result.gaps || []).map(g => `- ${g}`),
      ``,
      `## Recommendations`,
      ...(result.recommendations || []).map((r, i) => `${i + 1}. ${r}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okta-auth0-migration-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summaryEntries = extracted?.extracted
    ? Object.entries(ENDPOINT_LABELS)
        .map(([key, label]) => {
          const val = extracted.extracted[key];
          const count = Array.isArray(val) ? val.length : val ? 1 : 0;
          return { label, count };
        })
        .filter(({ count }) => count > 0)
    : [];

  const categories      = result ? ['All', ...new Set(result.mappings.map(m => m.category))] : ['All'];
  const confidenceLevels = ['All', 'High', 'Medium', 'Low', 'No Match'];

  const filteredMappings = (result?.mappings || []).filter(m => {
    const catOk  = filterCategory === 'All'  || m.category   === filterCategory;
    const confOk = filterConfidence === 'All' || m.confidence === filterConfidence;
    return catOk && confOk;
  });

  const complexityColor = COMPLEXITY_COLOR[result?.overallComplexity] || '#6c757d';

  return (
    <>
      <style>{`
        .mig-page { padding: 24px 32px; max-width: 1400px; margin: 0 auto; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin: 16px 0 20px; }
        .summary-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; text-align: center; }
        .summary-card .count { font-size: 1.75rem; font-weight: 700; }
        .summary-card .label { font-size: 0.72rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
        .mig-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .mig-table th { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px 12px; text-align: left; font-weight: 600; white-space: nowrap; }
        .mig-table td { border: 1px solid #dee2e6; padding: 10px 12px; vertical-align: top; }
        .badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; border: 1px solid; }
        .filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
        .filter-bar select { padding: 4px 8px; border: 1px solid #dee2e6; border-radius: 4px; font-size: 0.85rem; }
        @media (max-width: 768px) { .mig-page { padding: 16px; } .mig-table { font-size: 0.78rem; } }
      `}</style>

      <div className="mig-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <h2 style={{ margin: 0 }}>Okta → Auth0 Migration</h2>
          {result && (
            <button className="btn btn-outline-secondary btn-sm" onClick={downloadMapping}>
              ↓ Download mapping
            </button>
          )}
        </div>
        <p className="text-muted" style={{ marginBottom: '24px' }}>
          Extract your Okta tenant configuration and let Phoenix map each resource to its Auth0 equivalent —
          with confidence levels and rationale for each mapping.
        </p>

        {/* Step 1 — Extract */}
        <div style={{ marginBottom: '20px' }}>
          <button
            className="btn btn-primary"
            onClick={runExtract}
            disabled={extracting || analyzing}
            style={{ backgroundColor: '#ffb700', borderColor: '#ffb700', color: '#000', fontWeight: 600 }}
          >
            {extracting ? 'Extracting...' : extracted ? 'Re-extract from Okta' : 'Extract Okta Configuration'}
          </button>
          {extracting && (
            <span className="text-muted" style={{ marginLeft: '12px', fontSize: '0.85rem' }}>
              Reading apps, groups, policies, IdPs, hooks, branding from your Okta org...
            </span>
          )}
        </div>

        {/* Extraction results */}
        {extracted && (
          <div style={{ marginBottom: '24px' }}>
            <h5 style={{ marginBottom: '4px' }}>
              Extracted from <code>{extracted.domain}</code>{' '}
              <small className="text-muted" style={{ fontWeight: 400 }}>
                {new Date(extracted.extractedAt).toLocaleString()}
              </small>
            </h5>

            <div className="summary-grid">
              {summaryEntries.map(({ label, count }) => (
                <div key={label} className="summary-card">
                  <div className="count">{count}</div>
                  <div className="label">{label}</div>
                </div>
              ))}
            </div>

            {Object.keys(extracted.errors || {}).length > 0 && (
              <div className="alert alert-warning" style={{ fontSize: '0.82rem', marginBottom: '12px' }}>
                <strong>Some endpoints failed:</strong> {Object.entries(extracted.errors).map(([k, v]) => `${k} (${v})`).join(' · ')}
              </div>
            )}

            {/* Step 2 — Analyze */}
            <button
              className="btn btn-dark"
              onClick={runAnalysis}
              disabled={analyzing || extracting}
            >
              {analyzing ? 'Phoenix is analyzing...' : 'Generate Auth0 Mapping'}
            </button>
            {analyzing && (
              <span className="text-muted" style={{ marginLeft: '12px', fontSize: '0.85rem' }}>
                Phoenix is reviewing your Okta config against Auth0 Management v2 — this may take 20–40 seconds...
              </span>
            )}
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Mapping results */}
        {result && (
          <div>
            {/* Summary card */}
            <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ margin: 0 }}>Migration Summary</h5>
                <span className="badge" style={{ background: complexityColor + '22', borderColor: complexityColor, color: complexityColor, fontSize: '0.82rem', padding: '4px 12px' }}>
                  {result.overallComplexity} Complexity
                </span>
              </div>
              <p style={{ margin: 0, color: '#495057' }}>{result.summary}</p>
            </div>

            {/* Confidence legend */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {Object.entries(CONFIDENCE_STYLE).map(([level, s]) => (
                <span key={level} className="badge" style={s}>{level}</span>
              ))}
            </div>

            {/* Filters */}
            <div className="filter-bar">
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter:</span>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={filterConfidence} onChange={e => setFilterConfidence(e.target.value)}>
                {confidenceLevels.map(c => <option key={c}>{c}</option>)}
              </select>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                {filteredMappings.length} of {result.mappings.length} mappings
              </span>
            </div>

            {/* Mapping table */}
            <div style={{ overflowX: 'auto', marginBottom: '28px' }}>
              <table className="mig-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Okta Resource</th>
                    <th>Objective & Intent</th>
                    <th>Okta Config</th>
                    <th>Auth0 Equivalent</th>
                    <th>Auth0 Config</th>
                    <th>Confidence</th>
                    <th>Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMappings.map((m, i) => {
                    const s = CONFIDENCE_STYLE[m.confidence] || CONFIDENCE_STYLE['No Match'];
                    return (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.category}</td>
                        <td>{m.oktaResource}</td>
                        <td style={{ fontSize: '0.8rem' }}>{m.objective}</td>
                        <td style={{ color: '#6c757d', fontSize: '0.8rem' }}>{m.oktaConfig}</td>
                        <td>{m.auth0Equivalent}</td>
                        <td style={{ color: '#6c757d', fontSize: '0.8rem' }}>{m.auth0Config}</td>
                        <td>
                          <span className="badge" style={s}>{m.confidence}</span>
                        </td>
                        <td style={{ color: '#6c757d', fontSize: '0.8rem' }}>{m.rationale}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Gaps */}
            {result.gaps?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h5>Gaps — No Auth0 Equivalent</h5>
                <ul style={{ color: '#495057', paddingLeft: '20px' }}>
                  {result.gaps.map((g, i) => <li key={i} style={{ marginBottom: '4px' }}>{g}</li>)}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h5>Recommendations</h5>
                <ol style={{ color: '#495057', paddingLeft: '20px' }}>
                  {result.recommendations.map((r, i) => <li key={i} style={{ marginBottom: '4px' }}>{r}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
