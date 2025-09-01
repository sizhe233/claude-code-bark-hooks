# Claude Code Hooks Settings 配置模板

## 📁 配置文件说明

### 全局配置 vs 项目配置

**全局配置**：适用于所有项目，无需在每个项目中复制脚本文件
**项目配置**：仅适用于当前项目，需要在项目中包含完整的 `.claude` 目录

## 🌍 全局配置 (推荐)

### Windows 全局配置

**配置文件位置**：`C:\Users\{用户名}\.claude\settings.json`

**安装步骤**：
```cmd
:: 1. 创建目录结构
mkdir "%USERPROFILE%\.claude\scripts"
mkdir "%USERPROFILE%\.claude\config"

:: 2. 复制脚本文件
copy ".claude\scripts\notify.js" "%USERPROFILE%\.claude\scripts\"
copy ".claude\scripts\config-manager.js" "%USERPROFILE%\.claude\scripts\"

:: 3. 复制配置文件
copy "settings-templates\windows-global-settings.json" "%USERPROFILE%\.claude\settings.json"

:: 4. 设置环境配置
copy ".claude\config\.env.example" "%USERPROFILE%\.claude\config\.env"
:: 编辑 .env 文件填入你的 Bark 密钥
```

### Linux/macOS 全局配置

**配置文件位置**：`~/.claude/settings.json`

**安装步骤**：
```bash
# 1. 创建目录结构
mkdir -p ~/.claude/scripts ~/.claude/config

# 2. 复制脚本文件
cp .claude/scripts/notify.js ~/.claude/scripts/
cp .claude/scripts/config-manager.js ~/.claude/scripts/

# 3. 复制配置文件
cp settings-templates/linux-global-settings.json ~/.claude/settings.json

# 4. 设置环境配置
cp .claude/config/.env.example ~/.claude/config/.env
# 编辑 .env 文件填入你的 Bark 密钥
nano ~/.claude/config/.env
```

## 📁 项目配置

**配置文件位置**：`项目根目录/.claude/settings.json`

**使用场景**：
- 需要为特定项目定制不同的通知配置
- 项目需要包含完整的通知系统（便于分享）

**安装步骤**：
```bash
# 复制整个 .claude 目录到项目根目录
cp -r .claude /path/to/your/project/

# 或使用项目配置模板
cp settings-templates/project-settings.json /path/to/your/project/.claude/settings.json
```

## 🔧 配置管理

### 查看当前配置状态
```bash
# 全局配置
node ~/.claude/scripts/config-manager.js status

# 项目配置（在项目目录中执行）
node .claude/scripts/config-manager.js status
```

### 启用/禁用事件
```bash
# 全局配置管理
node ~/.claude/scripts/config-manager.js enable user-prompt
node ~/.claude/scripts/config-manager.js disable post-tool

# 项目配置管理
node .claude/scripts/config-manager.js enable stop
```

## ⚡ 配置优先级

Claude Code 按以下优先级搜索配置：

1. **项目配置** (最高优先级)
   - `当前项目/.claude/settings.json`
   
2. **全局配置**
   - Windows: `%USERPROFILE%\.claude\settings.json`
   - Linux/macOS: `~/.claude/settings.json`

## 🚀 快速设置命令

### Windows 一键设置全局配置
```cmd
@echo off
mkdir "%USERPROFILE%\.claude\scripts" 2>nul
mkdir "%USERPROFILE%\.claude\config" 2>nul
copy ".claude\scripts\notify.js" "%USERPROFILE%\.claude\scripts\" >nul
copy ".claude\scripts\config-manager.js" "%USERPROFILE%\.claude\scripts\" >nul
copy "settings-templates\windows-global-settings.json" "%USERPROFILE%\.claude\settings.json" >nul
copy ".claude\config\.env.example" "%USERPROFILE%\.claude\config\.env" >nul
echo 全局配置安装完成！请编辑 %USERPROFILE%\.claude\config\.env 填入 Bark 密钥
echo 然后重启 Claude Code
```

### Linux/macOS 一键设置全局配置
```bash
#!/bin/bash
mkdir -p ~/.claude/scripts ~/.claude/config
cp .claude/scripts/notify.js ~/.claude/scripts/
cp .claude/scripts/config-manager.js ~/.claude/scripts/
cp settings-templates/linux-global-settings.json ~/.claude/settings.json
cp .claude/config/.env.example ~/.claude/config/.env
echo "全局配置安装完成！请编辑 ~/.claude/config/.env 填入 Bark 密钥"
echo "然后重启 Claude Code"
```

## 🔒 安全提醒

- `.env` 文件包含敏感信息，已加入 `.gitignore`
- 全局配置文件不会被 Git 跟踪
- 建议使用全局配置，避免在多个项目中重复配置敏感信息