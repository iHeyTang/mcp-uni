import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { Prompt, Resource, ResourceTemplate, Tool } from '@modelcontextprotocol/sdk/types.js';
import z from 'zod';
import { sleep } from './utils/utils.js';

export const transportConfigSchema = z.union([
  z.object({
    type: z.literal('sse'),
    url: z.string(),
    query: z.record(z.string(), z.string()),
    headers: z.record(z.string(), z.string()),
  }),
  z.object({
    type: z.literal('stdio'),
    command: z.string(),
    args: z.array(z.string()),
    env: z.record(z.string(), z.string()),
    cwd: z.string(),
  }),
]);

export type TransportConfig = z.infer<typeof transportConfigSchema>;

export interface ConnectedClient {
  name: string;
  client: Client;
  cleanup: () => Promise<void>;
  tools: Tool[];
  prompts: Prompt[];
  resources: Resource[];
  resourceTemplates: ResourceTemplate[];
}

class McpHost {
  private clients: Map<string, ConnectedClient> = new Map();

  constructor() {
    this.clients = new Map();
  }

  async addClient(name: string, transportConfig: TransportConfig) {
    const waitFor = 2500;
    const retries = 3;
    let count = 0;
    let retry = true;

    while (retry) {
      const { client, transport } = createClient(name, transportConfig);
      if (!client || !transport) {
        break;
      }

      try {
        await client.connect(transport, { timeout: 30000 });
        let nextCursor: string | undefined;

        const tools: Tool[] = [];
        while (true) {
          const result = await client.listTools({ cursor: nextCursor });
          nextCursor = result.nextCursor;
          tools.push(...result.tools);
          if (!nextCursor) {
            break;
          }
        }

        nextCursor = undefined;
        const prompts: Prompt[] = [];
        while (true) {
          const result = await client.listPrompts({ cursor: nextCursor });
          nextCursor = result.nextCursor;
          prompts.push(...result.prompts);
          if (!nextCursor) {
            break;
          }
        }

        nextCursor = undefined;
        const resources: Resource[] = [];
        while (true) {
          const result = await client.listResources({ cursor: nextCursor });
          nextCursor = result.nextCursor;
          resources.push(...result.resources);
          if (!nextCursor) {
            break;
          }
        }

        nextCursor = undefined;
        const resourceTemplates: ResourceTemplate[] = [];
        while (true) {
          const result = await client.listResourceTemplates({
            cursor: nextCursor,
          });
          nextCursor = result.nextCursor;
          resourceTemplates.push(...result.resourceTemplates);
          if (!nextCursor) {
            break;
          }
        }

        this.clients.set(name, {
          name,
          client,
          tools,
          resources,
          prompts,
          resourceTemplates,
          cleanup: async () => {
            await transport.close();
          },
        });

        break;
      } catch (error) {
        console.error(`Failed to connect to ${name}:`, error);
        count++;
        retry = count < retries;
        if (retry) {
          try {
            await client.close();
          } catch {}
          console.log(`Retry connection to ${name} in ${waitFor}ms (${count}/${retries})`);
          await sleep(waitFor);
        }
      }
    }
  }

  async removeClient(name: string) {
    const client = this.clients.get(name);
    if (client) {
      await client.cleanup();
      this.clients.delete(name);
    }
  }

  getClient(name: string) {
    return this.clients.get(name);
  }

  getClients() {
    return Array.from(this.clients.values());
  }

  async cleanup() {
    for (const client of this.clients.values()) {
      await client.cleanup();
    }
    this.clients.clear();
  }
}

const createClient = (name: string, transportConfig: TransportConfig): { client: Client | undefined; transport: Transport | undefined } => {
  const transport = createClientTransport(transportConfig);

  const client = new Client({ name, version: '' });
  return { client, transport };
};

const createClientTransport = (transportConfig: TransportConfig) => {
  if (transportConfig.type === 'sse') {
    const searchParams = new URLSearchParams(transportConfig.query);
    return new SSEClientTransport(new URL(`${transportConfig.url}?${searchParams.toString()}`), {
      requestInit: {
        headers: {
          'Content-Type': 'text/event-stream',
          ...transportConfig.headers,
        },
      },
    });
  }

  return new StdioClientTransport({
    command: transportConfig.command,
    args: transportConfig.args,
    env: transportConfig.env,
    cwd: transportConfig.cwd,
  });
};

export const mcpHost = new McpHost();
