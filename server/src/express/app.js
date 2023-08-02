const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const mongoose = require("mongoose")
const config = require("./config/config")
const passport = require("passport")
const {jwtStrategy} = require("./config/passport")
const routes = require("./routes/index")
const { roles, roleRights } = require("./config/roles")

// Creates an express application
const app = express()

console.log(roles,roleRights)
mongoose.connect(config.mongoose.uri).then(() => {
    console.log("Connected to MongoDB")
    app.listen(config.port, () =>{
        console.log(`listening to port ${config.port}`)
    })
})

// mongoose.connection.on("error", (error) => {
//     console.log(error)
//     process.exit(1)
// })


app.use(helmet())

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())




app.use(passport.initialize())
passport.use("jwt", jwtStrategy)


app.use("/api",routes)


// catches 404 error
app.use((req, res, next) => {
    res.status(404);
    res.json({message : "404 - Not Founddddddddddddddd", req:req.body});
    
})

//error handler
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({
        error: err.stack,
        message: err.message
    })
})
app.get("/status", (req, res, next) => {
    res.status(200)
    res.json({status: "ok"})
})
