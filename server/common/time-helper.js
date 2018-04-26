const _ = require('lodash')
const env = process.env.NODE_ENV || 'test'
const config = require('../../knexfile')[env]
const knex = require('knex')(config)
const moment = require('moment-timezone')

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

const uniformTimes = function (data) {
    for (let i = 0; i < data.length; i++) {
        const u = uniformTime(data[i].start_time, data[i].end_time)
        data[i].start_time = u.start_time
        data[i].end_time = u.end_time
    }
}

const checkTimeRangeOverlapWithDBTime = async function (table, user_id, time, start_time, end_time) {
    const selected = await knex(table)
        .where('user_id', '=', user_id)
        .andWhere(time, '>=', start_time)
        .andWhere(time, '<=', end_time)
        .andWhere('status', '!=', 'cancelled')
        .select('user_id')

    if (selected.length > 0) {
        throw new Error(`Schedule ${time} conflicts!`)
    }
}

const checkTimeRangeOverlapWithDBStartTime = async function (table, user_id, start_time, end_time) {
    await checkTimeRangeOverlapWithDBTime(table, user_id, 'start_time', start_time, end_time)
}

const checkTimeRangeOverlapWithDBEndTime = async function (table, user_id, start_time, end_time) {
    await checkTimeRangeOverlapWithDBTime(table, user_id, 'end_time', start_time, end_time)
}

const checkTimeRangeOverlapWithDB = async function (table, user_id, start_time, end_time) {
    await checkTimeRangeOverlapWithDBStartTime(table, user_id, start_time, end_time)
    await checkTimeRangeOverlapWithDBEndTime(table, user_id, start_time, end_time)
}

const convertToDBFormat = function (time) {
    if (process.env.NODE_ENV !== 'test') {
        return new Date(time).toISOString().replace('T', ' ').replace('Z', ' ').substr(0, 19)
    }
    return new Date(time).getTime()
}

const checkDBTimeRangeOverlapWithTime = async function (table, user_id, time) {
    const selected = await knex(table)
        .where('user_id', '=', user_id)
        .andWhere('start_time', '<=', time)
        .andWhere('end_time', '>=', time)
        .andWhere('status', '!=', 'cancelled')
        .select('user_id')

    if (selected.length > 0) {
        throw new Error(`Existing schedules conflict with ${time}!`)
    }
}

const checkDBTimeRangeOverlapWithTimeRange = async function (table, user_id, start_time, end_time) {
    start_time = convertToDBFormat(start_time)
    end_time = convertToDBFormat(end_time)

    await checkDBTimeRangeOverlapWithTime(table, user_id, end_time)
    await checkDBTimeRangeOverlapWithTime(table, user_id, start_time)
}

const tzShift = (dateTime, oldTz, newTz) => moment.tz(dateTime, oldTz).tz(newTz)

// 处理 [{ start_time, end_time, time_zone }]
const formatUsers = (users, format, locale) => _.map(users, i => {
    if (locale) {
        moment.locale(locale)
    }
    const oldTz = 'Asia/Shanghai'
    const newTz = i.time_zone || oldTz
    const start_time = moment(i.start_time)
    const end_time = moment(i.end_time)
    const start_time_local = tzShift(start_time, oldTz, newTz)
    const end_time_local = tzShift(end_time, oldTz, newTz)
    return {
        ...i,
        time_zone: newTz,
        start_time: {
            readable: start_time.format('YYYY-MM-DD HH:mm:ss'),
            local_readable: start_time_local.format('YYYY-MM-DD HH:mm:ss'),
            formatted: start_time.format(format),
            local_formatted: `${start_time_local.format(format)}, ${newTz}`,
            time: start_time,
            local: start_time_local,
        },
        end_time: {
            readable: end_time.format('YYYY-MM-DD HH:mm:ss'),
            local_readable: end_time_local.format('YYYY-MM-DD HH:mm:ss'),
            formatted: end_time.format(format),
            local_formatted: `${end_time_local.format(format)}, ${newTz}`,
            time: end_time,
            local: end_time_local,
        },
    }
})

module.exports = {
    uniformTimes,
    checkTimeConflicts,
    async checkTimeConflictsWithDB(table, user_id, start_time, end_time) {
        await checkTimeRangeOverlapWithDB(table, user_id, start_time, end_time)
        await checkDBTimeRangeOverlapWithTimeRange(table, user_id, start_time, end_time)
    },
    uniformTime,
    convertToDBFormat,
    tzShift,
    formatUsers,
}
