#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ExchangeRateAPIClient, ExchangeRateAPIError } from './client.js';

const CCY = {
  type: 'string',
  description: 'ISO 4217 currency code (e.g. USD, EUR, GBP).',
  minLength: 3,
  maxLength: 3,
} as const;

const tools = [
  {
    name: 'get_exchange_rate',
    description:
      'Get the current mid-market exchange rate between two currencies. Returns a single rate. Requires a free Exchange Rate API key (EXCHANGE_RATE_API_KEY) — sign up at https://exchange-rateapi.com/register/.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        source: CCY,
        target: CCY,
      },
      required: ['source', 'target'],
    },
  },
  {
    name: 'get_historical_rates',
    description:
      'Get historical exchange-rate data points for a currency pair over a period. Periods: 1d (hourly), 7d (daily), 30d (daily), 1y (weekly). Requires an Exchange Rate API key (EXCHANGE_RATE_API_KEY).',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        source: CCY,
        target: CCY,
        period: {
          type: 'string',
          enum: ['1d', '7d', '30d', '1y'],
          default: '7d',
          description: 'Time period to fetch history for.',
        },
      },
      required: ['source', 'target'],
    },
  },
  {
    name: 'get_rates',
    description:
      'Get rates with multi-target support and optional date ranges. Supports comma-separated targets like "EUR,GBP,JPY". Optional from/to for date ranges and group for aggregation. Requires an Exchange Rate API key (EXCHANGE_RATE_API_KEY).',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        source: CCY,
        target: {
          type: 'string',
          description: 'One or more target codes, comma-separated.',
        },
        time: {
          type: 'string',
          format: 'date-time',
          description: 'Optional point-in-time ISO 8601 timestamp.',
        },
        from: {
          type: 'string',
          format: 'date-time',
          description: 'Start of date range for historical data.',
        },
        to: {
          type: 'string',
          format: 'date-time',
          description: 'End of date range for historical data.',
        },
        group: {
          type: 'string',
          enum: ['day', 'week', 'month'],
          description: 'Group historical results by period.',
        },
      },
      required: ['source', 'target'],
    },
  },
  {
    name: 'list_currencies',
    description:
      'List all 160+ supported currencies with code, name, and symbol. Requires a free Exchange Rate API key (EXCHANGE_RATE_API_KEY) — sign up at https://exchange-rateapi.com/register/.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
] as const;

function text(s: unknown) {
  const out = typeof s === 'string' ? s : JSON.stringify(s, null, 2);
  return { content: [{ type: 'text', text: out }] };
}

async function main() {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    console.error(
      [
        '',
        '  Exchange Rate API MCP server requires an API key.',
        '',
        '  1. Sign up free at https://exchange-rateapi.com/register/ (no card required)',
        '  2. Copy your API key from the dashboard',
        '  3. Set EXCHANGE_RATE_API_KEY in your MCP client config:',
        '',
        '     "exchange-rateapi": {',
        '       "command": "npx",',
        '       "args": ["-y", "@exchangerateapi/mcp-server"],',
        '       "env": { "EXCHANGE_RATE_API_KEY": "era_live_..." }',
        '     }',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  const client = new ExchangeRateAPIClient({
    apiKey,
    baseUrl: process.env.EXCHANGE_RATE_BASE_URL,
  });

  const server = new Server(
    { name: 'exchange-rateapi-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    try {
      switch (name) {
        case 'get_exchange_rate': {
          const { source, target } = args as { source: string; target: string };
          return text(await client.getRate(source, target));
        }
        case 'get_historical_rates': {
          const { source, target, period = '7d' } = args as {
            source: string; target: string; period?: '1d' | '7d' | '30d' | '1y';
          };
          return text(await client.getHistoricalRates(source, target, period));
        }
        case 'get_rates': {
          return text(await client.getAuthenticatedRates(args as any));
        }
        case 'list_currencies': {
          return text(await client.listSymbols());
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      const message =
        err instanceof ExchangeRateAPIError
          ? `Exchange Rate API error${err.status ? ` (${err.status})` : ''}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
