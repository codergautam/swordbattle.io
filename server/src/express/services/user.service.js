const {User} = require("../models")


const createUser = async (userBody) => {
    const user = await User.create(userBody)

    return user
}

const findUserById = async (id) => {
    const user = await User.findById(id)

    return user
}

module.exports = {createUser, findUserById}