/**
 * Process-based port detector.
 * Reads Antigravity Language Server command line args to extract ports and CSRF token.
 * Uses platform-specific strategies for cross-platform support.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';
import { PlatformDetector, IPlatformStrategy } from './platformDetector';

const execAsync = promisify(exec);

export interface AntigravityProcessInfo {
  /** HTTP port from --extension_server_port */
  extensionPort: number;
  /** HTTPS port for Connect/CommandModelConfigs (detected via testing) */
  connectPort: number;
  csrfToken: string;
}

export class ProcessPortDetector {
  private platformDetector: PlatformDetector;
  private platformStrategy: IPlatformStrategy;
  private processName: string;

  constructor() {
    this.platformDetector = new PlatformDetector();
    this.platformStrategy = this.platformDetector.getStrategy();
    this.processName = this.platformDetector.getProcessName();
  }

  /**
   * Detect credentials (ports + CSRF token) from the running process.
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @param retryDelay Delay between retries in milliseconds (default: 2000)
   */
  async detectProcessInfo(maxRetries: number = 3, retryDelay: number = 2000): Promise<AntigravityProcessInfo | null> {
    const platformName = this.platformDetector.getPlatformName();
    const errorMessages = this.platformStrategy.getErrorMessages();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Attempting to detect Antigravity process (${platformName}, try ${attempt}/${maxRetries})...`);

        // Fetch full command line for the language server process using platform-specific command
        const command = this.platformStrategy.getProcessListCommand(this.processName);
        const { stdout } = await execAsync(command, { timeout: 5000 });

        // Parse process info using platform-specific parser
        const processInfo = this.platformStrategy.parseProcessInfo(stdout);

        if (!processInfo) {
          console.warn(`⚠️ Attempt ${attempt}: ${errorMessages.processNotFound}`);
          throw new Error(errorMessages.processNotFound);
        }

        const { pid, extensionPort, csrfToken } = processInfo;

        console.log('✅ Found process info:');
        console.log(`   PID: ${pid}`);
        console.log(`   extension_server_port: ${extensionPort || '(not found)'}`);
        console.log(`   CSRF Token: ${csrfToken.substring(0, 8)}...`);

        // 获取该进程监听的所有端口
        console.log(`🔍 Fetching listening ports for PID ${pid}...`);
        const listeningPorts = await this.getProcessListeningPorts(pid);

        if (listeningPorts.length === 0) {
          console.warn(`⚠️ Attempt ${attempt}: process is not listening on any ports`);
          throw new Error('Process is not listening on any ports');
        }

        console.log(`✅ Found ${listeningPorts.length} listening ports: ${listeningPorts.join(', ')}`);

        // 逐个测试端口，找到能响应 API 的端口
        console.log('🔍 Testing port connectivity...');
        const connectPort = await this.findWorkingPort(listeningPorts, csrfToken);

        if (!connectPort) {
          console.warn(`⚠️ Attempt ${attempt}: all port tests failed`);
          throw new Error('Unable to find a working API port');
        }

        console.log(`✅ Attempt ${attempt} succeeded!`);
        console.log(`✅ API port (HTTPS): ${connectPort}`);

        return { extensionPort, connectPort, csrfToken };

      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error(`❌ Attempt ${attempt} failed:`, errorMsg);

        // 提供更具体的错误提示
        if (errorMsg.includes('timeout')) {
          console.error('   Reason: command execution timed out; the system may be under heavy load');
        } else if (errorMsg.includes('not found') || errorMsg.includes('not recognized')) {
          console.error(`   Reason: ${errorMessages.commandNotAvailable}`);
        }
      }

      // 如果还有重试机会,等待后重试
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${retryDelay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    console.error(`❌ All ${maxRetries} attempts failed`);
    console.error('   Please ensure:');
    errorMessages.requirements.forEach((req, index) => {
      console.error(`   ${index + 1}. ${req}`);
    });

    return null;
  }

  /**
   * 获取进程监听的所有端口
   */
  private async getProcessListeningPorts(pid: number): Promise<number[]> {
    try {
      const command = this.platformStrategy.getPortListCommand(pid);
      const { stdout } = await execAsync(command, { timeout: 3000 });

      // Parse ports using platform-specific parser
      const ports = this.platformStrategy.parseListeningPorts(stdout);
      return ports;
    } catch (error) {
      console.error('Failed to fetch listening ports:', error);
      return [];
    }
  }

  /**
   * 测试端口列表，找到第一个能响应 API 的端口
   */
  private async findWorkingPort(ports: number[], csrfToken: string): Promise<number | null> {
    for (const port of ports) {
      console.log(`  🔍 Testing port ${port}...`);
      const isWorking = await this.testPortConnectivity(port, csrfToken);
      if (isWorking) {
        console.log(`  ✅ Port ${port} test succeeded!`);
        return port;
      } else {
        console.log(`  ❌ Port ${port} test failed`);
      }
    }
    return null;
  }

  /**
   * 测试端口是否能响应 API 请求
   * 使用 GetUnleashData 端点，因为它不需要用户登录即可访问
   */
  private async testPortConnectivity(port: number, csrfToken: string): Promise<boolean> {
    return new Promise((resolve) => {
      const requestBody = JSON.stringify({
        context: {
          properties: {
            devMode: "false",
            extensionVersion: "",
            hasAnthropicModelAccess: "true",
            ide: "antigravity",
            ideVersion: "1.11.2",
            installationId: "test-detection",
            language: "UNSPECIFIED",
            os: "windows",
            requestedModelId: "MODEL_UNSPECIFIED"
          }
        }
      });

      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: '/exa.language_server_pb.LanguageServerService/GetUnleashData',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          'Connect-Protocol-Version': '1',
          'X-Codeium-Csrf-Token': csrfToken
        },
        rejectUnauthorized: false,
        timeout: 2000
      };

      const req = https.request(options, (res) => {
        // 只要能连接并返回状态码，就认为是成功的
        const success = res.statusCode === 200;
        res.resume(); // 消费响应数据
        resolve(success);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.write(requestBody);
      req.end();
    });
  }
}
