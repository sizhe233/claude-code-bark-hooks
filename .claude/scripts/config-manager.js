#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// 查找配置文件路径（支持全局/项目配置）
function findConfigPath() {
  const configPaths = [
    // 1. 项目级配置（相对于脚本位置）
    path.join(__dirname, '..', 'config', '.env'),
    // 2. 项目级配置（相对于当前工作目录）
    path.join(process.cwd(), '.claude', 'config', '.env'),
    // 3. 全局配置（用户主目录）
    path.join(os.homedir(), '.claude', 'config', '.env')
  ];
  
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      return {
        path: configPath,
        type: configPath.includes(os.homedir()) ? 'global' : 'project'
      };
    }
  }
  
  // 如果找不到配置文件，返回项目级配置路径用于创建
  return {
    path: configPaths[0],
    type: 'project'
  };
}

// Hook事件配置映射
const HOOK_CONFIGS = {
  'user-prompt': { key: 'HOOK_USER_PROMPT', name: '用户提交消息通知', default: 'true' },
  'stop': { key: 'HOOK_STOP', name: '任务停止/完成通知', default: 'true' },
  'post-tool': { key: 'HOOK_POST_TOOL_USE', name: '工具使用后通知', default: 'true' },
  'notification': { key: 'HOOK_NOTIFICATION', name: '系统通知', default: 'true' },
  'error': { key: 'HOOK_ERROR', name: '错误通知', default: 'true' },
  'pre-tool': { key: 'HOOK_PRE_TOOL_USE', name: '工具使用前通知', default: 'false' }
};

// 读取配置文件
function loadConfig() {
  const config = {};
  const configInfo = findConfigPath();
  
  try {
    const content = fs.readFileSync(configInfo.path, 'utf8');
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=', 2);
        if (key && value) {
          config[key.trim()] = value.trim();
        }
      }
    });
    
    // 添加配置源信息
    config._CONFIG_PATH = configInfo.path;
    config._CONFIG_TYPE = configInfo.type;
  } catch (error) {
    console.error('❌ 读取配置文件失败:', error.message);
    console.error('   配置文件路径:', configInfo.path);
    process.exit(1);
  }
  
  return config;
}

// 更新配置文件
function updateConfig(updates) {
  const configInfo = findConfigPath();
  
  try {
    let content = fs.readFileSync(configInfo.path, 'utf8');
    
    // 更新每个配置项
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        // 如果配置项不存在，添加到文件末尾
        content += `\n${key}=${value}`;
      }
    }
    
    fs.writeFileSync(configInfo.path, content, 'utf8');
    return true;
  } catch (error) {
    console.error('❌ 更新配置文件失败:', error.message);
    return false;
  }
}

// 显示当前配置状态
function showStatus() {
  console.log('📋 Claude Code Bark Hooks 配置状态\n');
  
  const config = loadConfig();
  
  // 显示配置源信息
  const configType = config._CONFIG_TYPE === 'global' ? '🌍 全局配置' : '📁 项目配置';
  console.log(`${configType} (${config._CONFIG_PATH})\n`);
  
  Object.entries(HOOK_CONFIGS).forEach(([id, info]) => {
    const value = config[info.key] || info.default;
    const status = (value === 'true' || value === '1') ? '✅ 启用' : '❌ 禁用';
    console.log(`${id.padEnd(12)} | ${status.padEnd(8)} | ${info.name}`);
  });
  
  console.log('\n💡 使用 enable/disable 命令来修改配置');
  console.log('💡 修改后需要重启 Claude Code 才能生效');
}

// 启用指定的hook
function enableHook(hookId) {
  const hookConfig = HOOK_CONFIGS[hookId];
  if (!hookConfig) {
    console.error(`❌ 未知的hook ID: ${hookId}`);
    showAvailableHooks();
    return;
  }
  
  const updates = { [hookConfig.key]: 'true' };
  if (updateConfig(updates)) {
    console.log(`✅ 已启用: ${hookConfig.name}`);
    console.log('💡 请重启 Claude Code 使配置生效');
  }
}

// 禁用指定的hook
function disableHook(hookId) {
  const hookConfig = HOOK_CONFIGS[hookId];
  if (!hookConfig) {
    console.error(`❌ 未知的hook ID: ${hookId}`);
    showAvailableHooks();
    return;
  }
  
  const updates = { [hookConfig.key]: 'false' };
  if (updateConfig(updates)) {
    console.log(`❌ 已禁用: ${hookConfig.name}`);
    console.log('💡 请重启 Claude Code 使配置生效');
  }
}

// 显示可用的hook ID
function showAvailableHooks() {
  console.log('\n📝 可用的Hook ID:');
  Object.entries(HOOK_CONFIGS).forEach(([id, info]) => {
    console.log(`  ${id.padEnd(12)} - ${info.name}`);
  });
}

// 重置为默认配置
function resetToDefault() {
  const updates = {};
  Object.entries(HOOK_CONFIGS).forEach(([id, info]) => {
    updates[info.key] = info.default;
  });
  
  if (updateConfig(updates)) {
    console.log('🔄 已重置为默认配置');
    console.log('💡 请重启 Claude Code 使配置生效');
    showStatus();
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
📖 Claude Code Bark Hooks 配置管理工具

用法:
  node config-manager.js [命令] [参数]

命令:
  status              显示当前配置状态
  enable <hook-id>    启用指定的hook
  disable <hook-id>   禁用指定的hook
  reset              重置为默认配置
  help               显示此帮助信息

示例:
  node config-manager.js status
  node config-manager.js enable user-prompt
  node config-manager.js disable stop
  node config-manager.js reset
`);
  showAvailableHooks();
}

// 主函数
function main() {
  const [,, command, hookId] = process.argv;
  
  if (!command || command === 'status') {
    showStatus();
    return;
  }
  
  switch (command) {
    case 'enable':
      if (!hookId) {
        console.error('❌ 请指定要启用的hook ID');
        showAvailableHooks();
        return;
      }
      enableHook(hookId);
      break;
      
    case 'disable':
      if (!hookId) {
        console.error('❌ 请指定要禁用的hook ID');
        showAvailableHooks();
        return;
      }
      disableHook(hookId);
      break;
      
    case 'reset':
      resetToDefault();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
  }
}

// 运行主函数
main();