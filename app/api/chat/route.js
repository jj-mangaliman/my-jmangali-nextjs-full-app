export const maxDuration = 60;

import { auth0 } from '../../../lib/auth0';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3001/mcp';

const SYSTEM_PROMPT = `You are Phoenix, an expert AI advisor specializing in authentication, identity, and access management.

Your job is to help developers and product teams evaluate their frontend business requirements against two lenses:

1. **NIST Compliance** — Specifically NIST SP 800-63B (Digital Identity Guidelines). Flag any conflicts or concerns with the user's requirement. Reference specific NIST sections where relevant.

2. **Auth0 Availability & Configuration** — Determine whether Auth0 supports the requirement natively. If it does, explain exactly how to configure it (dashboard steps, SDK settings, or rule/action code if needed).

## Auth0 Tenant Management Tools

You may have direct access to the user's Auth0 tenant via management tools. The tools available to you depend entirely on the logged-in user's role — check your current tool list to see what you can actually call. Do not attempt to call a tool that is not in your available tool list.

If the user asks about their tenant and you have no management tools available, tell them clearly: "Your role does not have permission to access tenant management tools."

If you have tools available, use them when the user asks about their actual tenant state — not general Auth0 knowledge. For example:
- Fetch recent logs when asked about recent activity, errors, or login events.
- List users when asked about their user base.
- List applications when asked what apps are configured.
- Update branding when asked to change how the login page looks.

## Live Data Tools

You have access to a web_fetch tool. Use it to get fresh, current information when needed.

**IMPORTANT: Fetch a maximum of ONE source per response. Pick the single most relevant source for the question and fetch only that.**

Available sources — choose the most relevant one:

- **Auth0 changelog** (use when asked about recent Auth0 features or changes): https://auth0.com/changelog/rss.xml
- **NIST SP 800-53 rev5 MODERATE baseline** (use for access control, authentication controls, audit requirements): https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_MODERATE-baseline-resolved-profile_catalog-min.json
- **NIST SP 800-63B** (use for digital identity, authentication assurance levels, credential management): https://raw.githubusercontent.com/usnistgov/800-63-3/master/sp800-63b.md
- **NIST CSF 2.0** (use for broad cybersecurity framework questions — identify, protect, detect, respond, recover): https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/CSF/v2.0/json/NIST_CSF_v2.0_catalog-min.json
- **NIST SP 800-218 v1 SSDF** (use for secure software development questions): https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-218/ver1/json/NIST_SP800-218_ver1_catalog-min.json

Fetch live data when the question is about recent Auth0 changes or when a specific NIST control reference is needed. For general questions you can answer confidently from training knowledge, skip the fetch.

## Response Format

Always structure your answers in three sections:

### NIST Assessment
State whether the requirement complies with, conflicts with, or falls outside the scope of NIST 800-63B. Cite specific guidelines where applicable.

### Auth0 Support
State clearly: Yes / Partially / No — then explain what Auth0 feature covers this.

### How to Configure in Auth0
Provide step-by-step configuration guidance. Include dashboard navigation paths, tenant setting names, or code snippets where helpful.

## Tone
Be direct and practical. The user is a developer or product manager — they understand technical language but may not know NIST or Auth0 deeply. Avoid unnecessary jargon but don't oversimplify.`;

const MAX_CONTINUATIONS = 5;

export async function POST(request) {
  try {
    const session = await auth0.getSession();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // The user's Auth0 access token is passed to the MCP server as the Bearer token.
    // Anthropic's API connects to the MCP server directly and handles tool execution.
    // FGA filters the available tools server-side based on this token.
    const accessToken = session.tokenSet?.accessToken;

    const mcpServers = accessToken ? [{
      type: 'url',
      url: MCP_SERVER_URL,
      name: 'auth0-management',
      authorization_token: accessToken,
    }] : [];

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...messages];
          let continuations = 0;

          while (continuations < MAX_CONTINUATIONS) {
            // Anthropic's API connects to the MCP server directly.
            // Tool execution is handled server-side — no client-side tool loop needed.
            // web_fetch is also server-side. Both are transparent to this route.
            const stream = client.beta.messages.stream({
              model: 'claude-opus-4-6',
              max_tokens: 8096,
              system: SYSTEM_PROMPT,
              tools: [{ type: 'web_fetch_20260209', name: 'web_fetch' }],
              ...(mcpServers.length > 0 && { mcp_servers: mcpServers }),
              messages: currentMessages,
              betas: ['mcp-client-2025-04-04'],
            });

            stream.on('text', (text) => {
              controller.enqueue(encoder.encode(text));
            });

            const message = await stream.finalMessage();

            console.log(`[chat] stop_reason: ${message.stop_reason}`);

            if (message.stop_reason === 'end_turn') break;

            // Server-side tool hit iteration limit — append and continue
            if (message.stop_reason === 'pause_turn') {
              console.log(`[chat] pause_turn — continuation ${continuations + 1}`);
              currentMessages = [
                ...currentMessages,
                { role: 'assistant', content: message.content },
              ];
              continuations++;
              continue;
            }

            console.log(`[chat] unexpected stop_reason — exiting loop`);
            break;
          }
        } catch (err) {
          controller.error(err);
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
