# MMAudio Desktop Extension (DXT)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)

AI-powered video-to-audio and text-to-audio generation using MMAudio's advanced AI technology. This Desktop Extension implements the Model Context Protocol (MCP) to provide seamless integration with Cursor, Claude Desktop, and other MCP-compatible clients.

## 🌟 Features

- **Video-to-Audio Generation**: Transform video content into synchronized audio with AI-powered analysis
- **Text-to-Audio Generation**: Create professional audio content from text descriptions
- **API Key Validation**: Verify MMAudio API credentials and check account status
- **MCP Protocol**: Full Model Context Protocol implementation for universal compatibility
- **Error Handling**: Comprehensive error handling with detailed feedback
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Configurable**: Flexible configuration options for different use cases

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MMAudio API key ([Get one here](https://mmaudio.net/dashboard/api-keys))
- MCP-compatible client (Cursor, Claude Desktop, etc.)

### Installation

1. **Clone or download this extension**:
   ```bash
   cd mcp
   npm install
   ```

2. **Configure your API key**:
   ```bash
   # Set environment variable
   export MMAUDIO_API_KEY="sk-your-api-key-here"
   
   # Or create a config.js file (copy from config.example.js)
   cp config.example.js config.js
   # Edit config.js with your API key
   ```

3. **Test the installation**:
   ```bash
   npm start
   ```

### Usage with Cursor

1. **Add to your Cursor MCP configuration**:
   ```json
   {
     "mcpServers": {
       "mmaudio": {
         "command": "node",
         "args": ["path/to/mcp/server/index.js"],
         "env": {
           "MMAUDIO_API_KEY": "sk-your-api-key-here"
         }
       }
     }
   }
   ```

2. **Restart Cursor** and the MMAudio tools will be available in your AI assistant.

### Usage with Claude Desktop

1. **Add to your Claude Desktop configuration** (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "mmaudio": {
         "command": "node",
         "args": ["path/to/mcp/server/index.js"],
         "env": {
           "MMAUDIO_API_KEY": "sk-your-api-key-here"
         }
       }
     }
   }
   ```

2. **Restart Claude Desktop** to load the extension.

## 🛠️ Available Tools

### 1. Video-to-Audio Generation

Generate AI-powered audio from video content.

**Tool Name**: `video_to_audio`

**Parameters**:
- `video_url` (required): URL of the video file
- `prompt` (required): Description of the audio you want to generate
- `negative_prompt` (optional): What to avoid in the generated audio
- `duration` (optional): Audio duration in seconds (1-30, default: 8)
- `num_steps` (optional): Number of inference steps (1-50, default: 25)
- `cfg_strength` (optional): Guidance strength (1-10, default: 4.5)
- `seed` (optional): Random seed for reproducible results

**Example**:
```
Generate audio for this video: https://example.com/video.mp4 with the prompt "peaceful forest sounds with birds chirping and gentle wind"
```

### 2. Text-to-Audio Generation

Create audio content from text descriptions.

**Tool Name**: `text_to_audio`

**Parameters**:
- `prompt` (required): Description of the audio you want to generate
- `duration` (optional): Audio duration in seconds (1-30, default: 8)
- `num_steps` (optional): Number of inference steps (1-50, default: 25)
- `cfg_strength` (optional): Guidance strength (1-10, default: 4.5)
- `negative_prompt` (optional): What to avoid in the generated audio
- `seed` (optional): Random seed for reproducible results

**Example**:
```
Create audio with the description "coffee shop ambiance with gentle chatter and espresso machine sounds"
```

### 3. API Key Validation

Validate your MMAudio API key and check account status.

**Tool Name**: `validate_api_key`

**Parameters**:
- `api_key` (optional): API key to validate (uses configured key if not provided)

**Example**:
```
Validate my MMAudio API key
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MMAUDIO_API_KEY` | Your MMAudio API key | Yes | - |
| `MMAUDIO_BASE_URL` | Base URL for MMAudio API | No | `https://mmaudio.net` |
| `MMAUDIO_TIMEOUT` | Request timeout in milliseconds | No | `60000` |
| `LOG_LEVEL` | Log level (error, warn, info, debug) | No | `error` |
| `DEBUG` | Enable debug mode | No | `false` |

### Configuration File

You can also use a `config.js` file for configuration:

```javascript
export const config = {
  apiKey: 'sk-your-api-key-here',
  baseUrl: 'https://mmaudio.net',
  timeout: 60000,
  // ... other options
};
```

## 📝 Example Usage

### Video-to-Audio Example

```javascript
// In your MCP client (Cursor, Claude Desktop, etc.)
"Please generate audio for this video URL: https://example.com/nature_video.mp4"
"I want forest sounds with birds chirping and a gentle breeze"
"Duration should be 10 seconds"
```

### Text-to-Audio Example

```javascript
// Create ambient audio
"Generate 15 seconds of coffee shop ambiance with gentle background chatter"

// Create sound effects
"Create the sound of rain falling on a wooden roof for 8 seconds"

// Create atmospheric audio
"Generate futuristic sci-fi ambient sounds for a space station"
```

## 🔧 Development

### Project Structure

```
mcp/
├── server/index.js              # Main MCP server implementation
├── package.json           # Node.js dependencies and scripts
├── manifest.json          # DXT extension manifest
├── config.example.js      # Configuration example
├── README.md              # This file
└── test.js                # Test script (optional)
```

### Testing

1. **Test the server directly**:
   ```bash
   npm start
   ```

2. **Test with a simple MCP client**:
   ```bash
   echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | npm start
   ```

3. **Run validation tests**:
   ```bash
   npm test
   ```

### Development Mode

Run the server in development mode with debugging:

```bash
npm run dev
```

This enables additional logging and the Node.js inspector for debugging.

## 🚨 Troubleshooting

### Common Issues

#### 1. "API key is required" Error

**Problem**: The extension can't find your API key.

**Solution**:
- Ensure you've set the `MMAUDIO_API_KEY` environment variable
- Or create a `config.js` file with your API key
- Verify the API key is correct and active

#### 2. "Connection refused" or Network Errors

**Problem**: Can't connect to MMAudio API.

**Solution**:
- Check your internet connection
- Verify the base URL is correct
- Check if there are any firewall restrictions

#### 3. "Insufficient credits" Error

**Problem**: Your MMAudio account doesn't have enough credits.

**Solution**:
- Check your account balance at [mmaudio.net/dashboard](https://mmaudio.net/dashboard)
- Purchase additional credits if needed
- Use the `validate_api_key` tool to check your account status

#### 4. MCP Client Not Detecting Extension

**Problem**: Your MCP client (Cursor, Claude Desktop) doesn't show MMAudio tools.

**Solution**:
- Verify the configuration path in your MCP client settings
- Ensure Node.js is in your PATH
- Check the server logs for errors
- Restart your MCP client

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=true MMAUDIO_API_KEY=your-key node server/index.js
```

### Logs

The server logs to stderr. You can redirect logs to a file:

```bash
node server/index.js 2> mmaudio.log
```

## 📄 API Reference

### Response Format

All tools return responses in this format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\": true, \"message\": \"...\", \"result\": {...}}"
    }
  ]
}
```

### Success Response Example

```json
{
  "success": true,
  "message": "Audio generated successfully from text",
  "result": {
    "audio_url": "https://example.com/generated_audio.wav",
    "content_type": "audio/wav",
    "file_name": "generated_audio.wav",
    "file_size": 1024000,
    "duration": 8,
    "prompt": "coffee shop ambiance"
  }
}
```

### Error Response Example

```json
{
  "success": false,
  "error": "Invalid API key. Please check your MMAudio API key.",
  "code": "INVALID_REQUEST"
}
```

## 🔒 Security

- API keys are handled securely and not logged
- All requests use HTTPS
- The extension runs in a sandboxed environment
- No sensitive data is stored locally

## 📖 Related Documentation

- [MMAudio API Documentation](https://mmaudio.net/docs)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Cursor MCP Integration Guide](https://docs.cursor.sh/mcp)
- [Claude Desktop MCP Setup](https://claude.ai/docs/mcp)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- [MMAudio Support](mailto:support@mmaudio.net)
- [GitHub Issues](https://github.com/mmaudio/mmaudio-mcp/issues)
- [Documentation](https://mmaudio.net/dashboard/api-key)

---

**Made with ❤️ by the MMAudio Team** 