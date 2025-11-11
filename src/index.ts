import auth from './auth/auth'
import  db from './db/db'
import  uploader from './uploader/uploader'
import  validator from './validator/validator'
import translation from './model/translation'
import translationRoute from './modules/translation/translation.routes'
const models = {translation}
const modules = {translation : translationRoute}
export { auth, db, uploader, validator ,models}

