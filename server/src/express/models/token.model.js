const mongoose = require("mongoose")

const Schema = mongoose.Schema

const tokenSchema = new Schema({

    token:{
        type:String,
        require: true,
        index:true
    },
    user:{
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
        require: true
    },
    type: {
        type: String,
        enum: ["refresh"],
        required: true

    },
    expires: {
        type: Date,
        required: true,
    },
    blacklisted: {
        type: Boolean,
        default: false

    }

},{timestamps: true})


const Token = mongoose.model("Token",tokenSchema)

module.exports = Token