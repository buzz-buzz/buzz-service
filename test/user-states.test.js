import UserState, { UserStates } from '../server/bll/user-state'
import User from './test-helpers/user'
import * as common from './test-helpers/common'
import * as classHourBll from '../server/bll/class-hours'

const { server, should, chai, knex } = require('./test-helpers/prepare')

describe('用户状态', () => {
    before(async () => {
        // await knex.migrate.rollback()
        await knex.migrate.latest()
        await knex.seed.run()
    })

    after(async () => {
        await knex.migrate.rollback()
    })

    async function testPotential() {
        const userId = (await User.createUserRequest({
            name: 'hahaha',
        })).body

        userId.should.gt(0)

        const result = await UserState.getLatest(userId)
        result.state.should.eql(UserStates.Potential)

        return userId
    }

    it('新用户会自动进入 potential 状态', async () => {
        await testPotential()
    })

    async function testLead() {
        const userId = await testPotential()

        await common.makeRequest('put', `/api/v1/users/${userId}`, {
            mobile: '17717373333',
        }, { user: process.env.BASIC_NAME, pass: process.env.BASIC_PASS })
        const result = await UserState.getLatest(userId)
        result.state.should.eql(UserStates.Lead)

        return userId
    }

    it('新注册的用户填写手机号后，会变成 Leads 状态', async () => {
        await testLead()
    })

    async function testDemo() {
        const userId = await testLead()
        await common.makeRequest('put', `/api/v1/user-balance/${userId}`, {
            class_hours: 1,
        })
        const result = await UserState.getLatest(userId)
        result.state.should.eql(UserStates.Demo)

        return userId
    }

    it('Leads 第一次获得课时数，会变成 Demo 状态', async () => {
        await testDemo()
    })

    async function testWaitingForPurchase() {
        const userId = await testDemo()
        await classHourBll.consume(null, userId, 1)
        const result = await UserState.getLatest(userId)
        result.state.should.eql(UserStates.WaitingForPurchase)

        return userId
    }

    it('Demo 用户消耗完课时，就会进入 待购买 状态', async () => {
        await testWaitingForPurchase()
    })

    async function testInClass() {
        const userId = await testDemo()
        await common.makeRequest('put', `/api/v1/user-balance/${userId}`, {
            class_hours: 12,
        })
        const result = await UserState.getLatest(userId)
        result.state.should.eql(UserStates.InClass)
        return userId
    }

    it('Demo 用户一次性购买12或者以上课时，就会进入 正式上课 状态', async () => {
        await testInClass()
    })

    it('Lead 用户一次性购买 12 或者以上课时，就会进入 正式上课 状态', async () => {
        const userId = await testLead()
        await common.makeRequest('put', `/api/v1/user-balance/${userId}`, {
            class_hours: 12,
        })
        const result = await UserState.getLatest(userId)
        result.state.should.eql(UserStates.InClass)
    })

    it('待购买 用户一次性购买 12 或者以上课时，就会进入 正式上课 状态', async () => {
        const userId = await testWaitingForPurchase()
        await common.makeRequest('put', `/api/v1/user-balance/${userId}`, {
            class_hours: 12,
        })
        const result = await UserState.getLatest(userId)
        result.state.should.eql(UserStates.InClass)
    })

    it('正式用户的课时被消耗完毕时，就会变成 需续费 用户', async () => {
        const userId = await testInClass()
        await common.makeRequest('delete', `/api/v1/user-balance/${userId}`, {
            class_hours: 240,
        })
        const result = await UserState.getLatest(userId)
        result.state.should.eql(UserStates.WaitingForRenewal)
    })

    it('直接修改状态接口', async () => {
        const userId = (await User.createUserRequest({ name: 'hahaha' })).body
        await common.makeRequest('put', `/api/v1/user-states/${userId}`, {
            newState: UserStates.Invalid,
        })

        const state = await UserState.getLatest(userId)
        state.state.should.eql(UserStates.Invalid)
    })
})