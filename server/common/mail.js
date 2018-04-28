const _ = require('lodash')
const { DM } = require('waliyun')
const { redis } = require('./redis')
const timeHelper = require('./time-helper')
const config = require('../config')

const dm = DM({
    AccessKeyId: process.env.buzz_aliyun_mail_id,
    AccessKeySecret: process.env.buzz_aliyun_mail_secret,
})

module.exports = {
    // FromAlias: 'BuzzBuzz',
    // ToAddress: '',
    // Subject: '排课确认通知',
    // HtmlBody: ``,
    async send(opt) {
        // TODO: 处理错误
        const res = await dm.singleSendMail({
            ReplyToAddress: true,
            AddressType: 1,
            AccountName: 'no-reply@service-cn.buzzbuzzenglish.com',
            FromAlias: 'BuzzBuzz',
            ...opt,
        })
        console.log('mail:res', res)
    },
    // 验证
    async verifyByCode(mail, code) {
        if (!code) throw new Error('invalid code')
        const key = `mail:verify:${mail}`
        const v = await redis.get(key)
        if (!v) throw new Error('no verification code')
        if (String(code) !== String(v)) throw new Error('invalid verification code')
        await redis.del(key)
    },
    // 发送验证邮件
    async sendVerificationMail(mail, name, digit = 4, expire = 30 * 60) {
        const code = String(_.random(10 ** (digit - 1), (10 ** digit) - 1))
        if (process.env.NODE_ENV !== 'test') {
            await this.send({
                ToAddress: mail,
                Subject: `${code} Verification code From BuzzBuzz`,
                HtmlBody: `Dear ${name},<br/>
 ${code} is your verification code.<br/>
 PS: this email was sent automatically, please don’t reply. If you have any questions, please contact your private advisor (peertutor@buzzbuzzenglish.com) .`,
            })
        }
        await redis.set(`mail:verify:${mail}`, code, 'ex', expire)
        return { code, expire }
    },
    //     // 学生给外籍的课程评价通知
    //     async sendStudentEvaluationTpl(mail, name, class_id, class_topic, companion_id) {
    //         const url = `${config.endPoints.buzzCorner}/class/evaluation/${companion_id}/${class_id}`
    //         await this.send({
    //             ToAddress: mail,
    //             Subject: 'Evaluation reminder',
    //             HtmlBody: `Dear ${name || ''},<br/>
    // Congratulations! You have successfully finished the ${class_topic || ''} session! Please take a few seconds to evaluate your peer tutor (<a href="${url}">evaluation link</a>). <br/>
    // Your peer tutor wants to know what you think about him/her!`,
    //         })
    //     },
    // 外籍给学生的课程评价通知
    async sendCompanionEvaluationMail(mail, name, class_id, class_topic) {
        const url = `${config.endPoints.buzzCorner}/class/foreign/${class_id}`
        await this.send({
            ToAddress: mail,
            Subject: 'Evaluation reminder',
            HtmlBody: `Dear ${name || ''},<br/>
Congratulations! You have successfully led the ${class_topic || ''} session! Please take a few seconds to evaluate your peer students (<a href="${url}">evaluation link</a>). <br/>
Your peers want to know what you think about them!`,
        })
    },
    // 开课提醒通知1 课程开始时间前24小时或小于24小时
    async sendDayClassBeginMail(mail, name, class_id, class_topic, class_start_time, time_zone) {
        const url = `${config.endPoints.buzzCorner}/class/${class_id}`
        const fromNow = timeHelper.enFromNow(class_start_time)
        const start_time = timeHelper.enStartTime(class_start_time, time_zone)
        await this.send({
            ToAddress: mail,
            Subject: 'Session reminder',
            HtmlBody: `Dear ${name || ''},<br/>
You have a session on ${class_topic} with your matched peers ${fromNow}.<br/>
Start time: ${start_time}<br/>
Please <a href="${url}">enter classroom</a> 5 mins in advance.<br/>
Thank you :)<br/>
PS: this email was sent automatically, please don’t reply. If you have any questions, please contact your private advisor (peertutor@buzzbuzzenglish.com).<br/>`,
        })
    },
    // 开课提醒通知2 课程开始时间前30分钟或小于30分钟
    async sendMinuteClassBeginMail(mail, name, class_id, class_topic, class_start_time, time_zone) {
        const url = `${config.endPoints.buzzCorner}/class/${class_id}`
        const fromNow = timeHelper.enFromNow(class_start_time)
        const start_time = timeHelper.enStartTime(class_start_time, time_zone)
        await this.send({
            ToAddress: mail,
            Subject: 'Session reminder',
            HtmlBody: `Dear ${name || ''},<br/>
Your session ${class_topic} is going to start ${fromNow}!<br/>
Start time: ${start_time}<br/>
<a href="${url}">Please click the link and get ready</a>.<br/>
Thank you :)<br/>
PS: this email was sent automatically, please don’t reply. If you have any questions, please contact your private advisor (peertutor@buzzbuzzenglish.com).<br/>`,
        })
    },
}
