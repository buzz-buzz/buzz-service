const Router = require('koa-router')
const router = new Router()
const studentClassScheduleController = require('../controllers/studentClassScheduleController')
const BASE_URL = '/api/v1/student-class-schedule'
router.get(`${BASE_URL}/batch/:user_id`, studentClassScheduleController.batchList)
router.get(`${BASE_URL}`, studentClassScheduleController.listAll)
router.get(`${BASE_URL}/:user_id`, studentClassScheduleController.list)
router.post(`${BASE_URL}/:user_id`, studentClassScheduleController.create)
router.put(`${BASE_URL}/:user_id`, studentClassScheduleController.cancel)
router.get(`${BASE_URL}/demo-class/:user_id`, studentClassScheduleController.getDemoClass)
router.get(`${BASE_URL}/latest-end-class/:user_id`, studentClassScheduleController.getLatestEndClass)

module.exports = router
