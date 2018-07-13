exports.up = function (knex, Promise) {
    return knex.schema.table('faq', table => {
        table.dropColumn('content')
    })
}

exports.down = function (knex, Promise) {
    return knex.schema.table('faq', table => {
        table.text('content')
    })
}
