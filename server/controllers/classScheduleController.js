const _ = require('lodash')
const request = require('request-promise-native')
const Scheduling = require('../bll/scheduling')

const promisify = require('../common/promisify')
const env = process.env.NODE_ENV || 'test'
const knexConfig = require('../../knexfile')[env]
const knex = require('knex')(knexConfig)
const classSchedules = require('../bll/class-schedules')
const config = require('../config/index')
const listSuggested = async ctx => {
    try {
        const timeRangeStart = new Date(ctx.query.time_range_start).getTime()

        const res = await knex('student_class_schedule')
            .where('student_class_schedule.start_time', '>=', timeRangeStart)
            .andWhere('student_class_schedule.status', 'booking')

        const suggestions = Scheduling.makeGroups(res)
        console.log('res = ', res)
        ctx.status = 200
        ctx.body = res
    } catch (error) {
        console.error(error)
        ctx.throw(500, error)
    }
}

const uniformTime = function (theStartTime, theEndTime) {
    let start_time = theStartTime
    if (start_time) {
        start_time = new Date(start_time)
    } else {
        start_time = undefined
    }

    let end_time = theEndTime
    if (end_time) {
        end_time = new Date(end_time)
    } else {
        end_time = undefined
    }
    return { start_time, end_time }
}

function filterByTime(search, start_time, end_time) {
    return search
        .where('classes.start_time', '>=', start_time)
        .andWhere('classes.end_time', '<=', end_time)
}

function selectClasses() {
    return knex('classes')
        .leftJoin('companion_class_schedule', 'classes.class_id', 'companion_class_schedule.class_id')
        .leftJoin('student_class_schedule', 'classes.class_id', 'student_class_schedule.class_id')
        .groupByRaw('classes.class_id')
        .select('classes.class_id as class_id', 'classes.adviser_id as adviser_id', 'classes.start_time as start_time', 'classes.end_time as end_time', 'classes.status as status', 'classes.name as name', 'classes.remark as remark', 'classes.topic as topic', 'classes.room_url as room_url', 'classes.exercises as exercises', knex.raw('group_concat(companion_class_schedule.user_id) as companions'), knex.raw('group_concat(student_class_schedule.user_id) as students'))
}

function selectClassesWithCompanionInfo() {
    return knex('classes')
        .leftJoin('companion_class_schedule', 'classes.class_id', 'companion_class_schedule.class_id')
        .leftJoin('student_class_schedule', 'classes.class_id', 'student_class_schedule.class_id')
        .leftJoin('user_profiles', 'companion_class_schedule.user_id', 'user_profiles.user_id')
        .leftJoin('users', 'companion_class_schedule.user_id', 'users.user_id')
        .groupByRaw('classes.class_id')
        .select('classes.class_id as class_id', 'classes.adviser_id as adviser_id', 'classes.start_time as start_time', 'classes.end_time as end_time', 'classes.status as status', 'classes.name as name', 'classes.remark as remark', 'classes.topic as topic', 'classes.room_url as room_url', 'classes.exercises as exercises', 'classes.level as level', knex.fn.now(), 'users.name as companion_name', 'user_profiles.avatar as companion_avatar', knex.raw('group_concat(companion_class_schedule.user_id) as companions'), knex.raw('group_concat(student_class_schedule.user_id) as students'))
}

function searchClasses(search) {
    return search
        .select(
            'classes.class_id as class_id', 'classes.adviser_id as adviser_id', 'classes.start_time as start_time',
            'classes.end_time as end_time', 'classes.status as status', 'classes.name as name', 'classes.remark as remark',
            'classes.topic as topic', 'classes.room_url as room_url', 'classes.exercises as exercises', 'classes.level as level',
            knex.raw('group_concat(companion_class_schedule.user_id) as companions'),
            knex.raw('group_concat(student_class_schedule.user_id) as students')
        )
}

const getClassByClassId = async ctx => {
    const result = await selectClassesWithCompanionInfo()
        .where('classes.class_id', ctx.params.class_id)

    ctx.status = 200
    ctx.set('Location', `${ctx.request.URL}/${ctx.params.class_id}`)
    ctx.body = result || {}
}

/* 设置定时任务  start */

/*
function selectClassInfo(classId, trx) {
    return trx('classes')
        .select()
        .where({ class_id: classId })
}
*/

async function changeClassStatus(endTime, classId) {
    try {
        await request({
            uri: `${config.endPoints.bullService}/api/v1/task`,
            method: 'POST',
            body: {
                classId,
                endTime,
            },
            json: true,
        })
    } catch (ex) {
        console.error(ex)
    }
}

async function task(classId, trx, newEndTime) {
    /* const classInfo = await selectClassInfo(classId, trx) */
    const endTime = newEndTime
    console.log('定时任务时间', endTime)
    await changeClassStatus(endTime, classId)
}

