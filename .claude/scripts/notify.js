#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// 全局日志函数
const logFile = path.join(__dirname, '..', '..', 'notify-debug.log');
function log(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} - ${msg}\n`, 'utf8');
}

// 读取.env环境变量文件（支持全局/项目配置）
function loadEnvFile() {
  const env = {};
  
  // 定义配置文件搜索路径（优先级从高到低）
  const configPaths = [
    // 1. 项目级配置（相对于脚本位置）
    path.join(__dirname, '..', 'config', '.env'),
    // 2. 项目级配置（相对于当前工作目录）
    path.join(process.cwd(), '.claude', 'config', '.env'),
    // 3. 全局配置（用户主目录）
    path.join(os.homedir(), '.claude', 'config', '.env')
  ];
  
  let configSource = '';
  
  // 按优先级查找配置文件
  for (const envPath of configPaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
          line = line.trim();
          if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              env[key.trim()] = valueParts.join('=').trim();
            }
          }
        });
        configSource = envPath;
        break; // 找到配置文件后停止搜索
      }
    } catch (error) {
      // 配置文件读取失败时继续尝试下一个
      continue;
    }
  }
  
  // 添加配置源信息用于调试
  if (configSource) {
    const isGlobal = configSource.includes(os.homedir());
    env._CONFIG_SOURCE = configSource;
    env._CONFIG_TYPE = isGlobal ? 'global' : 'project';
  }
  
  return env;
}

// 读取配置文件
function loadConfig() {
  // 从.env文件加载所有配置
  const config = loadEnvFile();
  
  // Bark配置默认值
  config.BARK_ENABLED = config.BARK_ENABLED || 'true';
  config.BARK_KEY = config.BARK_KEY || 'YOUR_BARK_KEY';
  config.BARK_API = config.BARK_API || 'https://api.day.app';
  config.BARK_GROUP = config.BARK_GROUP || 'Claude-Code';
  config.BARK_SOUND = config.BARK_SOUND || 'default';
  config.BARK_LEVEL = config.BARK_LEVEL || 'active';
  
  // 钉钉配置默认值
  config.DINGTALK_ENABLED = config.DINGTALK_ENABLED || 'false';
  config.DINGTALK_WEBHOOK = config.DINGTALK_WEBHOOK || '';
  config.DINGTALK_SECRET = config.DINGTALK_SECRET || '';
  
  return config;
}

// 读取JSON输入
function readStdin() {
  return new Promise((resolve) => {
    let input = '';
    let hasData = false;
    
    // 设置超时，避免无限等待
    const timeout = setTimeout(() => {
      if (!hasData) {
        resolve({});
      }
    }, 1000);
    
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      hasData = true;
      input += chunk;
    });
    
    process.stdin.on('end', () => {
      clearTimeout(timeout);
      try {
        if (input.trim()) {
          const json = JSON.parse(input.trim());
          resolve(json);
        } else {
          resolve({});
        }
      } catch (error) {
        console.error('JSON parse error:', error.message, 'Input:', input);
        resolve({});
      }
    });
    
    // 处理可能没有stdin输入的情况
    process.stdin.on('error', (error) => {
      clearTimeout(timeout);
      console.error('Stdin error:', error.message);
      resolve({});
    });
  });
}

// URL编码函数
function urlEncode(str) {
  return encodeURIComponent(str || '').replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

// 发送钉钉机器人通知（支持更长消息和丰富Markdown格式）
function sendDingTalkNotification(config, title, subtitle, body, jsonData = {}) {
  return new Promise((resolve, reject) => {
    // 构建丰富的钉钉Markdown消息
    const projectName = subtitle ? subtitle.replace('Project:', '') : '';
    const timestamp = new Date().toLocaleString('zh-CN');
    
    let content = [
      `# 🤖 ${title}`,
      '',
      `**⏰ 时间**: ${timestamp}`,
      `**📁 项目**: ${projectName}`,
      '',
      '---',
      ''
    ];

    // 根据不同事件类型添加详细信息
    const eventType = title.split('-').pop();
    
    if (body) {
      if (eventType === 'Stop') {
        content.push('## ✅ 任务完成');
        content.push('');
        content.push(`> ${body}`);
        
        // 添加会话统计信息
        if (jsonData.session_id) {
          content.push('');
          content.push('**📊 会话信息**:');
          content.push(`- Session ID: \`${jsonData.session_id.substring(0, 8)}...\``);
        }
      } else if (eventType.includes('Tool')) {
        content.push('## 🔧 工具操作');
        content.push('');
        content.push(`**操作详情**: ${body}`);
        
        // 添加工具详细信息
        if (jsonData.tool_input) {
          content.push('');
          content.push('**📋 工具参数**:');
          
          if (jsonData.tool_input.file_path) {
            content.push(`- 📄 文件: \`${jsonData.tool_input.file_path}\``);
          }
          
          if (jsonData.tool_input.command) {
            content.push(`- 💻 命令: \`${jsonData.tool_input.command.substring(0, 100)}${jsonData.tool_input.command.length > 100 ? '...' : ''}\``);
          }
          
          if (jsonData.tool_input.pattern) {
            content.push(`- 🔍 搜索: \`${jsonData.tool_input.pattern}\``);
          }
          
          if (jsonData.tool_input.old_string && jsonData.tool_input.new_string) {
            content.push(`- 🔄 替换: \`${jsonData.tool_input.old_string.substring(0, 50)}...\` → \`${jsonData.tool_input.new_string.substring(0, 50)}...\``);
          }
        }
        
        // 添加执行结果
        if (jsonData.tool_response) {
          content.push('');
          content.push('**📊 执行结果**:');
          
          if (jsonData.tool_response.stdout && jsonData.tool_response.stdout.trim()) {
            const output = jsonData.tool_response.stdout.substring(0, 200);
            content.push(`- 📤 输出: \`${output}${jsonData.tool_response.stdout.length > 200 ? '...' : ''}\``);
          }
          
          if (jsonData.tool_response.stderr && jsonData.tool_response.stderr.trim()) {
            content.push(`- ❌ 错误: \`${jsonData.tool_response.stderr.substring(0, 100)}\``);
          }
          
          const status = jsonData.tool_response.interrupted ? '🛑 中断' : 
                        jsonData.tool_response.stderr ? '⚠️ 警告' : '✅ 成功';
          content.push(`- 🏁 状态: ${status}`);
        }
      } else if (eventType === 'UserPrompt') {
        content.push('## 💬 用户消息');
        content.push('');
        content.push(`> ${body}`);
      } else if (eventType === 'Error') {
        content.push('## ❌ 错误信息');
        content.push('');
        content.push(`> 🚨 ${body}`);
      } else if (eventType === 'Notification') {
        content.push('## 🔔 系统通知');
        content.push('');
        content.push(`> 📢 ${body}`);
      } else {
        content.push('## 📋 详细信息');
        content.push('');
        content.push(`> ${body}`);
      }
    }
    
    // 添加原始数据（仅在有额外信息时）
    if (jsonData && Object.keys(jsonData).length > 0 && (jsonData.cwd || jsonData.hook_event_name)) {
      content.push('');
      content.push('---');
      content.push('');
      content.push('**🔍 技术详情**:');
      
      if (jsonData.cwd) {
        content.push(`- 📁 工作目录: \`${jsonData.cwd}\``);
      }
      
      if (jsonData.hook_event_name) {
        content.push(`- 🎯 Hook事件: \`${jsonData.hook_event_name}\``);
      }
      
      if (jsonData.tool_name) {
        content.push(`- 🛠️ 工具: \`${jsonData.tool_name}\``);
      }
    }

    const markdownText = content.join('\n');

    // 钉钉API请求体
    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: `${eventType} - ${projectName}`,
        text: markdownText
      }
    };

    let webhookUrl = config.DINGTALK_WEBHOOK;
    
    // 如果配置了加签密钥，需要生成签名
    if (config.DINGTALK_SECRET) {
      const crypto = require('crypto');
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${config.DINGTALK_SECRET}`;
      const sign = crypto.createHmac('sha256', config.DINGTALK_SECRET).update(stringToSign).digest('base64');
      webhookUrl += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }

    // 构建curl命令，写入临时文件避免转义问题
    const tempFile = path.join(require('os').tmpdir(), `dingtalk_payload_${Date.now()}.json`);
    try {
      fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf8');
      const curlCmd = `curl -X POST "${webhookUrl}" ` +
        `-H "Content-Type: application/json" ` +
        `-d @"${tempFile}"`;

      log(`Sending DingTalk notification: ${title}`);
      
      exec(curlCmd, (error, stdout, stderr) => {
        // 清理临时文件
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          // 忽略清理错误
        }
        
        if (error) {
          log(`DingTalk notification failed: ${error.message}`);
          reject(error);
          return;
        }
        
        try {
          const response = JSON.parse(stdout);
          if (response.errcode === 0) {
            log('DingTalk notification sent successfully');
            resolve();
          } else {
            log(`DingTalk API error: ${response.errmsg}`);
            reject(new Error(response.errmsg));
          }
        } catch (parseError) {
          log(`DingTalk response parse error: ${parseError.message}`);
          log(`Response stdout: ${stdout}`);
          reject(parseError);
        }
      });
    } catch (fileError) {
      log(`DingTalk temp file error: ${fileError.message}`);
      reject(fileError);
    }
  });
}

// 发送Bark通知
function sendBarkNotification(config, title, subtitle, body, options = {}) {
  return new Promise((resolve, reject) => {
    const encodedTitle = urlEncode(title);
    const encodedSubtitle = urlEncode(subtitle);
    const encodedBody = urlEncode(body);
    
    let url = `${config.BARK_API}/${config.BARK_KEY}/${encodedTitle}`;
    if (subtitle) url += `/${encodedSubtitle}`;
    if (body) url += `/${encodedBody}`;
    
    const params = new URLSearchParams();
    params.set('group', config.BARK_GROUP);
    
    // 使用配置文件或传入的选项
    const sound = options.sound || config.BARK_SOUND;
    const level = options.level || config.BARK_LEVEL;
    
    if (sound && sound !== 'default') params.set('sound', sound);
    if (level && level !== 'active') params.set('level', level);
    
    url += `?${params.toString()}`;

    log(`Sending Bark notification: ${title}`);
    
    // 使用curl发送请求
    const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
    exec(`${curlCmd} -s "${url}"`, (error, stdout, stderr) => {
      if (error) {
        log(`Bark notification failed: ${error.message}`);
        reject(error);
      } else {
        log('Bark notification sent successfully');
        resolve();
      }
    });
  });
}

// 统一发送通知函数
async function sendNotification(config, title, subtitle, body, options = {}, jsonData = {}) {
  const results = [];
  
  // 发送Bark通知（保持简洁格式）
  if (config.BARK_ENABLED === 'true' && config.BARK_KEY && config.BARK_KEY !== 'YOUR_BARK_KEY') {
    try {
      await sendBarkNotification(config, title, subtitle, body, options);
      results.push('Bark: success');
    } catch (error) {
      results.push(`Bark: failed - ${error.message}`);
    }
  }
  
  // 发送钉钉通知（使用丰富格式）
  if (config.DINGTALK_ENABLED === 'true' && config.DINGTALK_WEBHOOK) {
    try {
      await sendDingTalkNotification(config, title, subtitle, body, jsonData);
      results.push('DingTalk: success');
    } catch (error) {
      results.push(`DingTalk: failed - ${error.message}`);
    }
  }
  
  // 返回结果
  if (results.length > 0) {
    console.log('Notification results:', results.join(', '));
  } else {
    console.log('No notification channels enabled');
  }
  
  return results;
}

// 检查事件是否启用
function isHookEnabled(config, eventType) {
  const hookMap = {
    'UserPrompt': 'HOOK_USER_PROMPT',
    'UserPromptSubmit': 'HOOK_USER_PROMPT',
    'Stop': 'HOOK_STOP',
    'PostToolUse': 'HOOK_POST_TOOL_USE',
    'PreToolUse': 'HOOK_PRE_TOOL_USE',
    'Notification': 'HOOK_NOTIFICATION',
    'Error': 'HOOK_ERROR'
  };
  
  const configKey = hookMap[eventType];
  if (!configKey) {
    return true; // 未知事件类型默认启用
  }
  
  const value = config[configKey];
  if (value === undefined) {
    return true; // 配置不存在默认启用
  }
  
  // 支持多种true值格式
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

// 主函数
async function main() {
  log(`Script started with args: ${process.argv.slice(2).join(', ')}`);
  
  const config = loadConfig();
  log(`Config loaded: BARK_KEY=${config.BARK_KEY.substring(0, 5)}..., API=${config.BARK_API}`);
  if (config._CONFIG_SOURCE) {
    log(`Config source: ${config._CONFIG_TYPE} (${config._CONFIG_SOURCE})`);
  }
  
  const jsonData = await readStdin();
  log(`JSON data received: ${JSON.stringify(jsonData, null, 2)}`);
  
  // 获取系统信息
  const hostname = os.hostname();
  const timestamp = new Date().toLocaleTimeString('en-GB', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  }).replace(/:/g, '');
  
  const projectName = path.basename(process.cwd());
  
  // 解析事件类型（从命令行参数获取）
  const eventType = process.argv[2] || 'Event';
  
  // 检查事件是否启用
  if (!isHookEnabled(config, eventType)) {
    log(`Hook ${eventType} is disabled, skipping notification`);
    return; // 事件被禁用，直接返回
  }
  
  log(`Hook ${eventType} is enabled, proceeding with notification`);
  
  // 构建通知内容
  let title = `${hostname}-${timestamp}-${eventType}`;
  let subtitle = `Project:${projectName}`;
  let body = '';
  let options = {};
  
  // 根据事件类型和JSON数据添加详细信息
  if (eventType === 'UserPrompt' || eventType === 'UserPromptSubmit') {
    // 用户消息事件，显示消息内容摘要
    if (jsonData.prompt) {
      const messagePreview = jsonData.prompt.substring(0, 50).replace(/\n/g, ' ');
      body = `Prompt: ${messagePreview}${jsonData.prompt.length > 50 ? '...' : ''}`;
    } else if (jsonData.message) {
      const messagePreview = jsonData.message.substring(0, 50).replace(/\n/g, ' ');
      body = `Message: ${messagePreview}${jsonData.message.length > 50 ? '...' : ''}`;
    } else {
      const sessionShort = jsonData.session_id ? jsonData.session_id.substring(0, 8) : 'unknown';
      body = `User input received (session: ${sessionShort})`;
    }
  } else if (jsonData.tool_name) {
    // 工具使用事件
    body += `Tool:${jsonData.tool_name}`;
    
    if (jsonData.tool_input && jsonData.tool_input.file_path) {
      const fileName = path.basename(jsonData.tool_input.file_path);
      body += ` File:${fileName}`;
    }
    
    if (jsonData.tool_input && jsonData.tool_input.command) {
      const cmdPreview = jsonData.tool_input.command.substring(0, 30);
      body += ` Cmd:${cmdPreview}${jsonData.tool_input.command.length > 30 ? '...' : ''}`;
    }
    
    if (jsonData.tool_input && jsonData.tool_input.pattern) {
      const pattern = jsonData.tool_input.pattern.substring(0, 20);
      body += ` Pattern:${pattern}${jsonData.tool_input.pattern.length > 20 ? '...' : ''}`;
    }
    
    // 显示工具响应状态
    if (jsonData.tool_response && jsonData.tool_response.userModified !== undefined) {
      const modified = jsonData.tool_response.userModified ? 'modified' : 'clean';
      body += ` (${modified})`;
    }
  } else {
    body = getDetailedMessage(eventType, jsonData);
  }
  
  // 设置特殊事件的选项
  switch (eventType) {
    case 'Error':
      options.sound = 'minuet';
      break;
    case 'Notification':
      options.sound = 'alarm';
      break;
  }
  
  // 发送通知
  log(`Sending notification: ${title} / ${subtitle} / ${body}`);
  await sendNotification(config, title, subtitle, body, options, jsonData);
  log('Notification function called');
}

// 根据事件类型获取详细消息
function getDetailedMessage(eventType, jsonData) {
  switch (eventType) {
    case 'Stop':
      const sessionShort = jsonData.session_id ? jsonData.session_id.substring(0, 8) : 'unknown';
      const stopActive = jsonData.stop_hook_active ? 'active' : 'inactive';
      
      // 尝试读取transcript文件获取最后的Claude输出
      if (jsonData.transcript_path) {
        try {
          if (fs.existsSync(jsonData.transcript_path)) {
            const transcriptContent = fs.readFileSync(jsonData.transcript_path, 'utf8');
            const lines = transcriptContent.trim().split('\n').filter(line => line.trim());
            
            // 查找最后一个assistant消息（按照正确的JSONL格式）
            for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
              try {
                const entry = JSON.parse(lines[i]);
                
                // 根据实际的Claude Code transcript格式
                if (entry.type === 'assistant' && entry.message && entry.message.content) {
                  let content = '';
                  
                  // content是数组格式：[{"type":"text","text":"实际内容"}]
                  if (Array.isArray(entry.message.content)) {
                    for (const item of entry.message.content) {
                      if (item.type === 'text' && item.text) {
                        content += item.text;
                      }
                    }
                  }
                  // 兼容字符串格式
                  else if (typeof entry.message.content === 'string') {
                    content = entry.message.content;
                  }
                  
                  content = content.trim();
                  if (content) {
                    const preview = content.substring(0, 80).replace(/\n/g, ' ');
                    return `Final: ${preview}${content.length > 80 ? '...' : ''}`;
                  }
                }
                
                // 也尝试处理其他可能的格式
                if (entry.role === 'assistant' && entry.content && entry.content.trim()) {
                  const preview = entry.content.substring(0, 80).replace(/\n/g, ' ');
                  return `Output: ${preview}${entry.content.length > 80 ? '...' : ''}`;
                }
              } catch (parseError) {
                continue;
              }
            }
            
            // 如果没找到assistant消息，显示会话统计信息
            const stopReason = jsonData.reason || 'normal';
            return `Session ${sessionShort} ended (${lines.length} msgs, reason: ${stopReason})`;
          } else {
            return `Session ${sessionShort} ended (transcript not found)`;
          }
        } catch (error) {
          return `Session ${sessionShort} ended (read error: ${error.message.substring(0, 20)}...)`;
        }
      }
      
      return `Session ${sessionShort} stopped (hooks: ${stopActive})`;
    
    case 'Notification':
      if (jsonData.message) {
        return `Alert: ${jsonData.message.substring(0, 40)}${jsonData.message.length > 40 ? '...' : ''}`;
      } else if (jsonData.type) {
        return `Notification: ${jsonData.type}`;
      } else {
        return 'System notification received';
      }
    
    case 'Error':
      if (jsonData.error) {
        return `Error: ${jsonData.error.substring(0, 40)}${jsonData.error.length > 40 ? '...' : ''}`;
      } else if (jsonData.message) {
        return `Error: ${jsonData.message.substring(0, 40)}${jsonData.message.length > 40 ? '...' : ''}`;
      } else {
        return 'An error occurred';
      }
    
    case 'PreToolUse':
      if (jsonData.tool_name) {
        return `About to use: ${jsonData.tool_name}`;
      } else {
        return 'Preparing to execute tool';
      }
    
    case 'PostToolUse':
      if (jsonData.tool_name && jsonData.success !== undefined) {
        return `${jsonData.tool_name} ${jsonData.success ? 'succeeded' : 'failed'}`;
      } else if (jsonData.tool_name) {
        return `${jsonData.tool_name} completed`;
      } else {
        return 'Tool execution finished';
      }
    
    default:
      return `${eventType} event triggered`;
  }
}

// 运行主函数
main().catch(console.error);