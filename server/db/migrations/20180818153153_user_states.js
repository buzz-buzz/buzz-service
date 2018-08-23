import { UserStates } from '../../bll/user-state'

exports.up = function (knex, Promise) {
    return knex.schema.createTable('user_states', table => {
        table.bigInteger('user_id').unsigned().notNullable()
        table.enum('state', [UserStates.Potential, UserStates.Lead, UserStates.Demo, UserStates.WaitingForPurchase, UserStates.InClass, UserStates.WaitingForRenewal, UserStates.Invalid])
        table.timestamp('timestamp').defaultTo(knex.fn.now())
        table.text('remark')

        table.foreign('user_id').references('users.user_id').onDelete('CASCADE').onUpdate('CASCADE')
    })
}

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('user_states')
}