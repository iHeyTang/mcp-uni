import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { mcpHost, TransportConfig, transportConfigSchema } from './host.js';
import { toZodRawShape } from './utils/schema-converter.js';

const connectMcpInputSchema = {
  name: z.string().describe('The name of the MCP server to connect to'),
  transportConfig: transportConfigSchema.describe('The transport config of the MCP server to connect to'),
};

const disconnectMcpInputSchema = {
  name: z.string().describe('The name of the MCP server to disconnect from'),
};

export type McpUniConfig = {
  mcpServers: Record<string, TransportConfig>;
};

export const createServer = async (config?: McpUniConfig | null) => {
  const server = new McpServer({
    name: 'mcp-uni',
    version: '0.1.0',
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  if (config?.mcpServers) {
    console.log('Loading MCP servers from config...');
    for (const [name, transportConfig] of Object.entries(config.mcpServers)) {
      console.log(`Loading MCP server: ${name}`);
      await mcpHost.addClient(name, transportConfig);
    }
  }

  server.tool('connect_mcp', 'Connect a MCP server to the host', connectMcpInputSchema, async args => {
    const { name, transportConfig } = args;
    await mcpHost.addClient(name, transportConfig);
    server.sendToolListChanged();
    return {
      content: [{ type: 'text', text: `Connected MCP server: ${name}` }],
    };
  });

  server.tool('disconnect_mcp', 'Disconnect a MCP server from the host', disconnectMcpInputSchema, async args => {
    const { name } = args;
    await mcpHost.removeClient(name);
    return {
      content: [{ type: 'text', text: `Disconnected MCP server: ${name}` }],
    };
  });

  server.tool('list_mcp', 'List all MCP servers', {}, async () => {
    const clients = mcpHost.getClients();
    return {
      content: [{ type: 'text', text: `List of MCP servers: ${clients.map(c => c.name).join(', ')}` }],
    };
  });

  for (const tool of mcpHost.getClients().flatMap(c => c.tools)) {
    const inputSchema = toZodRawShape(tool.inputSchema);
    server.tool(tool.name, tool.description || '', inputSchema, async args => {
      try {
        const client = mcpHost.getClients().find(c => c.tools.find(t => t.name === tool.name));
        if (!client) {
          throw new Error(`Unknown tool: ${tool.name}`);
        }
        return (await client.client.callTool({
          name: tool.name,
          arguments: args,
        })) as any;
      } catch (error) {
        console.error(`Error calling tool ${tool.name}:`, error);
        throw error;
      }
    });
  }

  for (const prompt of mcpHost.getClients().flatMap(c => c.prompts)) {
    const inputSchema = toZodRawShape(prompt.arguments);
    server.prompt(prompt.name, prompt.description || '', inputSchema, async args => {
      const client = mcpHost.getClients().find(c => c.prompts.find(p => p.name === prompt.name));
      if (!client) {
        throw new Error(`Unknown prompt: ${prompt.name}`);
      }
      return client.client.getPrompt({ name: prompt.name });
    });
  }

  for (const resource of mcpHost.getClients().flatMap(c => c.resources)) {
    server.resource(resource.name, resource.uri, resource, async args => {
      const client = mcpHost.getClients().find(c => c.resources.find(r => r.name === resource.name));
      if (!client) {
        throw new Error(`Unknown resource: ${resource.name}`);
      }
      return client.client.readResource({ uri: resource.uri });
    });
  }

  for (const resourceTemplate of mcpHost.getClients().flatMap(c => c.resourceTemplates)) {
    server.resource(resourceTemplate.name, resourceTemplate.uriTemplate, resourceTemplate, async args => {
      const client = mcpHost.getClients().find(c => c.resourceTemplates.find(r => r.name === resourceTemplate.name));
      if (!client) {
        throw new Error(`Unknown resource template: ${resourceTemplate.name}`);
      }
      return client.client.readResource({ uri: resourceTemplate.uriTemplate });
    });
  }

  return server;
};
