
// Atomic Rela Limit Check & Decrement
// KEYS[1] = tokens_key
// KEYS[2] = last_refill_key
// ARGV[1] = max_tokens
// ARGV[2] = refill_rate_ms (tokens per ms, float)
// ARGV[3] = now (timestamp, ms)
// ARGV[4] = cost (tokens to consume, usually 1)
// ARGV[5] = window_ms

// Returns:
// 1 = Allowed
// 0 = Rate Limited (Retry later)
// -1 = Error

// This implementation uses a "lazy refill" strategy similar to the TS version but atomic.

export const acquireTokenScript = `
local tokens_key = KEYS[1]
local refill_key = KEYS[2]
local max_tokens = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2]) 
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

-- Get current state
local tokens = tonumber(redis.call('get', tokens_key))
local last_refill = tonumber(redis.call('get', refill_key))

-- Initialize if missing
if not tokens then
    tokens = max_tokens
end
if not last_refill then
    last_refill = now
end

-- Refill Logic
local elapsed = now - last_refill
if elapsed >= window_ms then
    tokens = max_tokens
    last_refill = now
else
    local refill_rate = max_tokens / window_ms
    local refill_amount = math.floor(elapsed * refill_rate)
    
    if refill_amount > 0 then
        tokens = math.min(max_tokens, tokens + refill_amount)
        last_refill = now -- Simplified for sliding window approximation
    end
end

-- Check & Consume
if tokens >= cost then
    tokens = tokens - cost
    -- Save state with expiry (2x window to keep it around)
    local expiry = math.ceil(window_ms / 1000) * 2
    redis.call('set', tokens_key, tokens, 'EX', expiry)
    redis.call('set', refill_key, last_refill, 'EX', expiry)
    return 1 -- Success
else
    return 0 -- Failed
end
`;
