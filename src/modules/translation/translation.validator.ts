// const makeOptional = require("../../util/makeOptional");
// import makeOptional from '../../util/'
const { string, object,array, lazy } = require("../../yup.config");

const paramId = object({
  id: string().required('id is required').oid('id is invalid')
})

const schema = object({
    translatedText : string().required('translatedText is required'),
})

//? exports

exports.put ={
  params: paramId,
  // body : makeOptional(schema)
}
