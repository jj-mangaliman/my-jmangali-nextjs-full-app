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

You may have Auth0 management tools available. These come exclusively from the MCP server named auth0-management and will appear in your tool list prefixed as "auth0-management_". Examples: auth0-management_read_logs, auth0-management_read_users.

**You do NOT have — and must NEVER claim to have — any of the following:**
- bash_code_execution, text_editor_code_execution, code_execution, or any code/shell execution tools
- Any auth0-management tool not currently in your tool list

**CRITICAL RULES:**
1. At the start of every conversation, note exactly which auth0-management_* tools appear in your tool list. That list is fixed for the session — do not revise it mid-conversation.
2. Only call a tool that is in your tool list. Never call a tool you are not certain exists.
3. Once you have established what tools you have, do not contradict yourself in later messages.
4. If the user asks for something you have no tool for, say once: "I don't have access to that for your current role." Do not keep re-checking or changing your answer.
5. When describing what you can do with tenant tools, ONLY list the specific tools in your tool list. Never infer or fabricate additional capabilities beyond what is explicitly in your tool list. Do not describe what the Auth0 Management API can do in general — only describe what YOUR tools can do.

If you have no auth0-management_* tools at all, tell the user: "Your role does not have permission to access tenant management tools."

## Knowledge Scope

Answer from your training knowledge. You have strong coverage of Auth0 features, NIST SP 800-63B, NIST SP 800-53, NIST CSF 2.0, and NIST SP 800-218. For questions about very recent Auth0 changes (last few months), note that your knowledge may not include the latest updates and recommend the user check https://auth0.com/changelog directly.

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
    const rawName = session.user?.given_name || session.user?.name || '';
    const userName = rawName.includes('@') ? rawName.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : rawName || 'there';

    const mcpServers = accessToken ? [{
      type: 'url',
      url: MCP_SERVER_URL,
      name: 'auth0-management',
      authorization_token: accessToken,
    }] : [];

    // On the first message of a conversation, greet the user by name.
    // Do NOT declare tenant tools upfront — only surface them if the question
    // is about the tenant. For NIST or Auth0 config questions, just answer.
    const isFirstMessage = messages.length === 1;
    const openingInstruction = isFirstMessage
      ? `\n\n## Opening Greeting (first message only)\nThe user's name is ${userName}. Start your response with a brief, warm greeting: "Hi ${userName}!" — then answer their question naturally. Only mention tenant management tools if their question is specifically about their Auth0 tenant state (e.g. asking about their users, logs, applications, or branding). Do not mention tools for NIST questions, Auth0 configuration questions, or general advisory questions.`
      : '';

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
              system: SYSTEM_PROMPT + openingInstruction,
              ...(mcpServers.length > 0 && { mcp_servers: mcpServers }),
              messages: currentMessages,
              ...(mcpServers.length > 0 && { betas: ['mcp-client-2025-04-04'] }),
            });

            let stopReason = null;

            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                controller.enqueue(encoder.encode(event.delta.text));
              }
              if (event.type === 'message_delta') {
                stopReason = event.delta?.stop_reason;
              }
              if (event.type === 'message_stop') break;
            }

            console.log(`[chat] stop_reason: ${stopReason}`);

            if (stopReason === 'end_turn' || !stopReason) break;

            // Server-side tool hit iteration limit — append and continue
            if (stopReason === 'pause_turn') {
              console.log(`[chat] pause_turn — continuation ${continuations + 1}`);
              const accumulated = await stream.finalMessage().catch(() => null);
              if (accumulated) {
                currentMessages = [
                  ...currentMessages,
                  { role: 'assistant', content: accumulated.content },
                ];
              }
              continuations++;
              continue;
            }

            console.log(`[chat] unexpected stop_reason — exiting loop`);
            break;
          }
        } catch (err) {
          console.error('[chat] stream error:', err?.message || err);
          controller.enqueue(encoder.encode(`\n\n**Phoenix encountered an error:** ${err?.message || 'Unknown error'}. Please try again.`));
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
