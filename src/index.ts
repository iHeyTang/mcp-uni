import { InMemoryEventStore, startHTTPServer } from 'mcp-proxy';
import { createServer } from './server.js';

await startHTTPServer({
  createServer: async () => {
    const server = await createServer();
    return server;
  },
  eventStore: new InMemoryEventStore(),
  port: 7200,
  streamEndpoint: '/stream',
});
