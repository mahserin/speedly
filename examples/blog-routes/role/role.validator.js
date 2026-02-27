const makeOptional = require("../../util/makeOptional");
const { string, object, array, lazy, boolean } = require("../../yup.config");

const paramId = object({
    id: string().required('id is required').oid('id is invalid')
})

const schema = object({
    title: string().required('title is required'),
    access: string().required('access is required').oneOf(['OWNER', 'ADMIN', 'EXPERT'], 'access must be one of OWNER, ADMIN, EXPERT')
})

//? exports

exports.post = {
    body: lazy(value =>
        Array.isArray(value)
            ? array().of(schema)
            : schema
    )
}
exports.put = {
    params: paramId,
    body: makeOptional(schema)
}
exports.delete = {
    params: paramId
}