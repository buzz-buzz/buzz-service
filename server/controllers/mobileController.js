const mobileCommon = require('../common/mobile')

const sendVerificationSms = async ctx => {
    try {
        const { mobile, mobile_country, expire: setExpire } = ctx.request.body
        const { code, expire, error } = await mobileCommon.sendVerificationSms(mobile, mobile_country, undefined, (process.env.NODE_ENV !== 'production') ? setExpire : undefined)
        ctx.status = 200
        ctx.body = { code: (process.env.NODE_ENV === 'test') && code, expire, error }
    } catch (error) {
        console.error('sendVerificationSms error: ', error)
        ctx.status = 500
        ctx.body = error
    }
}

const verifyByCode = async ctx => {
    try {
        const { mobile, code } = ctx.request.body
        await mobileCommon.verifyByCode(mobile, code)
        ctx.status = 200
        ctx.body = { verified: true }
    } catch (error) {
        console.error('verifyByCode error: ', error)
        ctx.status = 500
        ctx.body = error
    }
}

const countryList = ctx => {
    ctx.status = 200
    ctx.body = {
        list: mobileCommon.countryList,
    }
}

module.exports = {
    sendVerificationSms,
    verifyByCode,
    countryList,
}
