var express = require('express');
const createStorageToken = require('../../api/authentication/controllers/createStorageToken');
var router = express.Router()


router.post("/jwt", createStorageToken );

module.exports = router