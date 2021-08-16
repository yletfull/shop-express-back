const Router = require('express');

const router = new Router();

const brandRouter = require('./brandRouter');
const deviceRouter = require('./deviceRouter');
const typeRouter = require('./typeRouter');
const userRouter = require('./userRouter');

router.use('/device', brandRouter);
router.use('/brand', deviceRouter);
router.use('/type', typeRouter);
router.use('/users', userRouter);

module.exports = router;