const httpStatus = require("http-status")
const {User} = require("../models")
const ApiError = require("../utils/ApiError")


const createUser = async (userBody) => {
    const user = await User.create(userBody)

    return user
}

const findUserById = async (userId) => {
    const user = await User.findById(userId)

    return user
}

const findUserByEmail = async (email) => {
    const user = await User.findOne({email})

    return user
}

const findUserByUsername = async(username) =>{
    const user = await User.findOne(username)

    return user
}

const updateUserById = async(userId, updateBody) => {
    const user = await findUserById(userId)

    if(!user){
        throw new ApiError(httpStatus.NOT_FOUND, "User not found")
    }


    Object.assign(user, updateBody)
    await user.save()
    return user
}

const deleteUserById = async (userId) => {
    const user = await findUserById(userId)

    if(!user){
        throw new ApiError(httpStatus.NOT_FOUND, "user not found")
    }
    await user.deleteOne()
    return user
}

module.exports = {createUser, findUserById, findUserByEmail, findUserByUsername, updateUserById, deleteUserById}