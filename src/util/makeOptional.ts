import yup from 'yup';
export default function (schema :{ [key : string] : any}) {
    if(schema.fields){
        const shape: { [key: string]: any } = {}
        for (const key in schema.fields) {
    shape[key] = schema.fields[key].optional()                
        }
    return yup.object().shape(shape)
    }
    return schema
}