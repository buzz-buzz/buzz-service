exports.seed = function (knex, Promise) {
    // Deletes ALL existing entries
    return knex('classes').del()
        .then(function () {
            // Inserts seed entries
            return knex('classes').insert([
                {
                    class_id: 1,
                    name: 'class 1',
                    start_time: new Date(2018, 1, 23, 18, 50),
                    end_time: new Date(2018, 1, 23, 19, 50)
                },
                {
                    class_id: 2,
                    name: 'class 2',
                    start_time: new Date(2018, 1, 24, 9, 0),
                    end_time: new Date(2018, 1, 24, 10, 0)
                },
                {
                    class_id: 3,
                    name: 'class 3',
                    start_time: new Date(2018, 1, 25, 8, 0),
                    end_time: new Date(2018, 1, 25, 9, 0)
                }
            ]);
        });
};