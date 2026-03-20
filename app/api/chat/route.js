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

- **For latest Auth0 features and changes:** fetch https://auth0.com/changelog
- **For NIST SP 800-53 rev5 security controls (access control, authentication, audit, etc.):** fetch https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_MODERATE-baseline-resolved-profile_catalog.json
- **For NIST SP 800-63B digital identity guidelines (authentication assurance levels, credential management):** fetch https://raw.githubusercontent.com/usnistgov/800-63-3/master/sp800-63b.md
- **For NIST CSF 2.0 (Cybersecurity Framework — identify, protect, detect, respond, recover):** fetch https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/CSF/v2.0/json/NIST_CSF_v2.0_catalog.json
- **For NIST SP 800-218 v1 (Secure Software Development Framework — SSDF):** fetch https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-218/ver1/json/NIST_SP800-218_ver1_catalog.json

Use these tools when:
- The user asks about recent Auth0 features or changes
- You need to verify a specific NIST control or reference
- Your training data may be outdated for the topic at hand

Always fetch live data before answering any question about Auth0 features, recent changes, or current NIST controls. Do not rely on training data alone for these topics — fetch first, then answer.

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

            console.log(`[chat] stop_reason: ${message.stop_reason}`);
            console.log(`[chat] content blocks: ${JSON.stringify(message.content.map(b => b.type))}`);

            // Natural end — Phoenix is done
            if (message.stop_reason === 'end_turn') break;

            // Server-side tool hit iteration limit — append and continue
            if (message.stop_reason === 'pause_turn') {
              console.log(`[chat] pause_turn hit — continuation ${continuations + 1}`);
              currentMessages = [
                ...currentMessages,
                { role: 'assistant', content: message.content },
              ];
              continuations++;
              continue;
            }

            // Any other stop reason — exit
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
