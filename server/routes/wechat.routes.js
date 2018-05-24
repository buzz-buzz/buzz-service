const Router = require('koa-router')
const router = new Router()
const wechatController = require('../controllers/wechatController')
const BASE_URL = '/api/v1/wechat'
router.post(`${BASE_URL}/js-config`, wechatController.getJsConfig)
router.post(`${BASE_URL}/media`, wechatController.media)
router.post(`${BASE_URL}/tpl`, wechatController.sendTpl)
router.get(`${BASE_URL}/batch-get-users`, wechatController.batchGetUsers)
module.exports = router
