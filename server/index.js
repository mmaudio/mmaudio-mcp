#!/usr/bin/env node

/**
 * MMAudio Desktop Extension - MCP Server
 * 
 * This server implements the Model Context Protocol (MCP) to provide
 * AI-powered video-to-audio and text-to-audio generation capabilities
 * as a Desktop Extension compatible with Cursor and other MCP clients.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration schemas
const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url().default('https://mmaudio.net'),
  timeout: z.number().min(5000).max(300000).default(60000),
});

// Input schemas for tools
const VideoToAudioInputSchema = z.object({
  video_url: z.string().url('Invalid video URL'),
  prompt: z.string().min(1, 'Prompt is required'),
  negative_prompt: z.string().optional().default(''),
  seed: z.number().int().optional().nullable(),
  num_steps: z.number().int().min(1).max(50).default(25),
  duration: z.number().min(1).max(30).default(8),
  cfg_strength: z.number().min(1).max(10).default(4.5),
});

const TextToAudioInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  duration: z.number().min(1).max(30).default(8),
  num_steps: z.number().int().min(1).max(50).default(25),
  cfg_strength: z.number().min(1).max(10).default(4.5),
  negative_prompt: z.string().optional().default(''),
  seed: z.number().int().optional().default(0),
});

// Response schemas
const AudioResponseSchema = z.object({
  url: z.string().url(),
  content_type: z.string(),
  file_name: z.string(),
  file_size: z.number(),
});

const VideoToAudioResponseSchema = z.object({
  video: AudioResponseSchema,
});

const TextToAudioResponseSchema = z.object({
  audio: AudioResponseSchema,
});

class MMAudioServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mmaudio-dxt',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.config = null;
    this.setupHandlers();
  }

  /**
   * Load configuration from environment variables or manifest
   */
  loadConfig() {
    try {
      const config = {
        apiKey: process.env.MMAUDIO_API_KEY || process.env.apiKey,
        baseUrl: process.env.MMAUDIO_BASE_URL || process.env.baseUrl || 'https://mmaudio.net',
        timeout: parseInt(process.env.MMAUDIO_TIMEOUT || process.env.timeout || '60000'),
      };

      this.config = ConfigSchema.parse(config);
      
      if (!this.config.apiKey) {
        throw new Error('MMAudio API key is required. Please set MMAUDIO_API_KEY environment variable.');
      }

      console.error(`[MMAudio] Server configured with base URL: ${this.config.baseUrl}`);
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Configuration error: ${error.message}`
      );
    }
  }

  /**
   * Setup MCP protocol handlers
   */
  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'video_to_audio',
            description: 'Generate AI-powered audio from video content using MMAudio technology. Analyzes video frames and generates synchronized audio including sound effects, ambient noise, and atmospheric elements.',
            inputSchema: {
              type: 'object',
              properties: {
                video_url: {
                  type: 'string',
                  format: 'uri',
                  description: 'URL of the video file to generate audio for (supports mp4, webm, avi, mov formats)',
                },
                prompt: {
                  type: 'string',
                  description: 'Describe the audio you want to generate (e.g., "forest sounds with birds chirping", "urban traffic noise", "peaceful ocean waves")',
                },
                negative_prompt: {
                  type: 'string',
                  description: 'Describe what you want to avoid in the generated audio (optional)',
                  default: '',
                },
                seed: {
                  type: 'integer',
                  description: 'Random seed for reproducible results (optional)',
                  nullable: true,
                },
                num_steps: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 50,
                  default: 25,
                  description: 'Number of inference steps (higher = better quality, slower)',
                },
                duration: {
                  type: 'number',
                  minimum: 1,
                  maximum: 30,
                  default: 8,
                  description: 'Duration of generated audio in seconds',
                },
                cfg_strength: {
                  type: 'number',
                  minimum: 1,
                  maximum: 10,
                  default: 4.5,
                  description: 'Classifier-free guidance strength (higher = more adherence to prompt)',
                },
              },
              required: ['video_url', 'prompt'],
            },
          },
          {
            name: 'text_to_audio',
            description: 'Generate AI-powered audio content from text descriptions using MMAudio technology. Create sound effects, ambient audio, music, and atmospheric soundscapes from natural language descriptions.',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Describe the audio you want to generate (e.g., "rain falling on leaves", "coffee shop ambiance", "futuristic sci-fi sounds")',
                },
                duration: {
                  type: 'number',
                  minimum: 1,
                  maximum: 30,
                  default: 8,
                  description: 'Duration of generated audio in seconds',
                },
                num_steps: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 50,
                  default: 25,
                  description: 'Number of inference steps (higher = better quality, slower)',
                },
                cfg_strength: {
                  type: 'number',
                  minimum: 1,
                  maximum: 10,
                  default: 4.5,
                  description: 'Classifier-free guidance strength (higher = more adherence to prompt)',
                },
                negative_prompt: {
                  type: 'string',
                  description: 'Describe what you want to avoid in the generated audio (optional)',
                  default: '',
                },
                seed: {
                  type: 'integer',
                  default: 0,
                  description: 'Random seed for reproducible results',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'validate_api_key',
            description: 'Validate MMAudio API key and check account credits/status',
            inputSchema: {
              type: 'object',
              properties: {
                api_key: {
                  type: 'string',
                  description: 'MMAudio API key to validate (optional, uses configured key if not provided)',
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'video_to_audio':
            return await this.handleVideoToAudio(args);
          case 'text_to_audio':
            return await this.handleTextToAudio(args);
          case 'validate_api_key':
            return await this.handleValidateApiKey(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        console.error(`[MMAudio] Error in ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  /**
   * Handle video-to-audio generation
   */
  async handleVideoToAudio(args) {
    this.ensureConfigured();

    try {
      const input = VideoToAudioInputSchema.parse(args);
      
      console.error(`[MMAudio] Starting video-to-audio generation for: ${input.video_url}`);

      const response = await fetch(`${this.config.baseUrl}/api/video-to-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'MMAudio-DXT/1.0.0',
        },
        body: JSON.stringify(input),
        timeout: this.config.timeout,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        if (response.status === 401) {
          throw new McpError(ErrorCode.InvalidRequest, 'Invalid API key. Please check your MMAudio API key.');
        } else if (response.status === 403) {
          throw new McpError(ErrorCode.InvalidRequest, 'Insufficient credits for video-to-audio generation.');
        } else if (response.status === 429) {
          throw new McpError(ErrorCode.InvalidRequest, 'Rate limit exceeded. Please try again later.');
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      const validatedResult = VideoToAudioResponseSchema.parse(result);

      console.error(`[MMAudio] Video-to-audio generation completed successfully`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Audio generated successfully from video',
              result: {
                audio_url: validatedResult.video.url,
                content_type: validatedResult.video.content_type,
                file_name: validatedResult.video.file_name,
                file_size: validatedResult.video.file_size,
                duration: input.duration,
                prompt: input.prompt,
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid input parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Handle text-to-audio generation
   */
  async handleTextToAudio(args) {
    this.ensureConfigured();

    try {
      const input = TextToAudioInputSchema.parse(args);
      
      console.error(`[MMAudio] Starting text-to-audio generation for prompt: "${input.prompt}"`);

      const response = await fetch(`${this.config.baseUrl}/api/text-to-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'MMAudio-DXT/1.0.0',
        },
        body: JSON.stringify(input),
        timeout: this.config.timeout,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        if (response.status === 401) {
          throw new McpError(ErrorCode.InvalidRequest, 'Invalid API key. Please check your MMAudio API key.');
        } else if (response.status === 403) {
          throw new McpError(ErrorCode.InvalidRequest, 'Insufficient credits for text-to-audio generation.');
        } else if (response.status === 429) {
          throw new McpError(ErrorCode.InvalidRequest, 'Rate limit exceeded. Please try again later.');
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      const validatedResult = TextToAudioResponseSchema.parse(result);

      console.error(`[MMAudio] Text-to-audio generation completed successfully`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Audio generated successfully from text',
              result: {
                audio_url: validatedResult.audio.url,
                content_type: validatedResult.audio.content_type,
                file_name: validatedResult.audio.file_name,
                file_size: validatedResult.audio.file_size,
                duration: input.duration,
                prompt: input.prompt,
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid input parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Handle API key validation
   */
  async handleValidateApiKey(args) {
    const apiKey = args.api_key || this.config?.apiKey;
    
    if (!apiKey) {
      throw new McpError(ErrorCode.InvalidRequest, 'No API key provided');
    }

    try {
      console.error(`[MMAudio] Validating API key...`);

      // Try to fetch credits/usage endpoint to validate the key
      const response = await fetch(`${this.config?.baseUrl || 'https://mmaudio.net'}/api/credits`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'MMAudio-DXT/1.0.0',
        },
        timeout: 10000,
      });

      if (response.status === 401) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                valid: false,
                message: 'Invalid API key',
                error: 'Authentication failed'
              }, null, 2),
            },
          ],
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      
      console.error(`[MMAudio] API key validation successful`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              valid: true,
              message: 'API key is valid',
              credits: data.credits || 'Unknown',
              account_status: 'Active'
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[MMAudio] API key validation failed:`, error);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              valid: false,
              message: 'Failed to validate API key',
              error: error.message
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Ensure server is configured
   */
  ensureConfigured() {
    if (!this.config) {
      this.loadConfig();
    }
  }

  /**
   * Start the MCP server
   */
  async start() {
    try {
      this.loadConfig();
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error('[MMAudio] MCP Server started successfully');
      console.error(`[MMAudio] API Base URL: ${this.config.baseUrl}`);
      console.error('[MMAudio] Available tools: video_to_audio, text_to_audio, validate_api_key');
    } catch (error) {
      console.error('[MMAudio] Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new MMAudioServer();
server.start().catch((error) => {
  console.error('[MMAudio] Fatal error:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[MMAudio] Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MMAudio] Shutting down server...');
  process.exit(0);
}); 