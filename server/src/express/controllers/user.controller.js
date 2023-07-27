const catchAsync = require("../utils/catchAsync")
const {userService} = require("../services")



const createUser = catchAsync(async (req, res) => {
    const {email,password,username} = req.body
    const user = await userService.createUser(req.body)
    res.status(200).json({user})
})

const getUser = catchAsync(async (req, res) => {
    const user = await userService.findUserById(req.params.id)
    if(!user){
    res.status(401).json("User not found")
    return
}
    return user
})


module.exports = {createUser}