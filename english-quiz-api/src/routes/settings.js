const express = require('express');
const { getMySetting, updateMySetting } = require('../controllers/settingController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticateToken);

router.get('/me', getMySetting);
router.put('/me', validate('settingUpdate'), updateMySetting);

module.exports = router;
