const express = require('express');
const { auth, db, validator } = require('speedly/kit');

const v = require('./role.validator');

const router = express.Router();

router.route('/').get(auth.admin({ permission: 'OWNER' }), db('role').find())
    .post(auth.admin({ permission: 'OWNER' }), validator(v.post), db('role').create())

router.route('/:id').put(auth.admin({ permission: 'OWNER' }), validator(v.put), db('role').findByIdAndUpdate())
    .delete(auth.admin({ permission: 'OWNER' }), validator(v.delete), db('role').findByIdAndDelete())

module.exports = router;