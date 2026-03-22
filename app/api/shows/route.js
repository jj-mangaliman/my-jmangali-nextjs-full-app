import { NextResponse } from 'next/server';
import { auth0 } from '../../../lib/auth0';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3001/mcp';

// All tools that exist in the system — used to show what the user cannot access too
const ALL_TOOLS = [
  { name: 'read_logs',         description: 'Read tenant logs',                roles: 'godmode, admin, viewer' },
  { name: 'read_applications', description: 'List registered applications',     roles: 'godmode, admin' },
  { name: 'write_branding',    description: 'Update tenant branding',           roles: 'godmode, editor' },
  { name: 'read_users',        description: 'List users in the tenant',         roles: 'godmode only' },
];

export const GET = async function permissions() {
  try {
    const session = await auth0.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const accessToken = session.tokenSet?.accessToken;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token in session' }, { status: 401 });
    }

    // Connect to MCP server — it will FGA-filter the tool list for this user
    const mcpClient = new Client({ name: 'phoenix-permissions', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL),
      { requestInit: { headers: { Authorization: `Bearer ${accessToken}` } } },
    );
    await mcpClient.connect(transport);

    const { tools: allowedTools } = await mcpClient.listTools();
    await mcpClient.close();

    const allowedNames = allowedTools.map(t => t.name);

    // Merge against the full tool list so we can show denied tools too
    const permissions = ALL_TOOLS.map(tool => ({
      ...tool,
      allowed: allowedNames.includes(tool.name),
    }));

    return NextResponse.json({
      user: session.user.name ?? session.user.email,
      permissions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
