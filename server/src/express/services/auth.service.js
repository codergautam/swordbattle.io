const httpStatus = require("http-status")
const tokenService = require("./token.service")
const userService = require("./user.service")
const Token = require("../models/token.model")
const ApiError = require("../utils/ApiError")
const { tokenTypes } = require("../config/tokens")


const loginUserWithEmailAndPassword = async (email, password) =>{

    const user = await userService.findUserByEmail(email)
    const validPassword = await user.isValidPassword(password)
    if(!user || !validPassword){
        throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password")
    }

    return user
}

const logout = async (refreshToken) =>{
    const refreshTokenDoc = await Token.findOne({token:refreshToken, type: tokenTypes.REFRESH, blacklisted: false})

    if(!refreshTokenDoc){
        throw new ApiError(httpStatus.NOT_FOUND, "Not found")
    }
    await refreshTokenDoc.deleteOne({token: refreshToken})
}

const refreshAuth = async (refreshToken) =>{

    try{
        const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH)
        const user = await userService.findUserById(refreshTokenDoc.user)
        if(!user){
            throw new Error()
        }
        await refreshTokenDoc.deleteOne({token: refreshToken})
        return tokenService.generateAuthToken(user)
    } catch(error) {
        throw new ApiError(httpStatus.UNAUTHORIZED,"Please authenticate")
 
    }
}


module.exports = {
    loginUserWithEmailAndPassword, logout, refreshAuth
}