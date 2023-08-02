const express = require("express")
const userController = require("../controllers/user.controller")
const auth = require("../middleware/auth")

const router = express.Router()

// router.route("/").get(userController.getUser)


router.route("/")
    .post(auth("manageUsers"),userController.createUser)
    
    router.route("/:userId")
    .get(auth("getUsers"),userController.getUser)
    // .get(userController.getUser)
    .patch(auth("manageUsers"),userController.updateUser)
    .delete(auth("manageUsers"),userController.deleteUser)
// router.route("/").patch(userController.updateUser)
// router.route("/").delete(userController.deleteUser)

module.exports = router