import logger from '../common/logger'

const { UserNotFoundError } = require('../bll/user')
const { BalanceClassHourInSufficientError, EndTimeWithinHalfHourLaterOfStartTimeError, StartTimeEarlierThanNowError } = require('../bll/booking')
const bookings = require('../bll/booking')

const batchCreateBookings = async ctx => {
    try {
        ctx.body = await bookings.batchCreateBookingsFor(ctx.params.user_id, ctx.request.body)
    } catch (ex) {
        logger.error(ex)

        if ((ex instanceof UserNotFoundError) || (ex instanceof BalanceClassHourInSufficientError) || (ex instanceof StartTimeEarlierThanNowError) || (ex instanceof EndTimeWithinHalfHourLaterOfStartTimeError)) {
            return ctx.throw(400, ex)
        }

        if (['UserNotFoundError', 'BalanceClassHourInSufficientError', 'StartTimeEarlierThanNowError', 'EndTimeWithinHalfHourLaterOfStartTimeError'].indexOf(ex.name)) {
            return ctx.throw(400, ex)
        }

        return ctx.throw(500, ex)
    }
}

const listBatchBookingsForSingleUser = async ctx => {
    try {
        ctx.body = await bookings.listBatchBookingsFor(ctx.params.user_id)
    } catch (ex) {
        console.error(ex)

        ctx.throw(500, ex)
    }
}

const cancelBatchBookingForSingleUser = async ctx => {
    try {
        ctx.body = await bookings.cancelBatchBookingFor(ctx.params.user_id, ctx.params.batch_id)
    } catch (ex) {
        console.error(ex)

        ctx.throw(500, ex)
    }
}

const listBatchBookingsForMultipleUsers = async ctx => {
    try {
        ctx.body = await bookings.listBatchBookings(ctx.query.users)
    } catch (ex) {
        console.error(ex)
        ctx.throw(500, ex)
    }
}

const listAllBookingsForMultipleUsers = async ctx => {
    try {
        ctx.body = await bookings.listAllBookings(ctx.query.users)
    } catch (ex) {
        console.error(ex)
        ctx.throw(500, ex)
    }
}

module.exports = {
    batchCreateBookings,
    listBatchBookingsForSingleUser,
    cancelBatchBookingForSingleUser,
    listBatchBookingsForMultipleUsers,
    listAllBookingsForMultipleUsers,
}
