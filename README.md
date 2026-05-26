# @exchangerateapi/mcp-server

[![npm](https://img.shields.io/npm/v/@exchangerateapi/mcp-server.svg)](https://www.npmjs.com/package/@exchangerateapi/mcp-server)
[![license](https://img.shields.io/npm/l/@exchangerateapi/mcp-server.svg)](https://github.com/Exchange-RateAPI/mcp-server/blob/main/LICENSE)

MCP server that gives AI coding tools (Claude Code, Cursor, Claude Desktop, Windsurf) access to real-time and historical currency exchange rates from [Exchange Rate API](https://exchange-rateapi.com).

160+ currencies. Mid-market rates updated every 60 seconds. Sourced from Reuters/Refinitiv.

## Quick Setup

### 1. Get a Free API Key

Sign up at [exchange-rateapi.com/register](https://exchange-rateapi.com/register/) — free tier, no credit card.

### 2. Add to Your MCP Client

**Claude Code** (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "exchange-rateapi": {
      "command": "npx",
      "args": ["-y", "@exchangerateapi/mcp-server"],
      "env": { "EXCHANGE_RATE_API_KEY": "era_live_..." }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "exchange-rateapi": {
      "command": "npx",
      "args": ["-y", "@exchangerateapi/mcp-server"],
      "env": { "EXCHANGE_RATE_API_KEY": "era_live_..." }
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "exchange-rateapi": {
      "command": "npx",
      "args": ["-y", "@exchangerateapi/mcp-server"],
      "env": { "EXCHANGE_RATE_API_KEY": "era_live_..." }
    }
  }
}
```

**Windsurf** (`~/.windsurf/mcp.json`):

```json
{
  "mcpServers": {
    "exchange-rateapi": {
      "command": "npx",
      "args": ["-y", "@exchangerateapi/mcp-server"],
      "env": { "EXCHANGE_RATE_API_KEY": "era_live_..." }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `get_exchange_rate` | Get the current mid-market rate between two currencies |
| `get_historical_rates` | Get historical data for a pair over 1d, 7d, 30d, or 1y |
| `get_rates` | Multi-target rates with date ranges and grouping (day/week/month) |
| `list_currencies` | List all 160+ supported currencies |

## Example Prompts

Once configured, ask your AI assistant:

- "What's the current USD to EUR exchange rate?"
- "Show me GBP/JPY rates for the last 30 days"
- "Convert 5000 USD to EUR, GBP, and JPY"
- "List all supported currencies"
- "What's the monthly average EUR/USD rate for 2026?"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXCHANGE_RATE_API_KEY` | Yes | Your API key from [exchange-rateapi.com](https://exchange-rateapi.com/register/) |
| `EXCHANGE_RATE_BASE_URL` | No | Override API base URL (default: `https://exchange-rateapi.com/api`) |

## Links

- [API Documentation](https://exchange-rateapi.com/docs/)
- [Get Free API Key](https://exchange-rateapi.com/register/)
- [Dashboard](https://exchange-rateapi.com/dashboard/)
- [GitHub](https://github.com/Exchange-RateAPI/mcp-server)

## License

MIT
