const timeHelper = require('../../common/time-helper')

exports.seed = function (knex, Promise) {
    // Deletes ALL existing entries
    return knex('student_class_schedule').del()
        .then(() =>
            // Inserts seed entries
            knex('student_class_schedule').insert([
                {
                    user_id: 1,
                    class_id: 1,
                    status: 'booking',
                    start_time: timeHelper.convertToDBFormat(new Date(2018, 1, 24, 9, 0)),
                    end_time: timeHelper.convertToDBFormat(new Date(2018, 1, 24, 10, 0)),
                },
                {
                    user_id: 2,
                    class_id: 1,
                    status: 'booking',
                    start_time: timeHelper.convertToDBFormat(new Date(2018, 1, 24, 9, 0)),
                    end_time: timeHelper.convertToDBFormat(new Date(2018, 1, 24, 10, 0)),
                },
                {
                    user_id: 2,
                    class_id: 2,
                    status: 'cancelled',
                    start_time: timeHelper.convertToDBFormat(new Date(2018, 1, 24, 13, 0)),
                    end_time: timeHelper.convertToDBFormat(new Date(2018, 1, 24, 14, 0)),
                },
                {
                    user_id: 3,
                    class_id: 3,
                    status: 'confirmed',
                    start_time: timeHelper.convertToDBFormat(new Date(2016, 1, 1, 9, 0)),
                    end_time: timeHelper.convertToDBFormat(new Date(2016, 1, 1, 10, 0)),
                },
                {
                    user_id: 4,
                    class_id: 4,
                    status: 'confirmed',
                    start_time: timeHelper.convertToDBFormat(new Date(2016, 1, 1, 9, 0)),
                    end_time: timeHelper.convertToDBFormat(new Date(2016, 1, 1, 10, 0)),
                },
                {
                    user_id: 5,
                    batch_id: 1,
                    status: 'booking',
                    start_time: timeHelper.convertToDBFormat(new Date(2016, 1, 1, 9, 0)),
                    end_time: timeHelper.convertToDBFormat(new Date(2016, 1, 1, 10, 0)),
                },
                {
                    user_id: 5,
                    batch_id: 2,
                    status: 'cancelled',
                    start_time: timeHelper.convertToDBFormat(new Date(2017, 1, 1, 9, 0)),
                    end_time: timeHelper.convertToDBFormat(new Date(2017, 1, 1, 10, 0)),
                },
            ]))
}
