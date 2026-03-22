export const maxDuration = 60;

import { auth0 } from '../../../lib/auth0';
import Anthropic from '@anthropic-ai/sdk';
import { mcpTools } from '@anthropic-ai/sdk/helpers/beta/mcp';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3001/mcp';

const SYSTEM_PROMPT = `You are Phoenix, an expert AI advisor specializing in authentication, identity, and access management.

Your job is to help developers and product teams evaluate their frontend business requirements against two lenses:

1. **NIST Compliance** — Specifically NIST SP 800-63B (Digital Identity Guidelines). Flag any conflicts or concerns with the user's requirement. Reference specific NIST sections where relevant.

2. **Auth0 Availability & Configuration** — Determine whether Auth0 supports the requirement natively. If it does, explain exactly how to configure it (dashboard steps, SDK settings, or rule/action code if needed).

## Auth0 Tenant Management Tools

You also have direct access to the user's Auth0 tenant via management tools. Use these when the user asks about their actual tenant state — not general Auth0 knowledge.

Available management tools (subject to the user's role permissions — you will only see tools your current user is allowed to call):

- **read_logs** — Fetch recent Auth0 tenant logs. Use when the user asks about recent activity, errors, or login events.
- **read_users** — List users in the tenant. Use when the user asks about their user base.
- **read_applications** — List registered Auth0 applications. Use when the user asks what apps are configured.
- **write_branding** — Update tenant logo, primary colour, or page background colour. Use when the user asks to change how the login page looks.

If a tool call is refused (not in your available tools), tell the user clearly: "Your role does not have permission to perform that action."

## Live Data Tools

You have access to a web_fetch tool. Use it to get fresh, current information when needed.

**IMPORTANT: Fetch a maximum of ONE source per response. Pick the single most relevant source for the question and fetch only that.**

Available sources — choose the most relevant one:

- **Auth0 changelog** (use when asked about recent Auth0 features or changes): https://auth0.com/changelog
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

async function connectMcpClient(accessToken) {
  const mcpClient = new Client({ name: 'phoenix', version: '1.0.0' });
  try {
    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL),
      { requestInit: { headers: { Authorization: `Bearer ${accessToken}` } } },
    );
    await mcpClient.connect(transport);
    return mcpClient;
  } catch (err) {
    console.warn('[chat] MCP server unavailable — management tools disabled:', err.message);
    return null;
  }
}

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

    // Get the user's Auth0 access token to pass to the MCP server.
    // The MCP server validates this token and uses it to check FGA permissions.
    const accessToken = session.tokenSet?.accessToken;

    // Connect to MCP server (gracefully degrades if server is down)
    const mcpClient = accessToken ? await connectMcpClient(accessToken) : null;

    // Get the tools this user is permitted to call (FGA-filtered by the MCP server)
    let managementTools = [];
    if (mcpClient) {
      try {
        const { tools } = await mcpClient.listTools();
        managementTools = mcpTools(tools, mcpClient);
        console.log(`[chat] MCP tools available: ${tools.map(t => t.name).join(', ') || 'none'}`);
      } catch (err) {
        console.warn('[chat] Failed to list MCP tools:', err.message);
      }
    }

    const allTools = [
      { type: 'web_fetch_20260209', name: 'web_fetch' },
      ...managementTools,
    ];

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...messages];
          let continuations = 0;

          while (continuations < MAX_CONTINUATIONS) {
            // toolRunner handles the tool_use loop automatically for MCP tools.
            // web_fetch is server-side and handled transparently by the Anthropic API.
            const runner = client.beta.messages.toolRunner({
              model: 'claude-opus-4-6',
              max_tokens: 8096,
              system: SYSTEM_PROMPT,
              tools: allTools,
              messages: currentMessages,
            });

            runner.on('text', (text) => {
              controller.enqueue(encoder.encode(text));
            });

            const message = await runner.finalMessage();

            console.log(`[chat] stop_reason: ${message.stop_reason}`);

            // Natural end — Phoenix is done
            if (message.stop_reason === 'end_turn') break;

            // Server-side tool (web_fetch) hit iteration limit — append and continue
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
          if (mcpClient) {
            try { await mcpClient.close(); } catch {}
          }
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
