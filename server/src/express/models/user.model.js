const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const Schema = mongoose.Schema

const UserSchema = new Schema({
    email: {
        type: String,
        required : true,
        unique : true
    },
    password : {
        type: String,
        required: true
    },
    username : {
        type : String,
        required: true
    },
    playTime : {
        type : Number,
        default : 0
    },
    coins : {
        type : Number,
        default : 0
    },
    gems : {
        type: Number,
        default : 0
    },
    gamesPlayed : {
        type: Number,
        default : 0
    },
    skins : {
        type : [String],
        default : []
    },
    
},{timestamps : true})

// Important: avoid using arrow function in these middlewares because of conflict with using "this" keyword in arrow functions.
// User is equal to the context of the function which in this case would be the UserSchema.
//then we will hash "this.password" which would be the UserSchema object and we are taking the password property.
// and assigning it a new value which is the hashed password.
//then move on onto next step.
UserSchema.pre("save", async function (next) {
    const user = this
    const hash = await bcrypt.hash(this.password, 10)
    this.password = hash
    next()
})

//Same concept as previous function, but in this one we are comparing the passed in password with the hashed one from the document
// and returning it
UserSchema.methods.isValidPassword = async function (password) {
    const user = this
    const compare = await bcrypt.compare(password, user.password)
    return compare
}

const UserModel = mongoose.model("user", UserSchema);

module.exports = UserModel