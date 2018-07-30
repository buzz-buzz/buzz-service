const Router = require('koa-router')
const router = new Router()
const classScheduleController = require('../controllers/classScheduleController')
const BASE_URL = '/api/v1/class-schedule'
router.get(`${BASE_URL}/suggested-classes`, classScheduleController.listSuggested)
router.get(`${BASE_URL}/optional/:class_id`, classScheduleController.getOptionalByClassId)
router.post(`${BASE_URL}/joinOptional/:class_id`, classScheduleController.joinOptionalByClassId)
router.get(`${BASE_URL}/optional`, classScheduleController.getOptionalList)
router.get(`${BASE_URL}`, classScheduleController.list)
router.get(`${BASE_URL}/getByUserId/:user_id`, classScheduleController.getByUserId)
router.get(`${BASE_URL}/listByUserId/:user_id`, classScheduleController.listByUserId)
router.get(`${BASE_URL}/:class_id`, classScheduleController.getClassByClassId)
router.post(`${BASE_URL}`, classScheduleController.upsert)
router.put(`${BASE_URL}`, classScheduleController.change)
router.put(`${BASE_URL}/:class_id`, classScheduleController.endClass)
router.post(`${BASE_URL}/sendDayClassBeginMsg`, classScheduleController.sendDayClassBeginMsg)
router.post(`${BASE_URL}/sendMinuteClassBeginMsg`, classScheduleController.sendMinuteClassBeginMsg)
router.post(`${BASE_URL}/sendNowClassBeginMsg`, classScheduleController.sendNowClassBeginMsg)
router.post(`${BASE_URL}/sendEvaluationMsg`, classScheduleController.sendEvaluationMsg)
module.exports = router
