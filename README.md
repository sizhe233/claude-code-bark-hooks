# Claude Code Bark 通知系统

将 Claude Code 的各种操作事件通过 Bark 推送到 iOS 设备的跨平台通知系统。

## 🚀 快速开始

### 1. 复制配置文件
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

### 2. 配置通知参数
```bash
# 复制配置模板
cp .claude/config/.env.example .claude/config/.env

# 编辑配置文件，填入你的Bark密钥
```

编辑 `.claude/config/.env`:
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

### 3. 重启 Claude Code
重启 Claude Code 以加载配置。

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

```bash
# 查看当前配置状态
node .claude/scripts/config-manager.js status

# 启用/禁用特定事件
node .claude/scripts/config-manager.js disable stop
node .claude/scripts/config-manager.js enable post-tool

# 重置为默认配置
node .claude/scripts/config-manager.js reset

# 测试通知
node .claude/scripts/notify.js Test
```

## 🛠️ 故障排除

**没有收到通知？**
1. 检查 Node.js 是否安装：`node --version`
2. 确认 `.env` 文件中的 `BARK_KEY` 正确
3. 检查事件是否启用：`node .claude/scripts/config-manager.js status`
4. 重启 Claude Code
5. 测试连接：`node .claude/scripts/notify.js Test`

## 📋 要求
- Node.js (v16+)
- curl 命令
- Bark iOS 应用及设备密钥

## 🔒 安全说明
- `.env` 文件已加入 `.gitignore`，不会提交敏感信息到 Git
- 所有配置统一在 `.env` 文件中管理

---
享受智能化的 Claude Code 实时监控！🎉