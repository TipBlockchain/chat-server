let express = require('express');
let router = express.Router();
let dbUtils = require('../utils/database');
let auth = require('../utils/auth');
let bcrypt = require('bcrypt');

/*POST login route*/
router.post('/', function (req, res) {
    let user = {email: req.body.email, password: req.body.password};
    if (user.email && user.password) {
        dbUtils.checkUserPassword(user).then((_res) => {
            if (_res === -1) {
                return res.status(403).json({
                    message: "Email or Password is incorrect"
                });
            }
            if (_res) {
                let info = [];
                dbUtils.userInfoEmail(user.email).then((_res) => {
                    let token = auth.createToken(user);
                    info = _res;
                    return res.status(200).json({
                        token: token,
                        uuid: info[0].uuid,
                        username: info[0].username,
                    });
                })
                    .catch(err => {
                        console.error(err);
                    })
            } else {
                return res.status(403).json({
                    message: "Email or Password is incorrect"
                });
            }
        })
    } else {
        return res.status(400).json({
            message: "Failed!"
        })
    }
});

/*POST register route*/
router.post('/register', function (req, res) {
    let body = req.body;
    if (!body.hasOwnProperty('username') || !body.hasOwnProperty('email') || !body.hasOwnProperty('password'))
        return res.status(400).json({
            message: "Something missing, please double check."
        });

    let uuid;
    min = Math.ceil(1000);
    max = Math.floor(9999);
    uuid = Math.floor(Math.random() * (max - min + 1)) + min;
    let exists = dbUtils.usernameExists(body.username);
    exists.then((_res) => {
        if (_res.length > 0) {
            dbUtils.userInfo(body.username).then((ulist) => {
                for (const element of ulist) {
                    if (uuid === element['uuid']) {
                        uuid = Math.floor(Math.random() * (max - min + 1)) + min;
                    }
                }
            });
        }
    });

    // async hashing call
    bcrypt.hash(body.password, 10, function (err, hash) {
        let newUser = {
            "email": body.email,
            "username": body.username,
            "password": hash,
            "uuid": uuid,
        };
        dbUtils.createUser(newUser, res);
    });
});

/*GET logout route*/
// TODO: Figure out if this is actually needed since we are using only JWT for auth
router.get('/logout');

module.exports = router;
