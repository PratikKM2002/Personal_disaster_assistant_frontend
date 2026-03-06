const { rateLimit } = require('../middleware/rate-limiter');

describe('Rate Limiter', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            headers: {},
            socket: { remoteAddress: `127.0.0.${Math.random().toString().slice(2, 5)}` },
        };
        mockRes = {
            headers: {},
            setHeader: jest.fn((key, val) => { mockRes.headers[key] = val; }),
            writeHead: jest.fn(),
            end: jest.fn(),
        };
    });

    test('allows requests under the limit', () => {
        const blocked = rateLimit(mockReq, mockRes, { max: 5, windowMs: 60000 });
        expect(blocked).toBe(false);
        expect(mockRes.writeHead).not.toHaveBeenCalled();
    });

    test('sets rate limit headers', () => {
        rateLimit(mockReq, mockRes, { max: 10, windowMs: 60000 });
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
    });

    test('blocks requests over the limit', () => {
        const ip = '192.168.1.' + Math.floor(Math.random() * 255);
        const req = { headers: {}, socket: { remoteAddress: ip } };
        const res = {
            headers: {},
            setHeader: jest.fn(),
            writeHead: jest.fn(),
            end: jest.fn(),
        };

        // Send max+1 requests
        const max = 3;
        for (let i = 0; i < max; i++) {
            rateLimit(req, res, { max, windowMs: 60000 });
        }

        const blocked = rateLimit(req, res, { max, windowMs: 60000 });
        expect(blocked).toBe(true);
        expect(res.writeHead).toHaveBeenCalledWith(429, { 'Content-Type': 'application/json' });
    });

    test('returns 429 JSON body when blocked', () => {
        const ip = '10.0.0.' + Math.floor(Math.random() * 255);
        const req = { headers: {}, socket: { remoteAddress: ip } };
        const res = {
            headers: {},
            setHeader: jest.fn(),
            writeHead: jest.fn(),
            end: jest.fn(),
        };

        const max = 1;
        rateLimit(req, res, { max, windowMs: 60000 });
        rateLimit(req, res, { max, windowMs: 60000 });

        const body = JSON.parse(res.end.mock.calls[0][0]);
        expect(body.error).toBe('Too Many Requests');
        expect(body.retryAfter).toBeDefined();
    });

    test('uses x-forwarded-for header when available', () => {
        const forwardedReq = {
            headers: { 'x-forwarded-for': '203.0.113.50' },
            socket: { remoteAddress: '127.0.0.1' },
        };
        const blocked = rateLimit(forwardedReq, mockRes, { max: 100, windowMs: 60000 });
        expect(blocked).toBe(false);
    });
});
