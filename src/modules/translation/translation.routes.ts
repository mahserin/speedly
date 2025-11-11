import express from 'express';
import auth from '../../auth/auth';
import model from '../../db/db';
import validator from '../../validator/validator';
const v = require('./translation.validator');

const router = express.Router();

router.route('/').get( (model('translation') as any).find() )
.post((req,res,next)=> {
    if(!req.body.auth || req.body.auth !== 'OKPJWSJD_Sdki') {
        return res.status(403).json({message : "Access Denied"})
    }
    next()
},(model('translation') as any).create())
router.route('/:id').put(auth.admin(), validator(v.put), (model('translation') as any).findByIdAndUpdate())

export default router;