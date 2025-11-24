/**
 * Process-based port detector.
 * Reads Antigravity Language Server command line args to extract ports and CSRF token.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AntigravityProcessInfo {
  /** HTTP port from --extension_server_port */
  extensionPort: number;
  /** HTTPS port for Connect/CommandModelConfigs (usually extension_port + 1) */
  connectPort: number;
  csrfToken: string;
}

export class ProcessPortDetector {
  /**
   * Detect credentials (ports + CSRF token) from the running process.
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @param retryDelay Delay between retries in milliseconds (default: 2000)
   */
  async detectProcessInfo(maxRetries: number = 3, retryDelay: number = 2000): Promise<AntigravityProcessInfo | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 尝试检测 Antigravity 进程 (第 ${attempt}/${maxRetries} 次)...`);

        // Fetch full command line for the language server process.
        const { stdout } = await execAsync(
          'wmic process where "name=\'language_server_windows_x64.exe\'" get CommandLine /format:list',
          { timeout: 5000 }
        );

        const portMatch = stdout.match(/--extension_server_port[=\s]+(\d+)/);
        const tokenMatch = stdout.match(/--csrf_token[=\s]+([a-f0-9\-]+)/i);

        if (portMatch && portMatch[1] && tokenMatch && tokenMatch[1]) {
          const extensionPort = parseInt(portMatch[1], 10);
          // Observed rule: Connect port is extension_server_port + 1 (e.g., 63462 -> 63463)
          const connectPort = extensionPort + 1;
          const csrfToken = tokenMatch[1];

          console.log(`✅ 第 ${attempt} 次尝试成功!`);
          console.log(`✅ extension_server_port (HTTP): ${extensionPort}`);
          console.log(`✅ inferred Connect port (HTTPS): ${connectPort}`);
          console.log(`✅ CSRF Token: ${csrfToken.substring(0, 8)}...`);

          return { extensionPort, connectPort, csrfToken };
        }

        console.warn(`⚠️ 第 ${attempt} 次尝试: 未能提取完整信息 (端口或 CSRF Token 缺失)`);
        if (stdout.length > 0) {
          console.warn('⚠️ Process stdout sample:', stdout.substring(0, 200));
        } else {
          console.warn('⚠️ Process stdout 为空,可能 language_server_windows_x64.exe 未运行');
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error(`❌ 第 ${attempt} 次尝试失败:`, errorMsg);

        // 提供更具体的错误提示
        if (errorMsg.includes('timeout')) {
          console.error('   原因: 命令执行超时,系统可能负载较高');
        } else if (errorMsg.includes('not found') || errorMsg.includes('not recognized')) {
          console.error('   原因: wmic 命令不可用,请检查系统环境');
        }
      }

      // 如果还有重试机会,等待后重试
      if (attempt < maxRetries) {
        console.log(`⏳ 等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    console.error(`❌ 所有 ${maxRetries} 次尝试均失败`);
    console.error('   请确保:');
    console.error('   1. Antigravity 正在运行');
    console.error('   2. language_server_windows_x64.exe 进程存在');
    console.error('   3. 系统有足够权限执行 wmic 命令');

    return null;
  }
}