/* 设置定时任务  end */

const list = async ctx => {
    try {
        const { start_time, end_time } = uniformTime(ctx.query.start_time, ctx.query.end_time)

        let search = selectClassesWithCompanionInfo()
            .orderBy('classes.start_time', 'DESC')

        if (start_time || end_time) {
            search = filterByTime(search, start_time, end_time)
        }

        ctx.body = await searchClasses(search)
        console.log(ctx.body)
    } catch (error) {
        console.error(error)
    }
}

const upsert = async ctx => {
    const { body } = ctx.request

    const trx = await promisify(knex.transaction)

    try {
        let classIds = [body.class_id]

        const data = {
            adviser_id: body.adviser_id,
            level: body.level,
            start_time: body.start_time,
            end_time: body.end_time,
            status: body.status,
            name: body.name,
            remark: body.remark,
            topic: body.topic,
            room_url: body.room_url,
            exercises: body.exercises,
        }

        let studentSchedules = body.students ? body.students.map(studentId => ({
            user_id: studentId,
            class_id: body.class_id,
            start_time: body.start_time,
            end_time: body.end_time,
            status: 'confirmed',
        })) : []

        let companionSchedules = body.companions ? body.companions.map(companionId => ({
            user_id: companionId,
            class_id: body.class_id,
            start_time: body.start_time,
            end_time: body.end_time,
            status: 'confirmed',
        })) : []

        if (body.class_id) {
            /* -------新建修改班级结束状态定时器start---------*/
            console.log('判断需要修改班级信息的classId：', body.class_id)
            const endTime = await trx('classes')
                .where('class_id', body.class_id)
                .select('end_time')
            console.log('获取数据库中的结束时间，和要更改的结束时间比较' +
                '如果时间发生改变，则修改定时任务', 'sql中endTime:：', endTime[0], '将要修改的endTime：', body.end_time)
            const sqlTime = new Date(endTime[0].end_time).getTime()
            const bodyTime = new Date(body.end_time).getTime()

            console.log('数据库中：sqlTime：', sqlTime)
            console.log('将要修改的：bodyTime:', bodyTime)

            if (sqlTime !== bodyTime) {
                // 修改定时任务
                console.log('_______即将添加新的定时任务___________')
                try {
                    await task(body.class_id, trx, new Date(body.end_time))
                } catch (ex) {
                    console.error(ex)
                }
                console.log('________添加新的定时任务成功___________')
            }
            /* -------新建修改班级结束状态定时器end---------*/

            console.error('body class i d= ', body.class_id)

            if (JSON.stringify(data) !== '{}') {
                await trx('classes')
                    .returning('class_id')
                    .update(data)
                    .where({ class_id: body.class_id })
            }

            let originalCompanions = await trx('companion_class_schedule')
                .select('user_id')
                .where({ class_id: body.class_id })

            originalCompanions = originalCompanions.map(oc => oc.user_id)
            console.log('original companions = ', originalCompanions)

            const toBeDeletedCompanionSchedules = originalCompanions.filter(c => companionSchedules.map(cs => cs.user_id).indexOf(c) < 0)
            const tbBeUpdatedCompanionSchedules = originalCompanions.filter(c => companionSchedules.map(cs => cs.user_id).indexOf(c) >= 0)

            if (toBeDeletedCompanionSchedules.length) {
                await trx('companion_class_schedule')
                    .where('user_id', 'in', toBeDeletedCompanionSchedules)
                    .andWhere({ class_id: body.class_id })
                    .del()
            }
            if (tbBeUpdatedCompanionSchedules.length) {
                const updateForCompanions = {
                    start_time: body.start_time,
                    end_time: body.end_time,
                }
                if (JSON.stringify(updateForCompanions) !== '{}') {
                    await trx('companion_class_schedule')
                        .where('user_id', 'in', tbBeUpdatedCompanionSchedules)
                        .update(updateForCompanions)
                }
            }

            companionSchedules = companionSchedules.filter(s => originalCompanions.indexOf(s.user_id) < 0)
            console.log('companionSchedules=', companionSchedules)
            let originalStudents = await trx('student_class_schedule')
                .select('user_id')
                .where({ class_id: body.class_id })

            originalStudents = originalStudents.map(os => os.user_id)
            console.log('original students = ', originalStudents)

            const toBeDeletedStudentSchedules = originalStudents.filter(s => studentSchedules.map(ss => ss.user_id).indexOf(s) < 0)
            console.log('toBeDeleted = ', toBeDeletedStudentSchedules)
            const toBeUpdatedStudentSchedules = originalStudents.filter(s => studentSchedules.map(ss => ss.user_id).indexOf(s) >= 0)
            console.log('tobeUpdated = ', toBeUpdatedStudentSchedules)

            await classSchedules.removeStudents(trx, toBeDeletedStudentSchedules, body.class_id)

            if (toBeUpdatedStudentSchedules.length) {
                const updateForStudent = {
                    start_time: body.start_time,
                    end_time: body.end_time,
                }

                if (JSON.stringify(updateForStudent) !== '{}') {
                    await trx('student_class_schedule')
                        .where('user_id', 'in', toBeUpdatedStudentSchedules)
                        .update(updateForStudent)
                }
            }

            studentSchedules = studentSchedules.filter(s => originalStudents.indexOf(s.user_id) < 0)
            console.log('students after filter = ', studentSchedules)
        } else {
            classIds = await trx('classes')
                .returning('class_id')
                .insert(data)
            // 创建定时任务
            console.log('_________即将创建定时任务_____________')
            try {
                await task(classIds[0], trx, new Date(data.end_time))
                console.log('_________创建定时任务成功__________')
            } catch (ex) {
                console.error(ex)
            }
        }

        if (studentSchedules.length) {
            await classSchedules.addStudents(trx, studentSchedules, classIds[0])
        }

        if (companionSchedules.length) {
            await trx('companion_class_schedule')
                .returning('start_time')
                .insert(companionSchedules.map(s => {
                    s.class_id = classIds[0]
                    return s
                }))
        }

        await trx.commit()

        ctx.status = body.class_id ? 200 : 201
        ctx.set('Location', `${ctx.request.URL}`)
        ctx.body = (await selectClasses().where({ 'classes.class_id': classIds[0] }))[0]
    } catch (error) {
        console.error(error)

        await trx.rollback()
        ctx.status = 500
        ctx.body = {
            error: 'Save class failed!',
        }
    }
}

