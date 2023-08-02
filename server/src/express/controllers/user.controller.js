const httpStatus = require("http-status")
const ApiError = require("../utils/ApiError")
const catchAsync = require("../utils/catchAsync")
const {userService} = require("../services")



const createUser = catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body)
    res.status(200).send(user)
})

const getUser = catchAsync(async (req, res) => {
    const {userId} = req.params
    const user = await userService.findUserById(userId)
    if(!user){
     throw new ApiError(httpStatus.NOT_FOUND, "User not found")
}
    res.send(user)
})

const updateUser = catchAsync(async (req,res) => {
    const {userId} = req.params
    const user = await userService.updateUserById(userId, req.body)
    res.status(200).send(user)
})

const deleteUser = catchAsync(async (req,res) => {
    const {userId} = req.params
    await userService.deleteUserById(userId)
    res.status(httpStatus.NO_CONTENT).send()
})


module.exports = {createUser, getUser,updateUser,deleteUser}