const express = require('express');
const { auth, db, validator } = require('speedly/kit');

const v = require('./user.validator');
const c = require('./user.controller');
const router = express.Router();

router.route('/check-phone').post(validator(v.checkPhone), c.checkPhone)
router.route('/register').post(validator(v.register), c.register)
router.route('/me').get(auth.user(), db('user').findOne(req => ({ _id: req.user._id })).populate('role_id').select('-password'))
router.route('/').get(auth.admin({ permission: 'owner' }), db('user').find())
    .post(auth.admin(), validator(v.post), db('user').create())


router.route('/:id').put(auth.admin(), validator(v.put), db('user').findByIdAndUpdate())
    .delete(auth.admin(), validator(v.delete), db('user').findByIdAndDelete())

module.exports = router;