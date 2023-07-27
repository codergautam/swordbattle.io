const express = require("express")
const userRoute = require("./user.route")

const router = express.Router()



//centralized file for routes.
//this structure allows for the application to be easy to update and add features since everything is organized.

const defaultRoutes = [

    {
        path: "/users",
        route: userRoute
    }
]

// console.log(defaultRoutes[0].path)

defaultRoutes.forEach((route) => {
    console.log(route.route)
    router.use(route.path, route.route)
})



module.exports = router