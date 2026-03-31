export const maxDuration = 120;

import { auth0 } from '../../../../lib/auth0';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MIGRATION_SYSTEM_PROMPT = `You are Phoenix, an expert identity and access management migration specialist with deep knowledge of both the Okta API (OIC/OAuth) and the Auth0 Management API v2.

Your task is to analyze an extracted Okta tenant configuration and produce a precise, structured migration mapping to Auth0 equivalents.

## Okta → Auth0 Mapping Reference

### Applications
- Okta OIDC Web App → Auth0 Regular Web Application
- Okta OIDC SPA → Auth0 Single Page Application
- Okta OIDC Native/Mobile → Auth0 Native Application
- Okta SAML 2.0 App → Auth0 Enterprise Connection (SAML) or Regular Web App with SAML addon
- Okta OAuth Service/API → Auth0 Machine-to-Machine (M2M) Application
- Okta Bookmark App → No Auth0 equivalent (link-only launcher)

### Identity Providers
- Okta Social IdP (Google, Facebook, GitHub, etc.) → Auth0 Social Connection
- Okta SAML IdP → Auth0 Enterprise Connection (SAML)
- Okta OIDC IdP → Auth0 Enterprise Connection (OIDC)
- Okta Active Directory / LDAP → Auth0 AD/LDAP Connection

### Policies
- Okta Sign-On Policy (session, MFA rules) → Auth0 Actions (Post-Login) + Tenant session settings
- Okta Password Policy (complexity, history, lockout) → Auth0 Connection-level Password Policy settings
- Okta MFA Enrollment Policy → Auth0 MFA Policies + Guardian configuration
- Okta Access Policy (custom authz server) → Auth0 Actions + API Authorization settings

### Groups & Authorization
- Okta Groups (flat RBAC) → Auth0 Roles
- Okta Groups (multi-tenant segmentation) → Auth0 Organizations
- Okta Group Rules (auto-assignment) → Auth0 Actions (Post-Login, metadata assignment)
- Okta Default Authorization Server → Auth0 Default API (audience)
- Okta Custom Authorization Server → Auth0 Custom API (resource server)
- Custom Okta scopes/claims → Auth0 Custom API scopes + Actions for custom claims

### Hooks / Extensibility
- Okta Inline Hook (Token) → Auth0 Action (Credentials Exchange or Post-Login)
- Okta Inline Hook (Registration) → Auth0 Action (Pre-User-Registration)
- Okta Inline Hook (SAML Assertion) → Auth0 Action (Post-Login with SAML addon)
- Okta Event Hook → Auth0 Log Stream (Webhook type)

### Branding
- Okta Brands / Themes / Custom Domain → Auth0 Universal Login + Branding API + Custom Domains

### Features / Security
- Okta ThreatInsight → Auth0 Attack Protection (Breached Password Detection, Bot Detection, Brute Force Protection)
- Okta Org MFA settings → Auth0 MFA settings (Guardian)
- Okta Session Lifetime settings → Auth0 Tenant session lifetime (idleSessionLifetime, absoluteSessionLifetime)

## Confidence Level Definitions
- **High**: Direct 1:1 equivalent exists; configuration is straightforward with no significant gaps
- **Medium**: Equivalent exists but requires custom Actions code, partial manual work, or has minor feature gaps
- **Low**: Only approximate equivalent; significant rework, feature gaps, or unsupported capabilities expected
- **No Match**: No Auth0 equivalent; must be rebuilt differently or is simply not supported

## Output Instructions

You MUST respond with ONLY a valid JSON object. No markdown fences, no preamble, no trailing text.

**Group by resource type/pattern — do NOT produce one row per instance.** If 12 apps all share the same signOnMode and map to the same Auth0 equivalent, that is ONE row. Include the count and 2-3 representative names. This keeps the output concise and actionable for migration planning. If a category has zero resources extracted, omit it.

Keep every string field to one sentence maximum.

The exact JSON structure:

{
  "summary": "2-3 sentence executive summary of migration scope and complexity",
  "overallComplexity": "Low|Medium|High|Very High",
  "mappings": [
    {
      "category": "Applications|IdPs|Policies|Groups|Authorization Servers|Hooks|Branding|Features",
      "oktaResource": "resource type/pattern and count (e.g. 'OIDC Web Apps (12)', 'SAML 2.0 Apps (3)')",
      "objective": "what this type of Okta resource does and why orgs have it — one plain-language sentence",
      "oktaConfig": "what the configuration for this resource type enables or enforces — one plain-language sentence",
      "auth0Equivalent": "specific Auth0 resource or feature name",
      "auth0Config": "how to configure this in Auth0 — one sentence",
      "confidence": "High|Medium|Low|No Match",
      "rationale": "one sentence — specific reason for this confidence level, naming any gaps or caveats"
    }
  ],
  "gaps": ["specific Okta features or configurations with no Auth0 equivalent"],
  "recommendations": ["3-5 ordered, actionable migration recommendations"]
}`;

