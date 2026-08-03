# Exchange Rate API

> Exchange Rate API rules and best practices for Cursor

**Tags:** TypeScript · JavaScript · Python · PHP · Rust · React · Node.js · MCP · REST API · Currency · Forex · FX · Caching · Zod

`Add to Cursor`  ·  `Copy`  ·  3 rules

> Modeled on the format at https://cursor.directory/plugins/nextjs — paste the
> section below into a cursor.directory "rules" submission, or save it as
> `.cursor/rules/exchange-rate-api.mdc` in any project that consumes the API.

---

## Exchange Rate API Generalist Cursor Rules

This guide outlines conventions and best practices for integrating
**[Exchange Rate API](https://exchange-rateapi.com)** — real-time and historical
foreign-exchange rates for 160+ currencies (mid-market, sourced from
institutional interbank market data, refreshed every ~60 seconds) — into applications and AI agents.

It covers the REST API, the official SDKs (JavaScript, Python, PHP, Rust), and the
MCP server (`@exchangerateapi/mcp-server`).

### Core Philosophy

- Prefer the **official SDK** for your language over hand-rolled `fetch`/`curl` calls.
- Treat the API key as a **server-side secret** — never ship it to a browser bundle.
- **Cache** rates; they only change every ~60s. Do not call the API on every render.
- Always handle the **rate-limit (429)** and **auth (401)** cases explicitly.
- Use **mid-market rates as a reference**, not as a settlement/trading price.

### Authentication & Secrets

- Get a free key at https://exchange-rateapi.com/register (300 requests/month, no card).
- Key format: `era_live_…`. Store it in the `EXCHANGE_RATE_API_KEY` environment variable.
- Load it from `process.env` / `os.environ` / `$_ENV` — never inline it in source.
- For browser apps, proxy through your own backend; the browser must never see the key.
- The keyless open endpoint (`/api/rate`) needs no key but requires visible attribution
  (see "Open endpoint & attribution").

```bash
# .env  (never commit)
EXCHANGE_RATE_API_KEY=era_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Choosing the Right Endpoint

- **Single live pair** → `GET /api/v1/rates?source=USD&targets=EUR` (authenticated) or the
  keyless `GET /api/rate?source=USD&target=EUR`.
- **Multiple targets in one call** → `GET /api/v1/rates?source=USD&targets=EUR,GBP,JPY`.
  Prefer one multi-target call over N single calls — it costs one request, not N.
- **Historical / time series** → add `from`, `to`, and `group=day|week|month`.
- **List supported currencies** → `GET /api/v1/symbols` → `{ currencies: [{ code, name, symbol }] }`.
- Send the API key as a bearer token: `Authorization: Bearer era_live_…`.

Response shape (note the `data` envelope):

```json
{ "data": { "rate": 0.87127, "source": "USD", "target": "EUR", "time": "2026-06-20T17:39:39+0000" } }
```

### SDK Conventions

Install the official SDK rather than calling the API directly:

```bash
npm install @exchangerateapi/sdk        # JavaScript / TypeScript / Node / Deno / Bun
pip install exchangerateapi             # Python  (import name: exchangerateapi)
composer require exchangerateapi/sdk    # PHP
cargo add exchange-rateapi              # Rust
```

```ts
import { ExchangeRateAPI } from '@exchangerateapi/sdk'

// Constructor takes an options object (not a bare string).
const fx = new ExchangeRateAPI({ apiKey: process.env.EXCHANGE_RATE_API_KEY })

const one  = await fx.getRate('USD', 'EUR')                  // single pair (optional 3rd arg = amount)
const many = await fx.getRates('USD', ['EUR', 'GBP', 'JPY']) // multi-target
const hist = await fx.getHistoricalRates('USD', 'EUR', '30d')// historical: '1d' | '7d' | '30d' | '1y'
const conv = await fx.convert('USD', 'EUR', 100)             // convert: (source, target, amount)
const all  = await fx.latest({ base: 'USD', symbols: ['EUR', 'GBP'] }) // latest snapshot
```

```python
from exchangerateapi import ExchangeRateAPI

fx = ExchangeRateAPI(api_key="era_live_...")
rate = fx.get_rate("USD", "EUR")
```

- SDK methods: `latest`, `forDate`, `timeSeries`, `convert`, `getRate`, `getRates`,
  `getHistoricalRates`, `symbols` (snake_case in Python/Rust: `get_rate`, `for_date`, …).
- `getHistoricalRates(source, target, period)` takes a period string; use `timeSeries(start, end, opts)`
  for an explicit date range. `convert(source, target, amount)`.
- Construct the client **once** and reuse it; don't instantiate per request.
- Let the SDK build URLs and parse the `data` envelope — don't unwrap it by hand.

### MCP Server (AI agents in Cursor / Claude)

Give an AI agent live FX access via the MCP server. Add to `.cursor/mcp.json`:

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

Exposed tools:

| Tool | Purpose |
|---|---|
| `get_exchange_rate` | Current mid-market rate between two currencies (`source`, `target`) |
| `get_historical_rates` | Historical data for a pair over `1d` / `7d` / `30d` / `1y` |
| `get_rates` | Multi-target rates with date ranges and grouping (`day`/`week`/`month`) |
| `list_currencies` | List all 160+ supported currencies |

- Restart Cursor after editing `mcp.json`.
- The server refuses to start without `EXCHANGE_RATE_API_KEY` and prints registration
  instructions — set the key first.

### Error Handling & Resilience

- **401 Unauthorized** → missing/invalid key. Surface a clear "check your API key" message;
  do not retry.
- **429 Too Many Requests** → monthly quota or rate limit hit. Back off; respect
  `X-RateLimit-Reset`; suggest upgrading the plan rather than hammering.
- **5xx / network error** → retry with exponential backoff (e.g. 250ms → 1s → 4s, max 3),
  then fall back to the last cached rate.
- Validate `source`/`target` against `list_currencies` before calling; reject unknown ISO codes early.
- Never silently swallow errors — log the status and the currency pair.

### Caching & Rate Limits

- Cache rates for **at least 60 seconds** (the refresh cadence). Key the cache by `source:target`.
- For dashboards, fetch on an interval (e.g. every 60–300s), not per component render.
- Batch with `targets=` to convert many currencies in a single request.
- Free tier = 300 requests/month — budget accordingly; one multi-target call = one request.

### Currency & Amount Handling

- Currency codes are **ISO 4217**, uppercase (`USD`, `EUR`, `JPY`). Normalize input to uppercase.
- Do conversion as `amount * rate`; round **only for display**, keep full precision internally.
- Format for humans with `Intl.NumberFormat(locale, { style: 'currency', currency })`.
- Mid-market rates have no markup/spread — state that in any UI that shows them to end users.

### Security & Compliance

- API key lives server-side only; for client UIs, expose a thin proxy endpoint you control.
- Don't log full API keys; mask to `era_live_…` in logs.
- Rates are a **reference** (mid-market), not a quote you can transact on — don't present them
  as guaranteed settlement prices.

### Open Endpoint & Attribution

- `GET /api/rate?source=USD&target=EUR` is **keyless, CORS-enabled, free**, and ideal for
  static sites, demos, and client-side widgets.
- In return it requires a **visible attribution link**:
  `<a href="https://exchange-rateapi.com">Rates by Exchange Rate API</a>`.
- For production apps wanting dedicated quota, historical data, and no attribution, use a
  free API key instead. See https://exchange-rateapi.com/open-api/.

### Links

- Website: https://exchange-rateapi.com
- Docs: https://exchange-rateapi.com/docs/
- Register (free key): https://exchange-rateapi.com/register/
- npm (MCP): https://www.npmjs.com/package/@exchangerateapi/mcp-server
- GitHub: https://github.com/Exchange-RateAPI
