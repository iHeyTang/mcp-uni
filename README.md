# MCP-UNI

**MCP-UNI** is a Model Context Protocol (MCP) universal server that acts as a unified gateway for connecting and managing multiple MCP servers. It provides a single HTTP endpoint to dynamically connect, disconnect, and interact with various MCP servers without requiring static configuration.

## Features

- 🔌 **Dynamic MCP Server Management**: Connect and disconnect MCP servers at runtime
- 🌐 **HTTP Server Interface**: RESTful API with Server-Sent Events (SSE) support
- 🔗 **Multiple Transport Support**: Supports both SSE and stdio transports
- 🛠️ **Tool Aggregation**: Exposes all connected MCP server tools through a unified interface
- 📚 **Resource Management**: Access resources and resource templates from connected servers
- 💬 **Prompt Management**: Manage prompts across multiple MCP servers
- 🔄 **Auto-retry**: Built-in retry mechanism for connection failures
- 📋 **Real-time Updates**: Dynamic tool list updates when servers connect/disconnect

## Architecture

MCP-UNI acts as a proxy/gateway between clients and multiple MCP servers:

```
Client ──HTTP/SSE──> MCP-UNI ──stdio/SSE──> MCP Server 1
                        │
                        ├─────stdio/SSE──> MCP Server 2
                        │
                        └─────stdio/SSE──> MCP Server N
```

## Installation

### Using npx (Recommended)

```bash
npx mcp-uni
```

### From npm (Coming Soon)

```bash
npm install -g mcp-uni
```

### From Source

```bash
git clone https://github.com/yourusername/mcp-uni.git
cd mcp-uni
npm install
npm run build
```

## Quick Start

1. **Start the MCP-UNI server**:

   ```bash
   # Using npx (no installation required)
   npx mcp-uni

   # With custom port
   npx mcp-uni --port 8000

   # Or if installed globally
   mcp-uni
   mcp-uni --port 8000
   ```

   The server will start on `http://localhost:7200` (or your specified port) with SSE endpoint at `/stream`.

2. **Connect an MCP server**:

   ```bash
   curl -X POST http://localhost:7200/tools/connect_mcp \
     -H "Content-Type: application/json" \
     -d '{
       "name": "my-mcp-server",
       "transportConfig": {
         "type": "stdio",
         "command": "node",
         "args": ["./my-mcp-server/index.js"],
         "env": {},
         "cwd": "/path/to/server"
       }
     }'
   ```

3. **List connected servers**:
   ```bash
   curl -X POST http://localhost:7200/tools/list_mcp \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

## Configuration

### Transport Configuration

MCP-UNI supports two types of transport configurations:

#### SSE Transport

```json
{
  "type": "sse",
  "url": "http://example.com/sse",
  "query": {
    "param1": "value1"
  },
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

#### Stdio Transport

```json
{
  "type": "stdio",
  "command": "python",
  "args": ["-m", "my_mcp_server"],
  "env": {
    "ENV_VAR": "value"
  },
  "cwd": "/path/to/working/directory"
}
```

## Command Line Options

```bash
mcp-uni [options]

Options:
  -p, --port <number>    Port to listen on (default: 7200)
  -s, --stream <path>    Stream endpoint path (default: /stream)
  -h, --help            Display help for command
  -V, --version         Display version number
```

### Examples

```bash
# Start server on default port (7200)
npx mcp-uni

# Start server on custom port
npx mcp-uni --port 8000

# Start server with custom stream endpoint
npx mcp-uni --port 8000 --stream /events

# Show help
npx mcp-uni --help

# Show version
npx mcp-uni --version
```

## API Reference

### Built-in Tools

MCP-UNI provides these management tools:

#### `connect_mcp`

Connect a new MCP server to the host.

**Parameters:**

- `name` (string): Unique name for the MCP server
- `transportConfig` (object): Transport configuration (see above)

#### `disconnect_mcp`

Disconnect an MCP server from the host.

**Parameters:**

- `name` (string): Name of the MCP server to disconnect

#### `list_mcp`

List all currently connected MCP servers.

**Parameters:** None

### Dynamic Tools

All tools from connected MCP servers are automatically exposed through MCP-UNI with their original names and schemas.

### HTTP Endpoints

- `POST /tools/{tool_name}` - Execute a tool
- `GET /stream` - SSE endpoint for real-time updates
- `GET /health` - Health check endpoint

## Usage Examples

### Connecting Multiple Servers

```bash
# Connect a file system MCP server
curl -X POST http://localhost:7200/tools/connect_mcp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "filesystem",
    "transportConfig": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {},
      "cwd": "."
    }
  }'

# Connect a database MCP server
curl -X POST http://localhost:7200/tools/connect_mcp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "database",
    "transportConfig": {
      "type": "stdio",
      "command": "python",
      "args": ["-m", "database_mcp_server"],
      "env": {"DB_URL": "sqlite:///app.db"},
      "cwd": "/path/to/db/server"
    }
  }'
```

### Using Connected Server Tools

Once servers are connected, their tools become available:

```bash
# Use filesystem server tool
curl -X POST http://localhost:7200/tools/read_file \
  -H "Content-Type: application/json" \
  -d '{"path": "/tmp/example.txt"}'

# Use database server tool
curl -X POST http://localhost:7200/tools/execute_query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users LIMIT 10"}'
```

## Development

### Project Structure

```
src/
├── index.ts              # Entry point and HTTP server setup
├── server.ts             # MCP server implementation
├── host.ts               # MCP host for managing connections
└── utils/
    ├── schema-converter.ts # JSON Schema to Zod conversion utilities
    └── utils.ts           # Utility functions
```

### Building

```bash
npm run build
```

The compiled JavaScript will be output to the `build/` directory.

### Key Components

- **McpHost** (`host.ts:37`): Manages connections to multiple MCP servers
- **createServer** (`server.ts:15`): Creates the unified MCP server instance
- **Schema Conversion** (`utils/schema-converter.ts`): Converts JSON schemas to Zod schemas
- **Transport Management** (`host.ts:166`): Handles different transport types (SSE/stdio)

## Error Handling

MCP-UNI includes robust error handling:

- **Connection Retries**: Automatic retry with backoff for failed connections (3 retries, 2.5s delay)
- **Tool Execution**: Proper error propagation from connected servers
- **Graceful Cleanup**: Automatic cleanup of connections on server shutdown

## Requirements

- Node.js 16+ (ES modules required)
- TypeScript 5+

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for client/server implementation
- `mcp-proxy`: HTTP proxy server for MCP protocol
- `zod`: Schema validation and type safety

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:

- Create an issue on GitHub
- Check existing documentation
- Review the MCP specification

---

**MCP-UNI** simplifies MCP server management by providing a unified, dynamic gateway for all your Model Context Protocol servers.
