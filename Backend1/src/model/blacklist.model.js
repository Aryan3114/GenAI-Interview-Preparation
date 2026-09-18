const mongoose=require('mongoose')

const blacklistTokenSchema=new mongoose.Schema({
    token:{
        type:String,
        required:[true,"token is required to be blacklisted"]
    }
},
{
    timestamps: true
})

const tokenBlacklistModel= mongoose.model("blacklisttoken",blacklistTokenSchema)

module.exports = tokenBlacklistModel