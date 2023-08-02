const httpStatus = require("http-status")
const catchAsync = require("../utils/catchAsync")
const {authService, userService, tokenService} = require("../services")
const ApiError = require("../utils/ApiError")

const register = catchAsync(async (req, res)=>{
    const user = await userService.createUser(req.body)
    const tokens = await tokenService.generateAuthToken(user)
    
    res.status(httpStatus.CREATED).send({user,tokens})
})


const login = catchAsync(async (req, res) =>{
    const {email, password} = req.body
    const user = await authService.loginUserWithEmailAndPassword(email,password)
    const tokens = await tokenService.generateAuthToken(user)
    res.send({user, tokens})
})

const logout = catchAsync(async (req,res) => {
    await authService.logout(req.body.refreshToken)
    // console.log(await authService.logout(req.body.refreshToken))
    res.status(httpStatus.NO_CONTENT).send()
})

const refreshTokens = catchAsync((req, res) =>{
    const tokens = authService.refreshAuth(req.body.refreshToken)
    res.send({...tokens})
})

module.exports = {register,login,logout,refreshTokens}