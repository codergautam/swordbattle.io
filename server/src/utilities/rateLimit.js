const rateLimits = new Map();

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute
const BLOCK_DURATION = 300000; // 5 minutes block for exceeding limit
const BLOCKED_IPS = new Set();

function isIPBlocked(ip) {
    return BLOCKED_IPS.has(ip);
}

function checkRateLimit(ip) {
    const now = Date.now();
    
    // Check if IP is blocked
    if (BLOCKED_IPS.has(ip)) {
        const blockData = BLOCKED_IPS.get(ip);
        if (now > blockData) {
            BLOCKED_IPS.delete(ip);
        } else {
            return false;
        }
    }
    
    const data = rateLimits.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    
    // Reset counter if window expired
    if (now > data.resetTime) {
        data.count = 1;
        data.resetTime = now + RATE_LIMIT_WINDOW;
        rateLimits.set(ip, data);
        return true;
    }
    
    data.count++;
    rateLimits.set(ip, data);
    
    // Block IP if limit exceeded
    if (data.count > MAX_REQUESTS_PER_WINDOW) {
        BLOCKED_IPS.add(ip);
        setTimeout(() => BLOCKED_IPS.delete(ip), BLOCK_DURATION);
        return false;
    }
    
    return true;
}

module.exports = {
    checkRateLimit,
    isIPBlocked
};