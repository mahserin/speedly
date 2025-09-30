import mongoose from 'mongoose'

const schema = new mongoose.Schema({
    text : {type : String , required : true},
    lang : {type : String , required : true ,},
    translatedText : {type : String , required : true},
}, {timestamps : true})

const model = mongoose.model('translation' , schema)


export default model