/**
 * Authentication module mainly used by Node and Express
 * @module utils/auth
 */
let jwt = require('jsonwebtoken');
const secret = process.env.JWTSECRET || 'testing secret string is super secret, please change.';

/**
 * @desc Middleware function to check if the user is authenticated or not.
 * @param req
 * @param res
 * @param next
 * @returns {express.Response} response - if there's an issue returns a non-200 status code
 * @returns next() - continue on
 */
function isAuthenticated(req, res, next) {
    if ((req.headers['x-access-token'] || req.headers['authorization']) === undefined) {
        return res.status(401).json({
            message: 'Auth token is not supplied'
        });
    }
    let token = req.headers['x-access-token'] || req.headers['authorization'];
    if (token.startsWith('Bearer ')) {
        // Slice out 'Bearer '
        token = token.slice(7, token.length);
    }
    if (token) {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                return res.status(402).json({
                    message: 'Token is not valid'
                });
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        return res.status(402).json({
            message: 'Auth token is not supplied'
        });
    }
}

/**
 * @description Creates the users JWT for authentication
 * @param {object} userinfo
 * @returns {string} jwt
 */
function createToken(userinfo) {
    return jwt.sign({username: userinfo.email},
        secret,
        {
            expiresIn: '24h' // expires in 24 hours
        }
    );
}

module.exports = {
    isAuthenticated: isAuthenticated,
    createToken: createToken,
};
