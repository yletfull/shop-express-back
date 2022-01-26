const Router = require('express');
const { roles } = require('../constants/roles');
const brandController = require('../controllers/brand/brandController');
const checkRoleMiddleware = require('../middleware/checkRoleMiddleware');

const router = new Router();

router.post('/', checkRoleMiddleware(roles.admin), brandController.create);
router.get('/', brandController.getAll);

module.exports = router;
