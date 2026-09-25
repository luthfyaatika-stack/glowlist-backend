const jwt = require('jsonwebtoken');

const secretKey = 'glowlistrahasia';

const authJWT = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({
            message: 'Silahkan login terlebih dahulu'
        });
    }

    const token = authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader;

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            console.log('JWT ERROR:', err.message);

            return res.status(403).json({
                message: 'Token tidak valid'
            });
        }

        req.user = user;
        next();
    });
};

module.exports = authJWT;