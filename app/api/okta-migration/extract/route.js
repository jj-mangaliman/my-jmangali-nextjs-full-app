export const maxDuration = 60;

import { auth0 } from '../../../../lib/auth0';

async function oktaGet(domain, token, path) {
  const res = await fetch(`https://${domain}${path}`, {
    headers: {
      'Authorization': `SSWS ${token}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

const ENDPOINTS = [
  { key: 'org',                 path: '/api/v1/org' },
  { key: 'apps',                path: '/api/v1/apps?limit=200' },
  { key: 'groups',              path: '/api/v1/groups?limit=200' },
  { key: 'idps',                path: '/api/v1/idps?limit=200' },
  { key: 'authorizationServers',path: '/api/v1/authorizationServers?limit=200' },
  { key: 'signonPolicies',      path: '/api/v1/policies?type=OKTA_SIGN_ON&limit=200' },
  { key: 'passwordPolicies',    path: '/api/v1/policies?type=PASSWORD&limit=200' },
  { key: 'mfaPolicies',         path: '/api/v1/policies?type=MFA_ENROLL&limit=200' },
  { key: 'accessPolicies',      path: '/api/v1/policies?type=ACCESS_POLICY&limit=200' },
  { key: 'eventHooks',          path: '/api/v1/eventHooks' },
  { key: 'inlineHooks',         path: '/api/v1/inlineHooks' },
  { key: 'brands',              path: '/api/v1/brands' },
  { key: 'features',            path: '/api/v1/features?limit=200' },
];

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const domain = process.env.OKTA_DOMAIN;
    const token = process.env.OKTA_API_TOKEN;

    if (!domain || !token) {
      return Response.json(
        { error: 'OKTA_DOMAIN and OKTA_API_TOKEN must be set in environment variables' },
        { status: 500 }
      );
    }

    const results = await Promise.allSettled(
      ENDPOINTS.map(({ path }) => oktaGet(domain, token, path))
    );

    const extracted = {};
    const errors = {};

    results.forEach((result, i) => {
      const { key } = ENDPOINTS[i];
      if (result.status === 'fulfilled') {
        extracted[key] = result.value;
      } else {
        errors[key] = result.reason?.message || 'unknown error';
      }
    });

    return Response.json({
      extracted,
      errors,
      domain,
      extractedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
