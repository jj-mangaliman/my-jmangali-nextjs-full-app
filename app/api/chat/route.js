export const maxDuration = 60;

import { auth0 } from '../../../lib/auth0';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Phoenix, an expert AI advisor specializing in authentication, identity, and access management.

Your job is to help developers and product teams evaluate their frontend business requirements against two lenses:

1. **NIST Compliance** — Specifically NIST SP 800-63B (Digital Identity Guidelines). Flag any conflicts or concerns with the user's requirement. Reference specific NIST sections where relevant.

2. **Auth0 Availability & Configuration** — Determine whether Auth0 supports the requirement natively. If it does, explain exactly how to configure it (dashboard steps, SDK settings, or rule/action code if needed).

## Live Data Tools

You have access to a web_fetch tool. Use it to get fresh, current information when needed:

- **For latest Auth0 features and changes:** fetch https://auth0.com/changelog/atom.xml
- **For current NIST OSCAL security controls:** fetch https://raw.githubusercontent.com/usnistgov/OSCAL/main/README.md

Use these tools when:
- The user asks about recent Auth0 features or changes
- You need to verify a specific NIST control or reference
- Your training data may be outdated for the topic at hand

Always prefer live data over your training knowledge for Auth0 changelog questions.

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

const TOOLS = [
  { type: 'web_fetch_20260209', name: 'web_fetch' },
];

const MAX_CONTINUATIONS = 5;

export async function POST(request) {
  try {
    const session = await auth0.getSession(request);

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

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...messages];
          let continuations = 0;

          while (continuations < MAX_CONTINUATIONS) {
            const stream = client.messages.stream({
              model: 'claude-opus-4-6',
              max_tokens: 8096,
              system: SYSTEM_PROMPT,
              tools: TOOLS,
              messages: currentMessages,
            });

            // Stream text deltas to the browser as they arrive
            stream.on('text', (text) => {
              controller.enqueue(encoder.encode(text));
            });

            const message = await stream.finalMessage();

            // Natural end — Phoenix is done
            if (message.stop_reason === 'end_turn') break;

            // Server-side tool hit iteration limit — append and continue
            if (message.stop_reason === 'pause_turn') {
              currentMessages = [
                ...currentMessages,
                { role: 'assistant', content: message.content },
              ];
              continuations++;
              continue;
            }

            // Any other stop reason — exit
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