// Reduce the extracted payload to key fields only — avoids sending massive raw Okta objects to Claude
function summarizeExtracted(extracted) {
  const pick = (obj, keys) => keys.reduce((acc, k) => { if (obj[k] !== undefined) acc[k] = obj[k]; return acc; }, {});

  return {
    org: extracted.org ? pick(extracted.org, ['id', 'subdomain', 'companyName', 'country', 'status', 'features']) : null,

    apps: (extracted.apps || []).map(a => pick(a, ['id', 'label', 'name', 'status', 'signOnMode', 'credentials'])),

    groups: (extracted.groups || []).map(g => pick(g, ['id', 'type', 'profile'])).map(g => ({
      id: g.id, type: g.type, name: g.profile?.name, description: g.profile?.description,
    })),

    idps: (extracted.idps || []).map(i => pick(i, ['id', 'type', 'name', 'status', 'protocol'])),

    authorizationServers: (extracted.authorizationServers || []).map(s =>
      pick(s, ['id', 'name', 'description', 'audiences', 'status', 'default'])
    ),

    signonPolicies: (extracted.signonPolicies || []).map(p => pick(p, ['id', 'name', 'type', 'status', 'priority'])),
    passwordPolicies: (extracted.passwordPolicies || []).map(p => pick(p, ['id', 'name', 'type', 'status', 'settings'])),
    mfaPolicies: (extracted.mfaPolicies || []).map(p => pick(p, ['id', 'name', 'type', 'status'])),
    accessPolicies: (extracted.accessPolicies || []).map(p => pick(p, ['id', 'name', 'type', 'status'])),

    eventHooks: (extracted.eventHooks || []).map(h => pick(h, ['id', 'name', 'status', 'events'])),
    inlineHooks: (extracted.inlineHooks || []).map(h => pick(h, ['id', 'name', 'status', 'type'])),

    brands: (extracted.brands || []).map(b => pick(b, ['id', 'name', 'isDefault', 'customPrivacyPolicyUrl'])),

    features: (extracted.features || []).map(f => pick(f, ['id', 'type', 'name', 'status', 'stage'])),
  };
}

export async function POST(request) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { extracted, tfContent } = body;

    if (!extracted && !tfContent) {
      return Response.json({ error: 'Either extracted config or tfContent is required' }, { status: 400 });
    }

    const userMessage = tfContent
      ? `Analyze this Okta Terraform configuration (.tf file) and produce the Auth0 migration mapping JSON.\n\nThe input is HashiCorp Configuration Language (HCL). Parse each resource block to identify the Okta resource type and its configuration, then map each to its Auth0 equivalent.\n\nOkta Terraform Configuration:\n${tfContent}`
      : `Analyze this extracted Okta tenant configuration and produce the Auth0 migration mapping JSON.\n\nExtracted Okta Configuration:\n${JSON.stringify(summarizeExtracted(extracted), null, 2)}`;

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 16000,
            system: MIGRATION_SYSTEM_PROMPT,
            messages: [
              { role: 'user', content: userMessage },
            ],
          });

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
            }
            if (event.type === 'message_stop') break;
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`__ERROR__${err.message}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