const change = async ctx => {
    const trx = await promisify(knex.transaction)
    try {
        const listAll = await trx('classes')
            .where('status', 'not in', ['ended', 'cancelled'])
            .select()
        const currentTime = new Date().getTime()
        /* let filtrateList = new Set() */
        const arr = []

        for (let c = 0; c < listAll.length; c++) {
            const searchTime = new Date(listAll[c].end_time).getTime()
            if (searchTime < currentTime) {
                /* filtrateList = filtrateList.add(listAll[c]) */
                arr.push(listAll[c].class_id)
            }
        }
        if (arr.length) {
            await trx('classes')
                .where('class_id', 'in', arr)
                .update({
                    status: 'ended',
                })

            await trx('companion_class_schedule')
                .where('class_id', 'in', arr)
                .update({
                    status: 'ended',
                })

            await trx('student_class_schedule')
                .where('class_id', 'in', arr)
                .update({
                    status: 'ended',
                })
        }

        await trx.commit()

        const listEnd = await knex('classes')
            .select()

        ctx.body = listEnd
        ctx.status = 200
    } catch (error) {
        console.log(error)
        await trx.rollback()
    }
}

const endClass = async ctx => {
    const trx = await promisify(knex.transaction)
    try {
        const classId = ctx.params.class_id
        const { endTime } = ctx.request.body
        console.log('需要修改班级状态的班级classID：', classId)
        console.log('设置定时器的时间endTime：', endTime)
        const cronTime = new Date(endTime).getTime()
        console.log('已经触发的定时器的时间cronTime:', cronTime)

        const classEndTime = await trx('classes')
            .where('class_id', classId)
            .select('end_time')
        const sqlTime = new Date(classEndTime[0].end_time).getTime()
        console.log('数据库中班级的结束时间sqlTime', sqlTime)

        if (sqlTime === cronTime) {
            console.log('定时器的时间===数据库中班级的结束时间，即将进行修改信息操作')
            await trx('classes')
                .where('class_id', classId)
                .update({
                    status: 'ended',
                })

            await trx('companion_class_schedule')
                .where('class_id', classId)
                .update({
                    status: 'ended',
                })

            await trx('student_class_schedule')
                .where('class_id', classId)
                .update({
                    status: 'ended',
                })
            console.log('修改成功')
        }

        await trx.commit()

        const listEnd = await knex('classes')
            .select()
            .where('class_id', classId)

        ctx.body = listEnd
        ctx.status = 200
        console.log('返回的被修改班级的信息', ctx.body)
    } catch (error) {
        console.log(error)
        await trx.rollback()
    }
}

const countBookedClasses = async user_id => {
    const result = await knex('classes')
        .leftJoin('student_class_schedule', 'classes.class_id', 'student_class_schedule.class_id')
        .select('classes.status as class_status', 'classes.class_id as class_id', 'student_class_schedule.status as schedule_status')
        .countDistinct('classes.class_id as count')
        .where({ user_id, 'student_class_schedule.status': 'confirmed' })
        .whereNotIn('classes.status', ['ended', 'cancelled'])
    return _.get(result, '0.count')
}

module.exports = { listSuggested, list, upsert, change, getClassByClassId, endClass, countBookedClasses }
