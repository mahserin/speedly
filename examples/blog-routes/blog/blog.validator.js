const makeOptional = require("../../util/makeOptional");
const { string, object,array, lazy,number } = require("../../yup.config");

const paramId = object({
  id: string().required('id is required').oid('id is invalid')
})

const schema = object({
 title :string().required(),
  slug : string().required().matches(/[\d\w]+/i ,'slug can contain english letter or numbers and dash'),
  subTitle : string(),
  category_id : string().oid(),
  thumbnail_id : array().media({image: {max : 1}}),
  content : string(),
  tag_ids : array(string().oid()),
  status : string().oneOf(['draft', 'published', 'hidden']),
  priority : number()
})

//? exports

exports.post = {
body: lazy(value =>
Array.isArray(value)
? array().of(schema)
: schema
)
}
exports.put ={
  params: paramId,
  body : makeOptional(schema)
}
exports.delete = {
  params : paramId
}