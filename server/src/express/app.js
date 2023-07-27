require("dotenv").config()
const cors = require("cors")
const express = require("express")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const uri = process.env.MONGO_CONNECTION_URL
const routes = require("./routes/index")
// Creates an express application
// console.log(uri)
mongoose.connect(uri)
mongoose.connection.on("error", (error) => {
    console.log(error)
    process.exit(1)
})

mongoose.connection.on("connected", function () {
    console.log("Successful connection to MongoDB")

})
const app = express()

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(cors())



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

const PORT = process.env.MONGO_PORT || 3000

app.listen(PORT, () => {
    console.log(`\n=== Server listening on ports ${PORT} ===\n`);
})