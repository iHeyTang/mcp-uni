#!/usr/bin/env node

import { Command } from 'commander';
import { InMemoryEventStore, startHTTPServer } from 'mcp-proxy';
import { createServer } from './server.js';

const program = new Command();

program
  .name('mcp-uni')
  .description('MCP Universal Server - A unified gateway for managing multiple MCP servers')
  .version('0.1.0')
  .option('-p, --port <number>', 'Port to listen on', '7200')
  .option('-s, --stream <path>', 'Stream endpoint path', '/stream')
  .parse();

const options = program.opts();
const port = parseInt(options.port);

if (isNaN(port) || port < 1 || port > 65535) {
  console.error('Error: Port must be a valid number between 1 and 65535');
  process.exit(1);
}

console.log(`Starting MCP-UNI server on http://localhost:${port}`);
console.log(`Stream endpoint available at http://localhost:${port}${options.stream}`);

await startHTTPServer({
  createServer: async () => {
    const server = await createServer();
    return server;
  },
  eventStore: new InMemoryEventStore(),
  port,
  streamEndpoint: options.stream,
});
