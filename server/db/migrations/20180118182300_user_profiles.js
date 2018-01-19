exports.up = function (knex, Promise) {
    return knex.schema.createTable('user_profiles', table => {
        table.int('user_id');
        table.string('display_name');
        table.enum('gender', ['f', 'm', 'u', 'o']);
        table.date('date_of_birth');
        table.enum('interests', ['football', 'volleyball', 'ping-pang', 'basketball']);
        table.text('description');
        table.string('mobile');
        table.string('email');
        table.string('language').defaultTo('en-US');
        table.string('location');
        table.string('avatar');

        table.foreign('user_id').references('users.user_id');
    })
};

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('user_profiles');
};
