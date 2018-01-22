const Router = require("koa-router");
const router = new Router();
const usersController = require("../controllers/usersController");
const BASE_URL = `/api/v1/users`;
router.get(`${BASE_URL}`, usersController.index);
router.get(`${BASE_URL}/by-facebook/:facebook_id`, usersController.getByFacebookId);
router.get(`${BASE_URL}/by-wechat`, usersController.getByWechat);
router.get(`${BASE_URL}/:user_id`, usersController.show);
router.post(`${BASE_URL}`, usersController.create);
router.put(`${BASE_URL}/sign-in`, usersController.signIn);
router.put(`${BASE_URL}/:user_id`, usersController.update);

module.exports = router;