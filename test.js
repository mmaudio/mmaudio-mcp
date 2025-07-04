#!/usr/bin/env node

/**
 * MMAudio Desktop Extension - Test Script
 * 
 * This script validates that the MCP server is working correctly
 * and can handle basic requests.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MMAudioTester {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log('🧪 MMAudio Desktop Extension Test Suite\n');

    try {
      await this.testServerStart();
      await this.testToolsList();
      await this.testSchemaValidation();
      await this.testErrorHandling();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Test server startup
   */
  async testServerStart() {
    console.log('📋 Testing server startup...');
    
    try {
      // Test that server can start without API key (should show config error)
      const result = await this.runMCPCommand({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      }, { timeout: 5000, expectError: true });

      if (result.error && result.error.message.includes('API key')) {
        this.addTestResult('Server startup', true, 'Server correctly validates API key requirement');
      } else {
        this.addTestResult('Server startup', false, 'Server should require API key');
      }
    } catch (error) {
      this.addTestResult('Server startup', false, `Server startup failed: ${error.message}`);
    }
  }

  /**
   * Test tools listing
   */
  async testToolsList() {
    console.log('📋 Testing tools listing...');
    
    try {
      // Set a dummy API key for this test
      const result = await this.runMCPCommand({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      }, { 
        env: { MMAUDIO_API_KEY: 'test-key' },
        timeout: 5000 
      });

      if (result.result && result.result.tools) {
        const tools = result.result.tools;
        const expectedTools = ['video_to_audio', 'text_to_audio', 'validate_api_key'];
        const foundTools = tools.map(t => t.name);
        
        const allToolsFound = expectedTools.every(tool => foundTools.includes(tool));
        
        if (allToolsFound) {
          this.addTestResult('Tools listing', true, `Found all expected tools: ${foundTools.join(', ')}`);
        } else {
          this.addTestResult('Tools listing', false, `Missing tools. Found: ${foundTools.join(', ')}, Expected: ${expectedTools.join(', ')}`);
        }
      } else {
        this.addTestResult('Tools listing', false, 'No tools found in response');
      }
    } catch (error) {
      this.addTestResult('Tools listing', false, `Tools listing failed: ${error.message}`);
    }
  }

  /**
   * Test schema validation
   */
  async testSchemaValidation() {
    console.log('📋 Testing schema validation...');
    
    try {
      // Test invalid tool call
      const result = await this.runMCPCommand({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'text_to_audio',
          arguments: {
            // Missing required prompt
            duration: 8
          }
        },
        id: 1
      }, { 
        env: { MMAUDIO_API_KEY: 'test-key' },
        timeout: 5000,
        expectError: true
      });

      if (result.error && result.error.message.includes('prompt')) {
        this.addTestResult('Schema validation', true, 'Server correctly validates required parameters');
      } else {
        this.addTestResult('Schema validation', false, 'Server should validate required parameters');
      }
    } catch (error) {
      this.addTestResult('Schema validation', false, `Schema validation test failed: ${error.message}`);
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('📋 Testing error handling...');
    
    try {
      // Test unknown tool
      const result = await this.runMCPCommand({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        },
        id: 1
      }, { 
        env: { MMAUDIO_API_KEY: 'test-key' },
        timeout: 5000,
        expectError: true
      });

      if (result.error && result.error.message.includes('Unknown tool')) {
        this.addTestResult('Error handling', true, 'Server correctly handles unknown tools');
      } else {
        this.addTestResult('Error handling', false, 'Server should handle unknown tools gracefully');
      }
    } catch (error) {
      this.addTestResult('Error handling', false, `Error handling test failed: ${error.message}`);
    }
  }

  /**
   * Run an MCP command against the server
   */
  async runMCPCommand(command, options = {}) {
    const { timeout = 10000, env = {}, expectError = false } = options;
    
    return new Promise((resolve, reject) => {
      const serverPath = resolve(__dirname, 'server/index.js');
      
      const child = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...env }
      });

      let stdout = '';
      let stderr = '';
      let timeoutId;

      // Set timeout
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      // Collect output
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('exit', (code) => {
        clearTimeout(timeoutId);
        
        try {
          // Try to parse the last JSON response from stdout
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          let response = null;
          
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              response = JSON.parse(lines[i]);
              break;
            } catch (e) {
              // Continue looking for valid JSON
            }
          }

          if (response) {
            resolve(response);
          } else if (expectError && stderr.includes('error')) {
            // If we expect an error and see error in stderr, that's okay
            resolve({ error: { message: stderr } });
          } else {
            reject(new Error(`No valid JSON response found. stdout: ${stdout}, stderr: ${stderr}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}. stdout: ${stdout}, stderr: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      // Send the command
      child.stdin.write(JSON.stringify(command) + '\n');
      child.stdin.end();
    });
  }

  /**
   * Add a test result
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({
      name: testName,
      passed,
      message
    });
    
    const icon = passed ? '✅' : '❌';
    console.log(`   ${icon} ${testName}: ${message}`);
  }

  /**
   * Print final test results
   */
  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
      
      console.log('\n💡 Next steps:');
      console.log('   1. Check that Node.js >= 18.0.0 is installed');
      console.log('   2. Run "npm install" to install dependencies');
      console.log('   3. Set MMAUDIO_API_KEY environment variable');
      console.log('   4. Check the server logs for detailed error messages');
      
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! The MMAudio Desktop Extension is working correctly.');
      console.log('\n💡 Next steps:');
      console.log('   1. Get your API key from https://mmaudio.net/dashboard/api-keys');
      console.log('   2. Configure your MCP client (Cursor, Claude Desktop, etc.)');
      console.log('   3. Start using the MMAudio tools in your AI assistant!');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MMAudioTester();
  tester.runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
} 