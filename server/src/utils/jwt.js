import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;

// ── SESSION LIFETIME ─────────────────────────────────────────
// The refresh COOKIE's maxAge must match the refresh TOKEN's expiry. If they
// drift, the session breaks in one of two confusing ways: a cookie the browser
// keeps sending after the server already rejects it, or a still-valid token the
// browser has thrown away. Both are derived from REFRESH_TOKEN_EXPIRY here so
// there is exactly one place to change the session length (server/.env).
//
// Accepts the same shorthand jsonwebtoken does — '3h', '7d', '30m', or a bare
// number (seconds). Falls back to 3 hours if the value is missing or malformed,
// so a bad env value shortens the session rather than silently extending it.
const DEFAULT_REFRESH_MS = 3 * 60 * 60 * 1000;
const UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

export const getRefreshTokenMaxAgeMs = () => {
    const raw = String(REFRESH_TOKEN_EXPIRY ?? '').trim();
    if (!raw) return DEFAULT_REFRESH_MS;
    const match = raw.match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d)?$/i);
    if (!match) return DEFAULT_REFRESH_MS;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return DEFAULT_REFRESH_MS;
    // A unit-less value is seconds, matching jsonwebtoken's own rule.
    const unit = (match[2] || 's').toLowerCase();
    return Math.round(amount * UNIT_MS[unit]);
};

export const generateAccessToken = (payload) => {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (error) {
        return null;
    }
};

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (error) {
        return null;
    }
};

export const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
};

// Hash refresh token for DB storage (SHA256)
export const hashRefreshToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

// Compare refresh token with stored hash
export const compareRefreshToken = (token, hash) => {
    const tokenHash = hashRefreshToken(token);
    return tokenHash === hash;
};