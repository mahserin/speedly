import makeOptional from '../../util/makeOptional';
import  { string, object,array, lazy } from 'yup';
const paramId = object({
  id: string().required('id is required').matches(/^[0-9a-fA-F]{24}$/, 'id is invalid')
})

const schema = object({
    translatedText : string().required('translatedText is required'),
})

//? exports

const put ={
  params: paramId,
  body : makeOptional(schema)
}
export {put}
