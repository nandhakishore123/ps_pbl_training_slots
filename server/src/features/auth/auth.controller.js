import { badRequestResponse, successResponse, unauthorizedResponse, internalServerErrorResponse } from '../../utils/response.js';
import { verifyGoogleToken, refreshAccessToken, logout } from './auth.services.js';
import { verifyRefreshToken, getRefreshTokenMaxAgeMs } from '../../utils/jwt.js';
import { getUserById } from './auth.model.js';
import { getRoleMap } from './auth.model.js';

export const googleLoginHandler = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return badRequestResponse(res, 'Google credential is required');
        }
        const result = await verifyGoogleToken(credential);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            // SESSION LIFETIME: derived from REFRESH_TOKEN_EXPIRY (server/.env),
            // the same value the refresh token itself is signed with. Was a
            // hardcoded 7 days, which could silently disagree with the token.
            // Change the session length in .env only — never here.
            maxAge: getRefreshTokenMaxAgeMs()
        });
        
        return successResponse(res, result.message, {
            accessToken: result.accessToken,
            user: result.user,
            isNewUser: result.isNewUser
        });

    } catch (error) {
        console.error('Error in googleLoginHandler:', error);

        if (error.code === 'USER_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                message: error.message,
                code: 'USER_NOT_FOUND',
                googleData: error.googleData
            });
        }

        if (error.message.includes('Invalid') || error.message.includes('Unauthorized')) {
            return unauthorizedResponse(res, error.message);
        }

        return internalServerErrorResponse(
            res,
            error.message || 'Failed to authenticate with Google'
        );
    }
};

export const refreshTokenHandler = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return unauthorizedResponse(res, 'Refresh token required');
        }
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            return unauthorizedResponse(res, 'Invalid or expired refresh token');
        }
        const result = await refreshAccessToken(refreshToken, decoded);
        
        return successResponse(res, result.message, {
            accessToken: result.accessToken
        });
    } catch (error) {
        console.error('Error in refreshTokenHandler:', error);
        return internalServerErrorResponse(res, error.message || 'Failed to refresh token');
    }
};

export const logoutHandler = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const decoded = verifyRefreshToken(refreshToken);
            if (decoded && decoded.user_id) {
                await logout(decoded.user_id);
            }
        }
        
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });
        
        return successResponse(res, 'Logged out successfully');
    } catch (error) {
        console.error('Error in logoutHandler:', error);
        return internalServerErrorResponse(res, 'Failed to logout');
    }
};

export const getUserDetailsHandler = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return badRequestResponse(res, 'User ID is required');
        }
        const user = await getUserById(userId);
        
        if (!user) {
            return badRequestResponse(res, 'User not found');
        }

        return successResponse(res, 'User details fetched successfully', {
            user_id: user.user_id,
            email: user.email,
            role_id: user.role_id,
            role_name: user.role_name,
            is_active: user.is_active,
            last_login_at: user.last_login_at,
            created_at: user.created_at,
            updated_at: user.updated_at
        });
    } catch (error) {
        console.error('Error in getUserDetailsHandler:', error);
        return internalServerErrorResponse(res, error.message || 'Failed to fetch user details');
    }
};

export const getRolesHandler = async (req, res) => {
    try {
        const roles = await getRoleMap();
        return successResponse(res, 'Roles fetched successfully', { roles });
    } catch (error) {
        console.error('Error in getRolesHandler:', error);
        return internalServerErrorResponse(res, error.message || 'Failed to fetch roles');
    }
};
