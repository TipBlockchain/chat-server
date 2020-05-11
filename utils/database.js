/**
 * Database interaction file, any and all interactions that can be modularized and covered are here.
 * @module utils/database
 */
const mongoose = require('mongoose');
let bcrypt = require('bcrypt');

mongoose.connect('mongodb://localhost:27017/ChatApp', {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
});
let mondb = mongoose.connection;
mondb.on("error", console.error.bind(console, "connection error!"));
mondb.once("open", function (callback) {
    console.log("Connection succeeded!");
});

/**
 * @desc User schema definition
 * @type {mongoose.Schema}
 */
const UserSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    uuid: Number,
    socketid: {
        type: String,
        default: null,
    },
}, {timestamps: true,});

let User = mongoose.model('User', UserSchema);

/**
 * @async
 * @desc checks if the username exists, used for ensuring uuid collision is avoided.
 * @param {string} username
 * @returns {Promise|Promise<void>|PromiseLike<any>|Promise<any>}
 */
function usernameExists(username) {
    return User.find({username: username}).select("username uuid -_id").exec().then((user) => {
        return user;
    })
}

/**
 * @async
 * @desc fetches all public information for a user
 * @param {string} username
 * @param {string} uuid
 * @returns {Promise<T>}
 */
function userInfo(username, uuid) {
    if (username === undefined && uuid === undefined) {
        return User.find().select("username uuid -_id")
            .exec()
            .then((userlist) => {
                return userlist;
            })
            .catch((err) => {
                console.error(err);
            })
    } else if (uuid === undefined) {
        return User.find({username: username}).select("username uuid -_id")
            .exec()
            .then((user) => {
                return user;
            }).catch((err) => {
                console.error(err);
            })
    } else {
        return User.find({username: username, uuid: uuid}).select("username uuid socketid -_id")
            .exec()
            .then((user) => {
                return user;
            }).catch((err) => {
                console.error(err);
            })
    }
}

/**
 * @async
 * @desc given an email, this function will fetch the user. Mainly used internally.
 * @param {string} email
 * @returns {Promise<T>}
 */
function userInfoEmail(email) {
    return User.find({email: email}).select("username uuid")
        .exec()
        .then((user) => {
            if (user.length === 0) {
                return -1;
            }
            return user;
        })
        .catch((err) => {
            console.error(err);
        })
}

/**
 * @desc given the user object and a response object, it will attempt to create the user and then tell the client if it was successful or not
 * @param {object} newUserObj - object containing username, email, hashed password.
 * @param {express.Response} response
 * @returns {express.Response} response
 */
function createUser(newUserObj, response) {
    let newUser = new User(newUserObj);
    return newUser.save((err) => {
        if (err) {
            console.error(err);
            return response.status(500).json({message: "Error creating account"});
        } else {
            console.log("created record!");
            return response.status(200).json({message: "Account Created, please login!"});
        }
    });
}

/**
 * @async
 * @desc Checks if the supplied password matches the hash on record.
 * @param {object} userinfo - contains email and password
 * @returns {Promise<T>}
 */
function checkUserPassword(userinfo) {
    return User.find({email: userinfo.email}).select("password")
        .exec()
        .then((user) => {
            if (user.length === 0) {
                return -1;
            }
            let passhash = user[0].password;
            return bcrypt.compare(userinfo.password, passhash);
        })
        .catch((err) => {
            console.error(err);
        })
}

/**
 * @desc Used to update the users socketid in the database.
 * @param {object} userinfo - contains username, uuid
 * @param {string} socketid
 */
function setSocketID(userinfo, socketid) {
    let filter = {username: userinfo.username, uuid: userinfo.uuid};
    let update = {socketid: socketid};
    let query = User.findOneAndUpdate(filter, update);
    query.exec();
}

module.exports = {
    mongoose: mondb,
    usernameExists: usernameExists,
    userInfo: userInfo,
    userInfoEmail: userInfoEmail,
    createUser: createUser,
    checkUserPassword: checkUserPassword,
    setSocketID: setSocketID,
};
