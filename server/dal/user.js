const env = process.env.NODE_ENV || 'test'
const config = require('../../knexfile')[env]
const knex = require('knex')(config)
const moment = require('moment-timezone')
const _ = require('lodash')

module.exports = {
    async get(userId) {
        return (await knex('users')
            .leftJoin('user_profiles', 'users.user_id', 'user_profiles.user_id')
            .leftJoin('user_social_accounts', 'users.user_id', 'user_social_accounts.user_id')
            .leftJoin('user_interests', 'users.user_id', 'user_interests.user_id')
            .leftJoin('user_balance', 'users.user_id', 'user_balance.user_id')
            .leftJoin('user_placement_tests', 'users.user_id', 'user_placement_tests.user_id')
            .groupByRaw('users.user_id')
            .select(
                'users.user_id as user_id', 'users.name as name', 'users.created_at as created_at',
                'users.role as role', 'users.remark as remark', 'user_profiles.avatar as avatar',
                'user_profiles.display_name as display_name', 'user_profiles.school_name as school_name', 'user_profiles.time_zone as time_zone', 'user_profiles.gender as gender',
                'user_profiles.date_of_birth as date_of_birth', 'user_profiles.mobile as mobile',
                'user_profiles.email as email', 'user_profiles.language as language', 'user_profiles.location as location',
                'user_profiles.description as description', 'user_profiles.grade as grade',
                'user_profiles.parent_name as parent_name', 'user_profiles.country as country',
                'user_profiles.city as city', 'user_social_accounts.facebook_id as facebook_id',
                'user_social_accounts.wechat_data as wechat_data', 'user_social_accounts.facebook_name as facebook_name',
                'user_social_accounts.wechat_name as wechat_name', 'user_balance.class_hours as class_hours',
                'user_balance.integral as integral',
                'user_placement_tests.level as level', 'user_profiles.password as password',
                knex.raw('group_concat(user_interests.interest) as interests')
            )
            .where({ 'users.user_id': userId }))[0]
    },

    async getWechatByUserIds(userIds) {
        return await knex('users')
            .leftJoin('user_social_accounts', 'users.user_id', 'user_social_accounts.user_id')
            .whereIn('users.user_id', userIds)
            .whereNotNull('user_social_accounts.wechat_openid')
            .whereNot('user_social_accounts.wechat_openid', '')
            .select('user_social_accounts.wechat_openid', 'user_social_accounts.wechat_name', 'users.name', 'users.user_id')
    },

    async getUsersByWeekly(state, r) {
        // const state = 'need' // 'done' 'need' 'excess' 'no_need'
        const role = { s: 'student', c: 'companion' }[r]
        const schedule = `${role}_class_schedule`
        const start_time = moment(moment().format('YYYY-MM-DD')).isoWeekday(1).toDate()
        const end_time = moment(moment().format('YYYY-MM-DD')).isoWeekday(7).toDate()
        let query = knex('users')
            .leftJoin('user_profiles', 'users.user_id', 'user_profiles.user_id')
            .leftJoin('user_balance', 'users.user_id', 'user_balance.user_id')
            // .joinRaw(`LEFT JOIN ${schedule} ON users.user_id = ${schedule}.user_id`)
            .joinRaw(`LEFT JOIN ${schedule} ON users.user_id = ${schedule}.user_id AND ${schedule}.status = 'confirmed' AND ${schedule}.start_time > '${start_time}' AND ${schedule}.start_time <= '${end_time}' AND (${schedule}.class_id IS NOT NULL AND ${schedule}.class_id != '')`)
            .leftJoin('classes', 'classes.class_id', `${schedule}.class_id`)
            .groupBy('users.user_id')
            .select(
                knex.raw('(CASE WHEN (user_profiles.weekly_schedule_requirements IS NULL OR user_profiles.weekly_schedule_requirements = \'\') THEN 1 ELSE user_profiles.weekly_schedule_requirements END) as req'),
                knex.raw('(CASE WHEN (user_balance.class_hours IS NULL OR user_balance.class_hours  = \'\') THEN 0 ELSE user_balance.class_hours END) as hours'),
                'users.user_id as user_id',
                knex.raw('SUM(CASE WHEN classes.status IN (\'opened\', \'ended\') THEN 1 ELSE 0 END) AS done_count'),
                knex.raw('SUM(CASE WHEN classes.status IN (\'cancelled\') THEN 1 ELSE 0 END) AS cancelled_count'),
                knex.raw('SUM(CASE WHEN classes.status IN (\'opened\', \'ended\') THEN 1 ELSE 0 END) AS done_count'),
                knex.raw('SUM(CASE WHEN classes.status IN (\'opened\', \'ended\', \'cancelled\') THEN 1 ELSE 0 END) AS total_count'),
                knex.raw('group_concat(classes.class_id) as class_ids'),
                knex.raw('group_concat(classes.status) as class_statuses'),
            )

        if (state === 'excess') {
            // hours: -1
            // req: 1, total_count: 2
            query = query.havingRaw('(req < total_count) OR (hours < 0)')
        } else if (state === 'no_need') {
            // hours: 0, total_count: 0
            query = query.havingRaw('((req >= total_count) AND (hours >= 0)) AND (total_count = 0 AND hours = 0)')
        } else if (state === 'done') {
            // hours: 0, done_count: 1, req: 1
            query = query.havingRaw('((req >= total_count) AND (hours >= 0)) AND (req = done_count AND done_count > 0)')
        } else if (state === 'need') {
            //  hours: 0, total_count: 1, cancelled_count: 1, done_count: 0, req: 1
            query = query.havingRaw('((req >= total_count) AND (hours >= 0)) AND ((hours + cancelled_count) > 0 AND (req > done_count))')
        }
        let result = await query
        console.log(result)
        result = _.map(result, 'user_id') || []
        return result
    },
}
