const dotenv = require("dotenv")
const path = require("path")

dotenv.config({path : path.join(__dirname, "../../../.env")})

const envVars = process.env


module.exports = {
    mongoose:{
        uri: envVars.MONGO_CONNECTION_URI
    },
    port: envVars.MONGO_PORT,
    jwt:{
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_EXPIRATION_MINUTES,
        refreshExpirationDays:envVars.JWT_EXPIRATION_DAYS
    }

}