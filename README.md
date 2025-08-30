# Claude Code Bark 通知配置包 (Node.js 版本)

这是一个现代化的 Claude Code hooks 配置包，使用 **Node.js** 实现真正的跨平台支持，可以将 Claude Code 的各种事件及**详细信息**通过 Bark 推送到您的 iOS 设备。

## 📋 功能特性

- ✅ **真正跨平台** - 基于 Node.js，Windows、macOS、Linux 完全统一
- ✅ **智能信息提取** - 自动解析 Claude Code hooks JSON 数据
- ✅ **详细通知内容** - 包含工具名称、文件名、操作详情
- ✅ **用户提示时通知** - 当您发送消息时推送
- ✅ **任务完成通知** - 当 Claude 完成回复时推送  
- ✅ **工具使用通知** - 详细显示使用的工具和操作的文件
- ✅ **错误通知** - 出现错误时推送（特殊提示音）
- ✅ **确认请求通知** - 需要用户确认时推送（警报音）
- 📍 **丰富信息** - 主机名、时间戳、项目名称、具体操作详情

## 🚀 快速使用

### 前置要求
- **Node.js** (任何现代版本，建议 v16+)
- **curl** 命令行工具（大多数系统自带）
- **Bark iOS 应用** 并获取设备 Key

### 1. 复制配置文件
将整个 `.claude` 目录复制到您的新项目根目录下：
```
your-project/
├── .claude/
│   ├── settings.json          # 主配置文件
│   ├── config/
│   │   ├── .env              # 环境变量配置文件（统一配置）
│   │   └── .env.example      # 配置模板文件
│   └── scripts/
│       ├── notify.js         # 核心通知脚本 (Node.js)
│       └── config-manager.js # 配置管理脚本
└── 其他项目文件...
```

### 2. 配置通知参数
所有配置现在统一在 `.env` 文件中管理：

1. 复制配置模板：
```bash
cp .claude/config/.env.example .claude/config/.env
```

2. 编辑 `.claude/config/.env` 文件，配置您的实际密钥：
```ini
# ============================================
# Bark 通知基础配置
# ============================================

# Bark推送密钥（必须配置）
BARK_KEY=YOUR_ACTUAL_BARK_KEY

# 可选配置
BARK_API=https://api.day.app
BARK_GROUP=Claude-Code
BARK_SOUND=default
BARK_LEVEL=active

# ============================================
# Hooks 事件开关配置
# ============================================

# 用户提交消息时通知
HOOK_USER_PROMPT=true

# 任务停止/完成时通知  
HOOK_STOP=true

# 工具使用后通知（Edit、Write、Bash等）
HOOK_POST_TOOL_USE=true

# 系统通知（需要用户确认时）
HOOK_NOTIFICATION=true

# 错误发生时通知
HOOK_ERROR=true

# 工具使用前通知（较少使用，默认关闭）
HOOK_PRE_TOOL_USE=false
```

**🔒 安全说明**：
- `.env` 文件已被加入 `.gitignore`，不会提交到Git仓库
- 所有配置（密钥 + Hook开关）统一管理，更加简洁安全

### 3. 重启 Claude Code
重启 Claude Code CLI 以加载新的 hooks 配置。

## 🎯 智能通知内容

### 基础信息
所有通知都包含：
- **主机名** - 识别运行设备
- **时间戳** - 精确到秒的时间信息  
- **项目名** - 当前工作项目名称

### 详细信息 (全新功能)
根据具体事件自动提取：

**用户消息通知示例：**
- `MSI-143052-UserPrompt/Project:MyApp/Prompt: 帮我修复这个bug...`

**工具使用通知示例：**
- `MSI-143052-PostToolUse/Project:MyApp/Tool:Edit File:config.json (clean)`
- `ubuntu-094130-PostToolUse/Project:API-Server/Tool:Bash Cmd:npm install...`
- `MacBook-152045-PostToolUse/Project:Frontend/Tool:Grep Pattern:function...`

**任务完成通知示例：**
- `MacBook-152045-Stop/Project:Frontend/Final: 已成功完成代码重构，所有测试通过...`
- `MSI-110330-Stop/Project:Backend/Output: 数据库迁移完成，共处理1000条记录...`
- `Linux-094130-Stop/Project:API/Session abc12345 ended (25 msgs, reason: completed)`

**错误/通知示例：**
- `MSI-110330-Notification/Project:Backend/Alert: Claude is waiting for your input`

## 🔧 技术优势

### Node.js 统一方案
- ✅ **无平台差异** - 一套代码，所有平台
- ✅ **JSON 原生支持** - 完美解析 Claude Code hooks 数据
- ✅ **URL 编码处理** - 自动处理特殊字符和中文
- ✅ **异步非阻塞** - 不影响 Claude Code 性能

