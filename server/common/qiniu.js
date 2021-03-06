const qiniu = require('qiniu')
const axios = require('axios')

const config_qiniu = {
    ACCESS_KEY: process.env.buzz_qiniu_access_key,
    SECRET_KEY: process.env.buzz_qiniu_secret_key,
    bucket: 'buzz-corner-user-resource',
    url: {
        upload_url: 'https://upload.qiniup.com/',
        resources_url: 'https://buzz-corner.user.resource.buzzbuzzenglish.com/',
    },
    suffix: {
        avvod: 'avvod/m3u8',
    },
}
const mac = new qiniu.auth.digest.Mac(config_qiniu.ACCESS_KEY, config_qiniu.SECRET_KEY)
const putPolicy = new qiniu.rs.PutPolicy({
    scope: config_qiniu.bucket,
})

const config = new qiniu.conf.Config()
// 空间对应的机房
config.zone = qiniu.zone.Zone_z0
// 是否使用https域名
config.useHttpsDomain = true
// 上传是否使用cdn加速
config.useCdnDomain = true

const formUploader = new qiniu.form_up.FormUploader(config)
const putExtra = new qiniu.form_up.PutExtra()

module.exports = {
    getUptoken() {
        return {
            uptoken: putPolicy.uploadToken(mac) || '',
            upload_url: config_qiniu.url.upload_url,
            resources_url: config_qiniu.url.resources_url,
        }
    },
    async uploadStream(stream, key) {
        return new Promise((resolve, reject) => {
            formUploader.putStream(putPolicy.uploadToken(mac), key, stream, putExtra, (
                respErr,
                respBody, respInfo
            ) => {
                if (respErr) {
                    reject(respErr)
                } else if (respInfo.statusCode === 200) {
                    resolve({
                        ...respBody,
                        ...config_qiniu,
                    })
                } else {
                    reject(new Error(JSON.stringify({ status: respInfo.statusCode, body: respBody })))
                }
            })
        })
    },
    async urlStream(url) {
        const { data } = await axios({
            method: 'get',
            url,
            responseType: 'stream',
        })
        return data
    },
    async uploadUrl(url) {
        const { key } = await this.uploadStream(await this.urlStream(url))
        return `${config_qiniu.url.resources_url}${key}`
    },
}
