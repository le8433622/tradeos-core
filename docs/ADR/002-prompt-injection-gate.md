# ADR 002: Prompt Injection Gate Before LLM Call

**Status**: Accepted (2025-03)
**Risk Area**: AI, Security
**Reviewer**: CTO, CCO, CISO

## Context

TradeOS exposes an AI agent that processes inbound trade messages. Users could inject prompts that override system instructions, potentially causing the LLM to execute unauthorized actions.

## Decision

Prompt injection detection is a regex-based gate _before_ any LLM call. The gate:

1. Checks 11 regex patterns covering EN and VI injection vectors
2. On match: returns a review-needed plan with `confidence: 0`, `injectionDetected: true`, zero steps
3. Runs before `detectTradeIntent` — so injection also bypasses keyword detection

The injection check runs in-memory with no LLM cost, making it fast and reliable against known patterns.

## Consequences

- Injected messages never reach the LLM
- Zero false negatives on known EN/VI patterns
- Pattern updates require code change (no runtime configuration)
- Cost-effective: no LLM call needed for blocked messages
