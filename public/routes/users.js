let express = require('express');
let router = express.Router();
let auth = require('../utils/auth');
let dbUtils = require('../utils/database');

router.get('/', auth.isAuthenticated, function (req, res) {
    dbUtils.userInfo().then((userlist) => {
        if (userlist.length === 0) {
            return res.status(404).json({
                message: "No users!?!?",
            })
        }
        return res.status(200).json({
            users: userlist,
        })
    }).catch((err) => {
        console.error(err);
    })
});

/* GET users listing. */
router.get('/:name-:uuid', auth.isAuthenticated, function (req, res, next) {
    dbUtils.userInfo(req.params.name, req.params.uuid).then((user) => {
        if (user.length === 0) {
            return res.status(404).json({
                message: "User not found!",
            })
        }
        return res.status(200).json({
            username: user[0].username,
            uuid: user[0].uuid,
            socketid: user[0].socketid,
        })
    })
});

module.exports = router;
