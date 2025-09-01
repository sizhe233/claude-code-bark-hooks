# Claude Code Bark 通知系统

将 Claude Code 的各种操作事件通过 Bark 推送到 iOS 设备的跨平台通知系统。

## 🚀 快速开始

### 配置方式选择

**🌍 全局配置（推荐）**：一次配置，所有项目通用
**📁 项目配置**：每个项目独立配置

### 方式1：全局配置（推荐）

**Windows 设置：**
```cmd
:: 创建目录并复制文件
mkdir "%USERPROFILE%\.claude\scripts" & mkdir "%USERPROFILE%\.claude\config"
copy ".claude\scripts\notify.js" "%USERPROFILE%\.claude\scripts\"
copy ".claude\scripts\config-manager.js" "%USERPROFILE%\.claude\scripts\"
copy "settings-templates\windows-global-settings.json" "%USERPROFILE%\.claude\settings.json"
copy ".claude\config\.env.example" "%USERPROFILE%\.claude\config\.env"

:: 编辑配置文件填入 Bark 密钥
notepad "%USERPROFILE%\.claude\config\.env"
```

**Linux/macOS 设置：**
```bash
# 创建目录并复制文件
mkdir -p ~/.claude/scripts ~/.claude/config
cp .claude/scripts/notify.js ~/.claude/scripts/
cp .claude/scripts/config-manager.js ~/.claude/scripts/
cp settings-templates/linux-global-settings.json ~/.claude/settings.json
cp .claude/config/.env.example ~/.claude/config/.env

# 编辑配置文件填入 Bark 密钥
nano ~/.claude/config/.env
```

### 方式2：项目配置

将整个 `.claude` 目录复制到你的项目根目录：
```
your-project/
├── .claude/
│   ├── settings.json          # Hook配置文件
│   ├── config/
│   │   ├── .env               # 配置文件(需要创建)
│   │   └── .env.example       # 配置模板
│   └── scripts/
│       ├── notify.js          # 通知脚本
│       └── config-manager.js  # 配置管理
```

### 环境变量配置

不管使用哪种配置方式，都需要编辑 `.env` 文件：

**全局配置路径**：
- Windows: `%USERPROFILE%\.claude\config\.env`  
- Linux/macOS: `~/.claude/config/.env`

**项目配置路径**：`项目根目录/.claude/config/.env`

```ini
# Bark推送密钥（必填）
BARK_KEY=你的实际密钥

# 可选配置
BARK_API=https://api.day.app
BARK_GROUP=Claude-Code

# Hook事件开关
HOOK_USER_PROMPT=true      # 用户消息通知
HOOK_STOP=true            # 任务完成通知
HOOK_POST_TOOL_USE=true   # 工具使用通知
HOOK_NOTIFICATION=true    # 系统通知
```

### 重启 Claude Code
配置完成后重启 Claude Code 以加载配置。

## 📱 通知内容

### 支持的事件
- **UserPrompt**: 用户提交消息时
- **Stop**: Claude 完成任务时（显示最终输出摘要）
- **PostToolUse**: 工具使用后（Edit、Write、Bash 等）
- **Notification**: 系统通知时

### 通知格式
- **标题**: `主机名-时间戳-事件类型`
- **副标题**: `Project:项目名`
- **内容**: 具体操作详情

**示例通知：**
```
MSI-143052-PostToolUse
Project:MyApp
Tool:Edit File:config.json (clean)
```

## 🎛️ 配置管理

### 查看当前使用的配置

系统会自动显示使用的是全局配置🌍还是项目配置📁：

```bash
# 全局配置管理
node ~/.claude/scripts/config-manager.js status

# 项目配置管理（在项目目录中执行）
node .claude/scripts/config-manager.js status
```

### 配置优先级

Claude Code 按以下顺序搜索配置：

1. **项目配置**（最高优先级）：`当前项目/.claude/settings.json`
2. **全局配置**：`~/.claude/settings.json`（Windows: `%USERPROFILE%\.claude\settings.json`）

### 管理 Hook 事件开关

```bash
# 启用/禁用特定事件
node ~/.claude/scripts/config-manager.js disable stop
node ~/.claude/scripts/config-manager.js enable post-tool

# 重置为默认配置
node ~/.claude/scripts/config-manager.js reset

# 测试通知
node ~/.claude/scripts/notify.js Test
```

## 🛠️ 故障排除

### 常见错误：找不到脚本文件

**错误信息**：
```
Error: Cannot find module '.claude/scripts/notify.js'
```

**解决方案**：
1. **推荐**：使用全局配置，避免每个项目都要复制脚本
2. 或者删除项目中的 `.claude/settings.json`，使用全局配置
3. 或者确保当前项目有完整的 `.claude` 目录

**检查当前配置**：
```bash
# 查看使用的配置类型和路径
node ~/.claude/scripts/config-manager.js status
```

### 没有收到通知？

1. **检查 Node.js**：`node --version`
2. **确认 Bark 密钥正确**：检查 `.env` 文件中的 `BARK_KEY`
3. **检查事件开关**：`node ~/.claude/scripts/config-manager.js status`
4. **重启 Claude Code**
5. **测试连接**：`echo '{}' | node ~/.claude/scripts/notify.js Test`

### 配置冲突

如果同时存在全局和项目配置，项目配置会覆盖全局配置。建议：
- 删除项目配置：`rm .claude/settings.json`
- 或保留项目配置，删除全局配置

## 📋 要求
- Node.js (v16+)
- curl 命令
- Bark iOS 应用及设备密钥

## 🔒 安全说明
- `.env` 文件已加入 `.gitignore`，不会提交敏感信息到 Git
- 所有配置统一在 `.env` 文件中管理

---
享受智能化的 Claude Code 实时监控！🎉