[English](./README.md) | 中文

# MCP-UNI

**MCP-UNI** 是一个模型上下文协议（MCP）通用服务器，作为连接和管理多个MCP服务器的统一网关。它提供单一的HTTP端点来动态连接、断开连接并与各种MCP服务器交互，无需静态配置。

## 功能特性

- 🔌 **动态MCP服务器管理**：在运行时连接和断开MCP服务器
- 🌐 **HTTP服务器接口**：支持服务器发送事件（SSE）的RESTful API
- 🔗 **多种传输支持**：支持SSE和stdio传输方式
- 🛠️ **工具聚合**：通过统一接口暴露所有连接的MCP服务器工具
- 📚 **资源管理**：访问来自连接服务器的资源和资源模板
- 💬 **提示管理**：跨多个MCP服务器管理提示
- 🔄 **自动重试**：连接失败的内置重试机制
- 📋 **实时更新**：服务器连接/断开时动态更新工具列表

## 架构

MCP-UNI在客户端和多个MCP服务器之间充当代理/网关：

```
客户端 ──HTTP/SSE──> MCP-UNI ──stdio/SSE──> MCP服务器1
                        │
                        ├─────stdio/SSE──> MCP服务器2
                        │
                        └─────stdio/SSE──> MCP服务器N
```

## 安装

### 使用npx（推荐）

```bash
npx mcp-uni
```

### 从npm安装（即将推出）

```bash
npm install -g mcp-uni
```

### 从源码安装

```bash
git clone https://github.com/yourusername/mcp-uni.git
cd mcp-uni
npm install
npm run build
```

## 快速开始

### 方法1：使用配置文件（推荐）

1. **创建配置文件**（`mcp-uni.config.json`）：

   ```json
   {
     "mcpServers": {
       "everything": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-everything"],
         "env": {}
       }
     }
   }
   ```

2. **启动MCP-UNI服务器**：

   ```bash
   # 使用npx（无需安装）
   npx mcp-uni

   # 使用自定义端口
   npx mcp-uni --port 8000

   # 使用自定义配置文件
   npx mcp-uni --config /path/to/your-config.json

   # 或者如果已全局安装
   mcp-uni
   mcp-uni --port 8000
   ```

   服务器将在`http://localhost:7200`（或您指定的端口）启动，SSE端点为`/stream`，并自动连接配置文件中定义的MCP服务器。

### 方法2：手动连接

1. **启动MCP-UNI服务器**：

   ```bash
   # 使用npx（无需安装）
   npx mcp-uni

   # 使用自定义端口
   npx mcp-uni --port 8000

   # 或者如果已全局安装
   mcp-uni
   mcp-uni --port 8000
   ```

   服务器将在`http://localhost:7200`（或您指定的端口）启动，SSE端点为`/stream`。

2. **连接MCP服务器**：

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

3. **列出已连接的服务器**：
   ```bash
   curl -X POST http://localhost:7200/tools/list_mcp \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

## 配置

### 配置文件

MCP-UNI支持配置文件（`mcp-uni.config.json`）在启动时自动连接MCP服务器。这允许您预配置MCP服务器，而无需每次都手动连接它们。

#### 配置文件格式

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {}
    }
  }
}
```

#### 配置文件位置

- **默认**：当前工作目录中的`mcp-uni.config.json`
- **自定义**：使用`--config`选项指定不同路径

#### 配置文件示例

