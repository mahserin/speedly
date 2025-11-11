import yup from 'yup';
export default function (schema) {
    if(schema.fields){
        const shape = {}
        for (const key in schema.fields) {
    shape[key] =schema.fields[key].optional()                
        }
    return yup.object().shape(shape)
    }
    return schema
}