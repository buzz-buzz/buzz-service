exports.up = function (knex, Promise) {
    return knex.schema.hasTable('class_subscribers').then(exists => {
        if (!exists) {
            return knex.schema.createTable('class_subscribers', table => {
                table.bigInteger('class_id').unsigned()
                table.bigInteger('user_id').unsigned()

                table.primary(['class_id', 'user_id'])
                table.foreign('user_id').references('users.user_id').onDelete('CASCADE').onUpdate('CASCADE')
                table.foreign('class_id').references('classes.class_id').onDelete('CASCADE').onUpdate('CASCADE')
            })
        }

        return exists
    })
}

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('class_subscribers')
}