### 智能信息提取
```javascript
// 自动提取用户消息内容
if (jsonData.prompt) {
    const messagePreview = jsonData.prompt.substring(0, 50);
    body = `Prompt: ${messagePreview}${jsonData.prompt.length > 50 ? '...' : ''}`;
}

// 自动提取工具详细信息
if (jsonData.tool_name) {
    body += `Tool:${jsonData.tool_name}`;
    
    // 文件路径
    if (jsonData.tool_input && jsonData.tool_input.file_path) {
        const fileName = path.basename(jsonData.tool_input.file_path);
        body += ` File:${fileName}`;
    }
    
    // 命令预览  
    if (jsonData.tool_input && jsonData.tool_input.command) {
        const cmdPreview = jsonData.tool_input.command.substring(0, 30);
        body += ` Cmd:${cmdPreview}...`;
    }
    
    // 搜索模式
    if (jsonData.tool_input && jsonData.tool_input.pattern) {
        body += ` Pattern:${jsonData.tool_input.pattern}`;
    }
    
    // 文件修改状态
    if (jsonData.tool_response?.userModified !== undefined) {
        const status = jsonData.tool_response.userModified ? 'modified' : 'clean';
        body += ` (${status})`;
    }
}

// Stop事件智能提取Claude最终输出
if (eventType === 'Stop' && jsonData.transcript_path) {
    // 解析JSONL格式的对话记录文件
    const transcriptContent = fs.readFileSync(jsonData.transcript_path, 'utf8');
    const lines = transcriptContent.trim().split('\n').filter(line => line.trim());
    
    // 查找最后的Claude回复消息
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'assistant' && entry.message?.content) {
            const preview = entry.message.content.substring(0, 80).replace(/\n/g, ' ');
            body = `Final: ${preview}${entry.message.content.length > 80 ? '...' : ''}`;
            break;
        }
    }
}
```

## 📱 通知格式

### 标准格式
- **标题**: `主机名-时间戳-事件类型`
- **副标题**: `Project:项目名`
- **内容**: 具体操作详情

### 事件类型对应
| Hook 事件 | 通知类型 | 详细信息 |
|-----------|----------|----------|
| `UserPromptSubmit` | `UserPrompt` | 用户输入消息的前50字符预览 |
| `Stop` | `Stop` | **Claude最终输出内容** + 会话统计信息 |
| `PostToolUse` | `PostToolUse` | **工具名 + 文件名 + 命令/模式 + 状态** |
| `Error` | `Error` | 错误详情 + 特殊提示音 |
| `Notification` | `Notification` | 系统通知消息 + 警报音 |

## 🛠️ 灵活配置管理

### 🎛️ Hook事件开关配置
您可以灵活控制哪些事件需要发送通知，无需修改复杂的JSON配置文件！

#### 🔍 查看当前配置状态
```bash
node .claude/scripts/config-manager.js status
```

#### ✅ 启用/❌禁用特定事件
```bash
# 禁用任务完成通知
node .claude/scripts/config-manager.js disable stop

# 启用工具使用前通知
node .claude/scripts/config-manager.js enable pre-tool

# 禁用用户消息通知
node .claude/scripts/config-manager.js disable user-prompt
```

#### 🔄 重置为默认配置
```bash
node .claude/scripts/config-manager.js reset
```

### 📋 可配置的Hook事件
| Hook ID | 事件名称 | 默认状态 | 说明 |
|---------|----------|----------|------|
| `user-prompt` | 用户消息通知 | ✅ 启用 | 用户提交消息时通知 |
| `stop` | 任务完成通知 | ✅ 启用 | Claude完成回复时通知 |
| `post-tool` | 工具使用通知 | ✅ 启用 | 工具执行后通知 |
| `notification` | 系统通知 | ✅ 启用 | 需要确认时通知 |
| `error` | 错误通知 | ✅ 启用 | 出现错误时通知 |
| `pre-tool` | 工具预告通知 | ❌ 禁用 | 工具执行前通知(较少使用) |

### 🔧 高级自定义

#### 手动编辑配置文件
编辑 `.claude/config/bark.config`：
```ini
# Hook事件开关 (true=启用, false=禁用)
HOOK_USER_PROMPT=true
HOOK_STOP=true
HOOK_POST_TOOL_USE=true
HOOK_NOTIFICATION=true
HOOK_ERROR=true
HOOK_PRE_TOOL_USE=false
```

#### 自定义通知脚本
编辑 `.claude/scripts/notify.js` 来：
- 修改通知格式
- 添加新的信息提取逻辑
- 调整 URL 编码规则
- 自定义声音和级别

