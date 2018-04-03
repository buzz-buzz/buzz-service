const promisify = require('../common/promisify')
const env = process.env.NODE_ENV || 'test'
const config = require('../../knexfile')[env]
const knex = require('knex')(config)
const moment = require('moment')
const _ = require('lodash')

const selectSchedules = function () {
    return knex('student_class_schedule')
        .select('batch_id', 'user_id', 'class_id', 'status', 'start_time', 'end_time')
}

const selectSchedulesWithMoreInfo = function () {
    return knex('student_class_schedule')
        .leftJoin('classes', 'student_class_schedule.class_id', 'classes.class_id')
        .leftJoin('companion_class_schedule', 'classes.class_id', 'companion_class_schedule.class_id')
        .leftJoin('user_profiles', 'companion_class_schedule.user_id', 'user_profiles.user_id')
        .leftJoin('class_feedback', 'class_feedback.from_user_id', 'student_class_schedule.user_id')
        .select(
            'student_class_schedule.batch_id as batch_id', 'student_class_schedule.class_id as class_id', 'student_class_schedule.status as status',
            'student_class_schedule.user_id as user_id', 'student_class_schedule.class_id as class_id', 'student_class_schedule.status as status',
            'student_class_schedule.start_time as student_start_time', 'student_class_schedule.end_time as student_end_time',
            'classes.start_time as start_time', 'classes.end_time as end_time',
            'classes.status as classes_status', 'classes.topic as topic', 'user_profiles.display_name as companion_name', 'user_profiles.user_id as companion_id', 'classes.name as title',
            'user_profiles.avatar as companion_avatar', 'class_feedback.from_user_id as from_user_id', 'class_feedback.to_user_id as to_user_id', 'class_feedback.score as score', 'class_feedback.comment as comment'
        )
}
const uniformTime = function (theStartTime, theEndTime) {
    let start_time = theStartTime
    if (start_time) {
        start_time = new Date(start_time)
    } else {
        start_time = new Date(0, 0, 0)
    }

    let end_time = theEndTime
    if (end_time) {
        end_time = new Date(end_time)
    } else {
        end_time = new Date(9999, 11, 30)
    }
    return { start_time, end_time }
}
const list = async ctx => {
    try {
        const { start_time, end_time } = uniformTime(ctx.query.start_time, ctx.query.end_time)

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

const checkTimeConflictsWithDB = async function (user_id, time, start_time, end_time) {
    const selected = await knex('student_class_schedule')
        .where('user_id', '=', user_id)
        .andWhere(time, '>=', start_time.getTime())
        .andWhere(time, '<=', end_time.getTime())
        .select('student_class_schedule.user_id')

    if (selected.length > 0) {
        throw new Error(`Schedule ${time} conflicts!`)
    }
}

function checkTimeConflicts(data) {
    for (let i = 0; i < data.length - 1; i++) {
        for (let j = i + 1; j < data.length; j++) {
            if (
                (data[i].start_time >= data[j].start_time
                    && data[i].start_time <= data[j].end_time) ||
                (data[i].end_time >= data[j].start_time
                    && data[i].end_time <= data[j].end_time)) {
                throw new Error('schedule conflicts!')
            }
        }
    }
}

const uniformTimes = function (data) {
    for (let i = 0; i < data.length; i++) {
        const u = uniformTime(data[i].start_time, data[i].end_time)
        data[i].start_time = u.start_time
        data[i].end_time = u.end_time
    }
}
const create = async ctx => {
    const { body } = ctx.request
    const data = body.map(b => Object.assign({ user_id: ctx.params.user_id }, b))

    try {
        uniformTimes(data)
        checkTimeConflicts(data)

        for (let i = 0; i < data.length; i++) {
            /* eslint-disable */
            await checkTimeConflictsWithDB(ctx.params.user_id, 'start_time', data[i].start_time, data[i].end_time)
            await checkTimeConflictsWithDB(ctx.params.user_id, 'end_time', data[i].start_time, data[i].end_time)
            /* eslint-enable */
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
// check start_time, end_time of batch
const checkBatchTime = ({ start_time, end_time }) => {
    if (!start_time) throw new Error(400, 'start_time is required')
    if (!end_time) throw new Error(400, 'end_time is required')
    start_time = moment(start_time).set('second', 0).set('millisecond', 0)
    end_time = moment(end_time).set('second', 0).set('millisecond', 0)
    if (!start_time.isValid()) throw new Error(400, 'invalid start_time')
    if (!end_time.isValid()) throw new Error(400, 'invalid end_time')
    if (start_time.format('YYYY-MM-DD') !== end_time.format('YYYY-MM-DD')) {
        throw new Error('start_time and end_time should be on the same day')
    }
    if (!_.includes(['00', '30'], start_time.format('mm')) || !_.includes(['00', '30'], end_time.format('mm'))) {
        throw new Error('start_time and end_time should be an hour or half hour')
    }
    if (moment().add(48, 'h').isAfter(start_time)) {
        throw new Error('start_time should be after 48 hours')
    }
    if (moment(start_time).add(0.5, 'h').isAfter(end_time)) {
        throw new Error('The end time should be half an hour after the start time')
    }
    return { start_time, end_time }
}
const batchCreate = async ctx => {
    try {
        const user_id = ctx.params.user_id
        if (!user_id) ctx.throw(400, 'invalid user_id')

        // check start_time, end_time
        const { start_time, end_time } = checkBatchTime(ctx.request.body)

        // check if class_hours > 0
        const class_hours = _.get(await knex('user_balance').where({ user_id }).select('class_hours'), '0.class_hours', 0)
        if (class_hours <= 0) ctx.throw(400, 'class_hours should be a positive number!')

        // get the max_batch_id from max(batch_id)
        const max_batch_id = _.get(await knex('student_class_schedule').max('batch_id as max_batch_id').where({ user_id }).whereNotNull('batch_id'), '0.max_batch_id', 0)
        const batch_id = max_batch_id + 1

        // generate schedules
        const schedules = _.times(class_hours, i => ({
            user_id,
            batch_id,
            status: 'booking',
            start_time: moment(start_time).add(i, 'w').unix() * 1000, // .format('YYYY-MM-DD HH:mm:ss')
            end_time: moment(end_time).add(i, 'w').unix() * 1000, // .format('YYYY-MM-DD HH:mm:ss')
        }))
        const result = await knex.batchInsert('student_class_schedule', schedules)
        ctx.body = result
        // ctx.body = schedules
    } catch (e) {
        ctx.throw(400, e)
    }
}
const batchEdit = async ctx => {
    ctx.body = {}
}
const batchCancel = async ctx => {
    ctx.body = {}
}
const batchList = async ctx => {
    const user_id = ctx.params.user_id
    const schedules = await selectSchedules().where({ user_id }).whereNotNull('batch_id').groupBy('batch_id')
    ctx.body = schedules
}

module.exports = { list, create, cancel, listAll, batchCreate, batchEdit, batchCancel, batchList }
