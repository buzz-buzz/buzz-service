exports.seed = function (knex, Promise) {
    // Deletes ALL existing entries
    return knex('user_profiles').del()
        .then(() => knex('user_profiles').insert([
            {
                user_id: 1,
                avatar: 'rowValue1',
                mobile: '17717373367',
                email: 'jie.tian@hotmail.com',
                password: '$2a$10$0I7CYTjBCVp.SfLUhH/qj.IemtRAHoQnrOwPQ69BO5w3H3NDPX/4G',
                weekly_schedule_requirements: 1,
            },
            {
                user_id: 2,
                avatar: 'rowValue2',
                mobile: '17717373368',
                email: 'tian.jie@hotmail.com',
                password: '$2a$10$0I7CYTjBCVp.SfLUhH/qj.IemtRAHoQnrOwPQ69BO5w3H3NDPX/4G',
                weekly_schedule_requirements: 1,
            },
            {
                user_id: 3,
                avatar: 'rowValue3',
                mobile: '17717373369',
                email: '373737373@qq.com',
                password: '$2a$10$0I7CYTjBCVp.SfLUhH/qj.IemtRAHoQnrOwPQ69BO5w3H3NDPX/4G',
                time_zone: 'America/Los_Angeles',
                weekly_schedule_requirements: 1,
            },
        ]))
}
