const express = require('express');
const { auth, db, validator } = require('speedly/kit');

const v = require('./blog.validator');

const router = express.Router();

router.route('/').get(db('blog').find().populate([{ path: 'author_id', select: '-password -phone' }, 'thumbnail_id']))
    .post(auth.admin(), validator(v.post), db('blog').create(req => ({ author_id: req.user._id })))

router.get('/:slug', db('blog').findOneAndUpdate(req => ({ slug: req.params.slug }, { $inc: { views: 1 } })).populate([{ path: 'author_id', select: '-password -phone' }, 'thumbnail_id']))
router.route('/:id').put(auth.admin(), validator(v.put), db('blog').findByIdAndUpdate())
    .delete(auth.admin(), validator(v.delete), db('blog').findByIdAndDelete())

module.exports = router;