const { signJwt, verifyJwt, getUserFromAuthHeader } = require('../middleware/jwt');

describe('JWT Authentication', () => {
    test('signs and verifies a valid JWT', () => {
        const payload = { uid: 1, email: 'test@example.com' };
        const token = signJwt(payload);
        const decoded = verifyJwt(token);

        expect(decoded).toBeDefined();
        expect(decoded.uid).toBe(1);
        expect(decoded.email).toBe('test@example.com');
    });

    test('returns null for invalid tokens', () => {
        const decoded = verifyJwt('invalid.token.here');
        expect(decoded).toBeNull();
    });

    test('dev-token returns hardcoded dev user', () => {
        const decoded = verifyJwt('dev-token');
        expect(decoded).toBeDefined();
        expect(decoded.uid).toBe(3);
        expect(decoded.email).toBe('dev@example.com');
    });

    test('getUserFromAuthHeader extracts user from Bearer token', () => {
        const payload = { uid: 42, email: 'user@test.com' };
        const token = signJwt(payload);
        const req = { headers: { 'authorization': `Bearer ${token}` } };

        const user = getUserFromAuthHeader(req);
        expect(user).toBeDefined();
        expect(user.uid).toBe(42);
    });

    test('getUserFromAuthHeader returns null for missing header', () => {
        const req = { headers: {} };
        const user = getUserFromAuthHeader(req);
        expect(user).toBeNull();
    });

    test('getUserFromAuthHeader returns null for non-Bearer header', () => {
        const req = { headers: { 'authorization': 'Basic abc123' } };
        const user = getUserFromAuthHeader(req);
        expect(user).toBeNull();
    });
});