**多个MCP服务器：**

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {}
    },
    "everything": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {}
    },
    "database": {
      "type": "stdio",
      "command": "python",
      "args": ["-m", "database_mcp_server"],
      "env": {
        "DB_URL": "sqlite:///app.db"
      },
      "cwd": "/path/to/db/server"
    }
  }
}
```

**SSE传输配置：**

```json
{
  "mcpServers": {
    "remote-server": {
      "type": "sse",
      "url": "http://example.com/sse",
      "query": {
        "param1": "value1"
      },
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

### 传输配置

MCP-UNI支持两种类型的传输配置：

#### SSE传输

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

#### Stdio传输

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

## 命令行选项

```bash
mcp-uni [选项]

选项：
  -p, --port <数字>     监听端口（默认：7200）
  -s, --stream <路径>   流端点路径（默认：/stream）
  -c, --config <路径>   配置文件路径（默认：mcp-uni.config.json）
  -h, --help           显示帮助信息
  -V, --version        显示版本号
```

### 示例

```bash
# 使用默认端口（7200）和默认配置启动服务器
npx mcp-uni

# 使用自定义端口启动服务器
npx mcp-uni --port 8000

# 使用自定义配置文件启动服务器
npx mcp-uni --config /path/to/my-config.json

# 使用自定义端口和配置启动服务器
npx mcp-uni --port 8000 --config ./configs/production.json

# 使用自定义流端点启动服务器
npx mcp-uni --port 8000 --stream /events

# 显示帮助
npx mcp-uni --help

# 显示版本
npx mcp-uni --version
```

## API参考

### 内置工具

MCP-UNI提供以下管理工具：

#### `connect_mcp`

将新的MCP服务器连接到主机。

**参数：**

- `name`（字符串）：MCP服务器的唯一名称
- `transportConfig`（对象）：传输配置（见上文）

#### `disconnect_mcp`

从主机断开MCP服务器。

**参数：**

- `name`（字符串）：要断开的MCP服务器名称

#### `list_mcp`

列出所有当前连接的MCP服务器。

**参数：** 无

### 动态工具

来自连接MCP服务器的所有工具都会通过MCP-UNI自动暴露，保持其原始名称和模式。

### HTTP端点

- `POST /tools/{tool_name}` - 执行工具
- `GET /stream` - 实时更新的SSE端点
- `GET /health` - 健康检查端点

## 使用示例

### 连接多个服务器

```bash
# 连接文件系统MCP服务器
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

# 连接数据库MCP服务器
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

### 使用已连接服务器的工具

服务器连接后，它们的工具将变为可用：

```bash
# 使用文件系统服务器工具
curl -X POST http://localhost:7200/tools/read_file \
  -H "Content-Type: application/json" \
  -d '{"path": "/tmp/example.txt"}'

# 使用数据库服务器工具
curl -X POST http://localhost:7200/tools/execute_query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users LIMIT 10"}'
```

## 开发

### 项目结构

```
src/
├── index.ts              # 入口点和HTTP服务器设置
├── server.ts             # MCP服务器实现
├── host.ts               # 用于管理连接的MCP主机
└── utils/
    ├── schema-converter.ts # JSON模式到Zod转换工具
    └── utils.ts           # 工具函数
```

### 构建

```bash
npm run build
```

编译后的JavaScript将输出到`build/`目录。

### 关键组件

- **McpHost**（`host.ts:37`）：管理到多个MCP服务器的连接
- **createServer**（`server.ts:15`）：创建统一的MCP服务器实例
- **模式转换**（`utils/schema-converter.ts`）：将JSON模式转换为Zod模式
- **传输管理**（`host.ts:166`）：处理不同的传输类型（SSE/stdio）

## 错误处理

MCP-UNI包含强大的错误处理：

- **连接重试**：连接失败时自动重试和退避（3次重试，2.5秒延迟）
- **工具执行**：从连接服务器正确传播错误
- **优雅清理**：服务器关闭时自动清理连接

## 要求

- Node.js 16+（需要ES模块）
- TypeScript 5+

## 依赖项

- `@modelcontextprotocol/sdk`：用于客户端/服务器实现的MCP SDK
- `mcp-proxy`：MCP协议的HTTP代理服务器
- `zod`：模式验证和类型安全

## 许可证

MIT

## 贡献

1. Fork仓库
2. 创建功能分支
3. 进行更改
4. 如适用，添加测试
5. 提交拉取请求

## 支持

如有问题和疑问：

- 在GitHub上创建问题
- 查看现有文档
- 查看MCP规范

---

**MCP-UNI**通过为您的所有模型上下文协议服务器提供统一的动态网关，简化了MCP服务器管理。
