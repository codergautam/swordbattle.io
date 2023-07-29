const express = require("express")
const userController = require("../controllers/user.controller")


const router = express.Router()

// router.route("/").get(userController.getUser)


router.route("/")
    .post(userController.createUser)


router.route("/:userId")
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser)
// router.route("/").patch(userController.updateUser)
// router.route("/").delete(userController.deleteUser)

module.exports = router