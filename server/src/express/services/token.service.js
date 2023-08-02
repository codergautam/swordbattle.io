const jwt = require("jsonwebtoken")
const moment = require("moment")
const httpStatus = require("http-status")
const userService = require("../services/user.service")
const {Token} = require("../models")
const ApiError = require("../utils/ApiError")
const config = require("../config/config")
const {tokenTypes} = require("../config/tokens")
const generateToken = (userId, expires, type, secret = config.jwt.secret) =>{

    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type
    }

    return jwt.sign(payload, secret)
}


const saveToken = async (token, userId, expires, type, blacklisted = false) => {
    const tokenDoc = await Token.create({
        token,
        user:userId,
        expires: expires.toDate(),
        type,
        blacklisted
    })
    return tokenDoc
}

const verifyToken = async (token, type) =>{
    const payload = jwt.verify(token,config.jwt.secret)
    const tokenDoc = await Token.findOne({token, type, user: payload.sub, blacklisted: false})

    if(!tokenDoc){
        throw new Error("Token was not found!")
    }
    return tokenDoc
}
const generateAuthToken = async (user) => {

    const accessTokenExpires= moment().add(config.jwt.accessExpirationMinutes,"minutes")
    const accessToken = generateToken(user._id,accessTokenExpires,tokenTypes.ACCESS)

    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays,"days")
    const refreshToken = generateToken(user._id, refreshTokenExpires, "refresh")
    await saveToken(refreshToken, user._id, refreshTokenExpires, tokenTypes.REFRESH)

    return {
        access:{
            token: accessToken,
            expires: accessTokenExpires.toDate()
        },
        refresh:{
            token: refreshToken,
            expires: refreshTokenExpires.toDate()
        }
    }
}


module.exports = {
    generateToken,
    saveToken,
    verifyToken,
    generateAuthToken
}