const Router = require('koa-router')
const router = new Router()
const mobileController = require('../controllers/mobileController')
const BASE_URL = '/api/v1/mobile'
router.post(`${BASE_URL}/sms`, mobileController.sendVerificationSms)
router.post(`${BASE_URL}/verify`, mobileController.verifyByCode)
router.get(`${BASE_URL}/countryList`, mobileController.countryList)

module.exports = router
