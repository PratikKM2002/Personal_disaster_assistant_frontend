const { match } = require('../utils/url');
const { validateCoords, validatePositiveInt } = require('../utils/validate');

describe('URL Pattern Matching', () => {
    test('matches simple path', () => {
        const result = match('GET', '/family', { method: 'GET', path: '/family' });
        expect(result).not.toBeNull();
        expect(result.params).toEqual({});
    });

    test('matches path with params', () => {
        const result = match('GET', '/hazards/42', { method: 'GET', path: '/hazards/:id' });
        expect(result).not.toBeNull();
        expect(result.params).toEqual({ id: '42' });
    });

    test('returns null for method mismatch', () => {
        const result = match('POST', '/family', { method: 'GET', path: '/family' });
        expect(result).toBeNull();
    });

    test('returns null for path mismatch', () => {
        const result = match('GET', '/user', { method: 'GET', path: '/family' });
        expect(result).toBeNull();
    });

    test('parses query parameters', () => {
        const result = match('GET', '/hazards?lat=37.7&lon=-122.4', { method: 'GET', path: '/hazards' });
        expect(result).not.toBeNull();
        expect(result.search.get('lat')).toBe('37.7');
        expect(result.search.get('lon')).toBe('-122.4');
    });

    test('returns null for different segment count', () => {
        const result = match('GET', '/family/members/all', { method: 'GET', path: '/family/members' });
        expect(result).toBeNull();
    });
});

describe('Coordinate Validation', () => {
    test('accepts valid coordinates', () => {
        expect(validateCoords(37.7, -122.4)).toEqual({ lat: 37.7, lon: -122.4 });
    });

    test('accepts boundary coordinates', () => {
        expect(validateCoords(90, 180)).toEqual({ lat: 90, lon: 180 });
        expect(validateCoords(-90, -180)).toEqual({ lat: -90, lon: -180 });
    });

    test('rejects out-of-range lat', () => {
        expect(validateCoords(91, 0)).toBeNull();
        expect(validateCoords(-91, 0)).toBeNull();
    });

    test('rejects out-of-range lon', () => {
        expect(validateCoords(0, 181)).toBeNull();
        expect(validateCoords(0, -181)).toBeNull();
    });

    test('rejects NaN inputs', () => {
        expect(validateCoords('abc', 0)).toBeNull();
        expect(validateCoords(0, 'xyz')).toBeNull();
    });

    test('accepts string numbers', () => {
        expect(validateCoords('37.7', '-122.4')).toEqual({ lat: 37.7, lon: -122.4 });
    });
});

describe('Positive Integer Validation', () => {
    test('returns valid number within range', () => {
        expect(validatePositiveInt(50)).toBe(50);
    });

    test('returns default for invalid input', () => {
        expect(validatePositiveInt('abc')).toBe(100);
    });

    test('clamps to max', () => {
        expect(validatePositiveInt(2000, { max: 500 })).toBe(500);
    });

    test('returns default for below min', () => {
        expect(validatePositiveInt(0, { min: 1 })).toBe(100);
    });

    test('floors floats', () => {
        expect(validatePositiveInt(7.9)).toBe(7);
    });
});

describe('Family Code Validation (Business Logic)', () => {
    test('valid family codes accepted by regex', () => {
        const regex = /^[A-Za-z0-9_-]{1,30}$/;
        expect(regex.test('SMITH_FAMILY')).toBe(true);
        expect(regex.test('abc123')).toBe(true);
        expect(regex.test('my-family-code')).toBe(true);
    });

    test('invalid family codes rejected by regex', () => {
        const regex = /^[A-Za-z0-9_-]{1,30}$/;
        expect(regex.test('')).toBe(false);
        expect(regex.test('a'.repeat(31))).toBe(false);
        expect(regex.test('code with spaces')).toBe(false);
        expect(regex.test('code@special!')).toBe(false);
        expect(regex.test('code;DROP TABLE')).toBe(false);
    });
});
