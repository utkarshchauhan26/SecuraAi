const express = require('express');
const router = express.Router();
const githubController = require('../controllers/github.controller');

// Routes
router.post('/clone', githubController.cloneRepository);
router.get('/validate/:owner/:repo', githubController.validateRepository);

module.exports = router;