### 测试配置
```bash
# 查看Hook配置状态
node .claude/scripts/config-manager.js status

# 测试特定事件通知（如果该事件已启用）
node .claude/scripts/notify.js Test

# 模拟带 JSON 数据的测试
echo '{"tool_name":"Edit","tool_input":{"file_path":"test.js"}}' | node .claude/scripts/notify.js PostToolUse

# 测试配置管理脚本
node .claude/scripts/config-manager.js help
```

## 📂 完善的文件结构

```
.claude/
├── settings.json              # 主配置文件
├── config/
│   ├── .env                  # 环境变量配置文件（统一配置）
│   └── .env.example          # 配置模板文件
└── scripts/
    ├── notify.js             # 核心通知脚本 (Node.js)
    └── config-manager.js     # 配置管理脚本
```

### 🆕 新增功能：
- ✅ **config-manager.js** - 图形化配置管理工具
- ✅ **Hook事件开关** - 精细控制每个事件的通知
- ✅ **配置验证** - 自动检查配置有效性
- ✅ **一键重置** - 快速恢复默认设置
- ✅ **统一配置文件** - 所有配置集中在一个.env文件中

### 🔒 配置安全性：
- **统一.env管理** - 所有配置（密钥+开关）集中管理
- **Git安全保护** - 敏感信息不会被提交到代码仓库  
- **模板文件支持** - 提供.env.example模板便于快速配置
- **自动回退机制** - 配置缺失时自动使用默认值

相比之前版本：
- ❌ 删除了 `bark.config` 配置文件
- ❌ 删除了 `windows/` 和 `unix/` 目录
- ❌ 删除了多个 `.bat` 和 `.sh` 文件
- ✅ 统一配置文件结构，更简洁
- ✅ 增加了配置管理功能
- ✅ 支持精细的事件控制
- ✅ 增强了配置安全性

## ⚠️ 注意事项

1. **Node.js 依赖** - 需要安装 Node.js (推荐 v16+)
2. **curl 工具** - 需要系统安装 curl 命令
3. **重启要求** - 修改配置后需要重启 Claude Code
4. **网络要求** - 需要能够访问 Bark API 服务
5. **Bark 应用** - 需要在 iOS 设备上安装并配置 Bark 应用

## 🛠️ 故障排除

### 没有收到通知？
1. 检查 Node.js 是否安装：`node --version`
2. **检查配置文件**：
   - 优先检查 `.env` 文件中的 `BARK_KEY` 是否正确
   - 备选检查 `.claude/config/bark.config` 中的配置
3. 确认已重启 Claude Code
4. **检查Hook事件是否启用**：`node .claude/scripts/config-manager.js status`
5. 验证网络连接：`curl https://api.day.app`
6. 测试脚本：`node .claude/scripts/notify.js Test`

### 配置文件问题？
- **配置文件位置**：`.env` 文件应在 `.claude/config/.env`
- **配置模板**：如果 `.env` 不存在，复制 `.claude/config/.env.example`
- **敏感信息保护**：确保 `.env` 文件存在且包含正确的 `BARK_KEY`
- **统一管理**：所有配置（密钥+Hook开关）都在 `.env` 文件中

### Node.js 相关问题
```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本  
npm --version

# 如果没有安装 Node.js，请访问：
# https://nodejs.org/
```

### 权限问题
```bash
# 确保脚本可执行 (Unix/Linux/macOS)
chmod +x .claude/scripts/notify.js

# Windows 通常无需额外权限设置
```

---

**享受智能化的 Claude Code 实时监控！** 🎉

## 🌟 升级亮点

### 相比传统方案的优势：
- 🔧 **极简文件结构** - 从 20+ 文件减少到 4 个核心文件
- 📱 **更丰富的通知** - 自动提取工具名、文件名等详细信息
- 🌍 **真正跨平台** - 无需为不同系统维护不同脚本
- ⚡ **更好的性能** - Node.js 异步处理，JSON 原生支持
- 🎯 **更智能** - 自动 URL 编码，自动信息提取
- 🔧 **更易维护** - 统一代码库，更容易扩展和调试
- 🎛️ **灵活配置** - 图形化配置管理，精细控制每个事件
- ⚙️ **配置验证** - 自动检查配置有效性，一键重置功能

### 实际使用场景：
- 💬 **用户消息时**: `Prompt: 帮我修复这个bug...` (显示消息内容预览)
- 📝 **编辑文件时**: `Tool:Edit File:config.json (clean)` (显示文件状态)
- 🔧 **运行命令时**: `Tool:Bash Cmd:npm install...` (显示命令预览)
- 🔍 **搜索文件时**: `Tool:Grep Pattern:function File:*.js` (显示搜索模式)
- ✅ **任务完成时**: `Final: 已成功完成代码重构，所有测试通过...` **(新功能！显示Claude最终输出)**
- 🔔 **系统通知时**: `Alert: Claude is waiting for your input` (显示具体消息)
- ❌ **出现错误时**: 详细错误信息 + 特殊提示音