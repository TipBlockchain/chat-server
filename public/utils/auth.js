let jwt = require('jsonwebtoken');
const secret = process.env.JWTSECRET || 'testing secret string is super secret, please change.';

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