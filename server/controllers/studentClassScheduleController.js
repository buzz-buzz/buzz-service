const promisify = require('../common/promisify')
const env = process.env.NODE_ENV || "test";
const config = require("../../knexfile")[env];
const knex = require("knex")(config);
let uniformTime = function (theStartTime, theEndTime) {
    let start_time = theStartTime;
    if (start_time) {
        start_time = new Date(start_time);
    } else {
        start_time = new Date(0, 0, 0);
    }

    let end_time = theEndTime;
    if (end_time) {
        end_time = new Date(end_time);
    } else {
        end_time = new Date(9999, 11, 30);
    }
    return {start_time, end_time};
};
const list = async ctx => {
    try {
        let {start_time, end_time} = uniformTime(ctx.query.start_time, ctx.query.end_time);

        ctx.body = await selectSchedules()
            .where('users.user_id', ctx.params.user_id)
            .andWhere('student_class_schedule.start_time', '>=', start_time)
            .andWhere('student_class_schedule.end_time', '<=', end_time);
    } catch (error) {
        console.error(error);
        ctx.throw(500, error);
    }
};

let selectSchedules = function () {
    return knex('users')
        .leftJoin('student_class_schedule', 'users.user_id', 'student_class_schedule.user_id')
        .select('users.user_id as user_id', 'student_class_schedule.status as status', 'student_class_schedule.start_time as start_time', 'student_class_schedule.end_time as end_time');
};

let checkTimeConflictsWithDB = async function (user_id, time, start_time, end_time) {
    let selected = await knex('student_class_schedule')
        .where('user_id', '=', user_id)
        .andWhere(time, '>=', start_time.getTime())
        .andWhere(time, '<=', end_time.getTime())
        .select('student_class_schedule.user_id')
    ;

    if (selected.length > 0) {
        throw new Error(`Schedule ${time} conflicts!`);
    }
};

function checkTimeConflicts(data) {
    for (let i = 0; i < data.length - 1; i++) {
        for (let j = i + 1; j < data.length; j++) {
            if (
                (data[i].start_time >= data[j].start_time
                    && data[i].start_time <= data[j].end_time) ||
                (data[i].end_time >= data[j].start_time
                    && data[i].end_time <= data[j].end_time)) {

                throw new Error('schedule conflicts!');
            }
        }
    }
}

let uniformTimes = function (data) {
    for (let i = 0; i < data.length; i++) {
        let u = uniformTime(data[i].start_time, data[i].end_time);
        data[i].start_time = u.start_time;
        data[i].end_time = u.end_time;
    }
};
const create = async ctx => {
    let {body} = ctx.request;
    let data = body.map(b => Object.assign({user_id: ctx.params.user_id}, b));

    try {
        uniformTimes(data);
        checkTimeConflicts(data);

        for (let i = 0; i < data.length; i++) {
            await checkTimeConflictsWithDB(ctx.params.user_id, 'start_time', data[i].start_time, data[i].end_time);
            await checkTimeConflictsWithDB(ctx.params.user_id, 'end_time', data[i].start_time, data[i].end_time);
        }

        let inserted = await knex('student_class_schedule')
            .returning('start_time')
            .insert(data)
        ;

        ctx.status = 201;
        ctx.set('Location', `${ctx.request.URL}/${ctx.params.user_id}`);
        ctx.body = inserted;
    } catch (ex) {
        console.error(ex);
        ctx.throw(409, ex);
    }
};
module.exports = {list, create};