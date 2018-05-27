const Router = require('koa-router')
const router = new Router()
const usersController = require('../controllers/usersController')
const BASE_URL = '/api/v1/users'
router.get(`${BASE_URL}/available`, usersController.getAvailableUsers)
router.get(`${BASE_URL}`, usersController.search)
router.get(`${BASE_URL}/by-facebook/:facebook_id`, usersController.getByFacebookId)
router.get(`${BASE_URL}/by-wechat`, usersController.getByWechat)
router.get(`${BASE_URL}/:user_id`, usersController.show)
router.get(`${BASE_URL}/feedback/:class_id`, usersController.getUserInfoByClassId)
router.post(`${BASE_URL}`, usersController.create)
router.post(`${BASE_URL}/byUserIdlist`, usersController.getByUserIdList)
router.put(`${BASE_URL}/sign-in`, usersController.signIn)
router.put(`${BASE_URL}/account-sign-in`, usersController.accountSignIn)
router.put(`${BASE_URL}/:user_id`, usersController.update)
router.post(`${BASE_URL}/appendOrderRemark/:user_id`, usersController.appendOrderRemark)
router.del(`${BASE_URL}/:user_id`, usersController.delete)
router.get(`${BASE_URL}/is-profile-ok/:user_id`, usersController.isProfileOK)
router.post(`${BASE_URL}/sendScheduleMsg/:user_id`, usersController.sendScheduleMsg)
router.get(`${BASE_URL}/social-account-profile/:user_id`, usersController.getSocialAccountProfile)
module.exports = router
