import { verifyAccessToken, getRefreshTokenMaxAgeMs } from '../utils/jwt.js';
import { unauthorizedResponse } from '../utils/response.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorizedResponse(res, 'Access token required');
        }
        const accessToken = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(accessToken);
        
        if (!decoded) {
            return unauthorizedResponse(res, 'Invalid or expired token');
        }
        
        req.user = decoded;
        req.accessToken = accessToken;
        return next();
        
    } catch (error) {
        console.error('Auth error:', error);
        return unauthorizedResponse(res, 'Authentication failed');
    }
};

export const setRefreshTokenCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true, 
        sameSite: 'none',
        // Same single source of truth as the login handler (server/.env
        // REFRESH_TOKEN_EXPIRY). This helper is currently unused, but a
        // hardcoded 7 days here would be a trap for whoever adopts it.
        maxAge: getRefreshTokenMaxAgeMs()
    });
};