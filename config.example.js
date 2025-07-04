/**
 * MMAudio Desktop Extension Configuration Example
 * 
 * Copy this file to config.js and fill in your actual values
 * or set the corresponding environment variables.
 */

export const config = {
  // Required: MMAudio API Key
  // Get your API key from: https://mmaudio.net/dashboard/api-keys
  apiKey: process.env.MMAUDIO_API_KEY || 'sk-your-api-key-here',

  // Optional: Base URL for MMAudio API
  baseUrl: process.env.MMAUDIO_BASE_URL || 'https://mmaudio.net',

  // Optional: Request timeout in milliseconds
  timeout: parseInt(process.env.MMAUDIO_TIMEOUT || '60000'),

  // Optional: Log level for debugging
  logLevel: process.env.LOG_LEVEL || 'error',

  // Optional: Enable/disable debug mode
  debug: process.env.DEBUG === 'true' || false,

  // Tool-specific settings
  tools: {
    videoToAudio: {
      maxFileSize: '100MB', // Maximum video file size
      supportedFormats: ['mp4', 'webm', 'avi', 'mov'], // Supported video formats
      defaultDuration: 8, // Default audio duration in seconds
      maxDuration: 30, // Maximum audio duration
    },
    textToAudio: {
      maxPromptLength: 1000, // Maximum prompt length in characters
      defaultDuration: 8, // Default audio duration in seconds
      maxDuration: 30, // Maximum audio duration
    },
  },

  // Rate limiting settings (if implementing client-side rate limiting)
  rateLimit: {
    enabled: false,
    maxRequests: 10, // Maximum requests per window
    windowMs: 60000, // Time window in milliseconds (1 minute)
  },

  // Retry settings for failed requests
  retry: {
    enabled: true,
    maxAttempts: 3,
    backoffMs: 1000, // Initial backoff delay
    backoffMultiplier: 2, // Exponential backoff multiplier
  },
}; 