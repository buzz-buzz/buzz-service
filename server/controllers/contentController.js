import logger from '../common/logger'

const promisify = require('../common/promisify')
const env = process.env.NODE_ENV || 'test'
const config = require('../../knexfile')[env]
const knex = require('knex')(config)
const _ = require('lodash')

async function findOneById(content_id) {
    return content_id ? _.get(await knex('content').where({ content_id }), 0) : content_id
}

async function findOneByClassAndUser({ module, topic, topic_level, level }) {
    const content = _.get(await knex('content').where({ module, topic, topic_level }), 0)
    if (!content) return {}
    _.each(['exercises', 'student_textbook', 'tutor_textbook'], i => {
        let v = content[i]
        if (!v) return
        v = JSON.parse(v)
        content[i] = v[_.toInteger(level)] || v[0]
    })
    return content
}

const upsert = async ctx => {
    const { body } = ctx.request

    const trx = await promisify(knex.transaction)

    try {
        let content_id = body.content_id
        const current = await findOneById(content_id)

        if (current) {
            await trx('content')
                .update(body)
                .where('content_id', content_id)
        } else {
            delete body.content_id
            const result = await trx('content').insert(body)
            content_id = _.get(result, 0)
        }

        await trx.commit()

        ctx.body = await findOneById(content_id)
    } catch (error) {
        logger.error(error)

        await trx.rollback()
        ctx.status = 500
        ctx.body = {
            error: 'Upsert failed!',
        }
    }
}

const query = async ctx => {
    let query = knex('content')
    const { content_id } = ctx.query
    if (content_id) {
        if (_.isArray(content_id)) {
            query = query.whereIn('content_id', content_id)
        } else {
            query = query.where({ content_id })
        }
    } else {
        _.each(['module', 'topic', 'topic_level'], i => {
            const v = ctx.query[i]
            if (v) {
                if (_.isArray(v)) {
                    query = query.whereIn(i, v)
                } else {
                    query = query.where(i, v)
                }
            }
        })
    }
    ctx.body = await query.orderBy('content_id', 'desc').paginate(ctx.query.per_page, ctx.query.current_page)
}
const topic = async ctx => {
    ctx.body = await knex('content')
        .distinct('topic')
        .pluck('topic')
}
const moduleList = async ctx => {
    ctx.body = await knex('content')
        .distinct('module')
        .pluck('module')
}
const topic_level = async ctx => {
    ctx.body = await knex('content')
        .distinct('topic_level')
        .pluck('topic_level')
}

const getByClassAndUser = async ctx => {
    ctx.body = await findOneByClassAndUser(ctx.query)
}

const getByUserIDs = async ctx => {
    const { user_ids, bypass_class_ids } = ctx.query
    ctx.body = await knex('classes')
        .leftJoin('student_class_schedule', 'classes.class_id', 'student_class_schedule.class_id')
        .whereIn('student_class_schedule.user_id', _.isArray(user_ids) ? user_ids : [user_ids])
        // .whereNotIn('classes.class_id', _.isArray(bypass_class_ids) ? bypass_class_ids : [bypass_class_ids])
        .whereNot('classes.status', 'cancelled')
        .whereNotNull('student_class_schedule.class_id')
        .select('classes.topic', 'classes.module', 'classes.topic_level')
        .distinct('classes.topic', 'classes.module', 'classes.topic_level')
}

module.exports = { upsert, query, topic, moduleList, topic_level, getByClassAndUser, getByUserIDs }
