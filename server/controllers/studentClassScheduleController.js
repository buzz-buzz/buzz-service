const timeHelper = require('../common/time-helper')
const env = process.env.NODE_ENV || 'test'
const config = require('../../knexfile')[env]
const knex = require('knex')(config)
const moment = require('moment')

const selectSchedules = function () {
    return knex('student_class_schedule')
        .select('user_id', 'class_id', 'status', 'start_time', 'end_time')
}

const selectSchedulesWithMoreInfo = function () {
    return knex('student_class_schedule')
        .leftJoin('classes', 'student_class_schedule.class_id', 'classes.class_id')
        .leftJoin('companion_class_schedule', 'classes.class_id', 'companion_class_schedule.class_id')
        .leftJoin('user_profiles', 'companion_class_schedule.user_id', 'user_profiles.user_id')
        .leftJoin('class_feedback', 'class_feedback.from_user_id', 'student_class_schedule.user_id')
        .select(
            'student_class_schedule.user_id as user_id',
            'student_class_schedule.class_id as class_id',
            'student_class_schedule.status as status',
            'student_class_schedule.start_time as start_time',
            'student_class_schedule.end_time as end_time',
            'classes.start_time as class_start_time',
            'classes.end_time as class_end_time',
            'classes.status as classes_status',
            'classes.topic as topic',
            'user_profiles.display_name as companion_name',
            'user_profiles.user_id as companion_id',
            'classes.name as title',
            'user_profiles.avatar as companion_avatar',
            'class_feedback.from_user_id as from_user_id',
            'class_feedback.to_user_id as to_user_id',
            'class_feedback.score as score',
            knex.fn.now(),
            'class_feedback.comment as comment'
        )
}
const list = async ctx => {
    try {
        const { start_time, end_time } = timeHelper.uniformTime(ctx.query.start_time, ctx.query.end_time)

        ctx.body = await selectSchedulesWithMoreInfo()
            .where('student_class_schedule.user_id', ctx.params.user_id)
            .andWhere('student_class_schedule.start_time', '>=', start_time)
            .andWhere('student_class_schedule.end_time', '<=', end_time)
    } catch (error) {
        console.error(error)
        ctx.throw(500, error)
    }
}

const listAll = async ctx => {
    ctx.body = await selectSchedules()
}

const create = async ctx => {
    const { body } = ctx.request
    const data = body.map(b => Object.assign({ user_id: ctx.params.user_id }, b))

    try {
        timeHelper.uniformTimes(data)
        timeHelper.checkTimeConflicts(data)
        for (let i = 0; i < data.length; i++) {
            /* eslint-disable */
            await timeHelper.checkTimeConflictsWithDB('student_class_schedule', ctx.params.user_id, data[i].start_time, data[i].end_time)
            /* eslint-enable */
        }

        if (process.env.NODE_ENV !== 'test') {
            data.map(d => {
                d.start_time = timeHelper.convertToMySQLFormat(d.start_time)
                d.end_time = timeHelper.convertToMySQLFormat(d.end_time)

                return d
            })
        }

        const inserted = await knex('student_class_schedule')
            .returning('start_time')
            .insert(data)

        ctx.status = 201
        ctx.set('Location', `${ctx.request.URL}/${ctx.params.user_id}`)
        ctx.body = inserted
    } catch (ex) {
        console.error(ex)
        ctx.throw(409, ex)
    }
}

const cancel = async ctx => {
    try {
        const { body } = ctx.request
        let startTime = moment(body.start_time).toISOString().replace('T', ' ').substr(0, 19)

        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'test') {
            startTime = new Date(body.start_time).getTime()
        }

        const filter = {
            user_id: ctx.params.user_id,
            start_time: startTime,
        }
        const res = await knex('student_class_schedule').where(filter).andWhere({ status: 'booking' }).update({
            status: 'cancelled',
        })

        if (res > 0) {
            ctx.body = (await knex('student_class_schedule')
                .where(filter)
                .select('user_id', 'status'))[0]
        } else if (res === 0) {
            throw new Error(`trying to cancel a non-exist event @ ${startTime}`)
        } else {
            throw new Error(res)
        }
    } catch (ex) {
        console.error(ex)
        ctx.throw(500, ex)
    }
}
module.exports = { list, create, cancel, listAll }
