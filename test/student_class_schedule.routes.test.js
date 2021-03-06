import ClassScheduleDAL from '../server/dal/class-schedules'

const env = process.env.NODE_ENV || 'test'
const config = require('../knexfile')[env]
const server = require('../server/index')
const knex = require('knex')(config)
const PATH = '/api/v1/student-class-schedule'
// Require and configure the assertion library
const chai = require('chai')
const should = chai.should()
const chaiHttp = require('chai-http')
chai.use(chaiHttp)
// Rollback, commit and populate the test database before each test
describe('routes: student class schedule', () => {
    beforeEach(() => knex.migrate
        .rollback()
        .then(() => knex.migrate.latest())
        .then(() => knex.seed.run()))
    // Rollback the migration after each test
    afterEach(() => knex.migrate.rollback())
    // Here comes the first test
    describe(`GET ${PATH}/:user_id`, () => {
        it('should return all the user schedules for :user_id', done => {
            chai
                .request(server)
                .get(`${PATH}/2?start_time=2018-1-1&end_time=`)
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(200)
                    res.type.should.eql('application/json')
                    res.body.length.should.eql(3)
                    res.body[0].should.include.keys('user_id', 'status', 'classes_status', 'topic', 'companion_name', 'companion_avatar', 'title', 'comment', 'score', 'from_user_id', 'to_user_id', 'companion_id', 'CURRENT_TIMESTAMP')
                    done()
                })
        })
    })
    /** every subsequent test must be added here !! * */

    describe(`POST ${PATH}/:user_id`, () => {
        it('should return the newly added schedules alongside a Location header', done => {
            chai
                .request(server)
                .post(`${PATH}/2`)
                .send([{
                    start_time: new Date(2018, 1, 1, 1, 0),
                    end_time: new Date(2018, 1, 1, 2, 0),
                    status: 'booking',
                }, {
                    start_time: new Date(2018, 1, 2, 1, 0),
                    end_time: new Date(2018, 1, 2, 2, 0),
                    status: 'booking',
                }, {
                    start_time: new Date(2018, 1, 3, 1, 0),
                    end_time: new Date(2018, 1, 3, 2, 0),
                    status: 'booking',
                }])
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(201)
                    res.should.have.header('Location')
                    res.type.should.eql('application/json')

                    // Should not make interests duplicate:
                    chai.request(server)
                        .get('/api/v1/users?role=s')
                        .end((err, res) => {
                            should.not.exist(err)
                            res.status.should.eql(200)
                            res.body[0].interests.should.eql('business')

                            done()
                        })
                })
        })
        it('should return an error when the schedule conflicts', done => {
            chai
                .request(server)
                .post(`${PATH}/1`)
                .send([{
                    start_time: new Date(2018, 1, 24, 9, 0),
                    end_time: new Date(2018, 1, 24, 10, 0),
                }, {
                    start_time: new Date(2018, 1, 2, 1, 0),
                    end_time: new Date(2018, 1, 2, 2, 0),
                }])
                .end((err, res) => {
                    should.exist(err)
                    res.status.should.eql(409)
                    res.type.should.eql('text/plain')
                    res.text.should.eql('Schedule start_time conflicts!')
                    done()
                })
        })

        it('should not allow inserting 2 same events ', done => {
            chai
                .request(server)
                .post(`${PATH}/2`)
                .send([
                    {
                        start_time: new Date(2018, 4, 2, 17, 0, 0),
                        end_time: new Date(2018, 4, 2, 17, 30, 0),
                        status: 'booking',
                    },
                ])
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(201)

                    chai
                        .request(server)
                        .get(`${PATH}/2`)
                        .end((err, res) => {
                            should.not.exist(err)
                            res.status.should.eql(200)
                            res.type.should.eql('application/json')
                            res.body.length.should.gt(0)

                            chai
                                .request(server)
                                .post(`${PATH}/2`)
                                .send([
                                    {
                                        start_time: new Date(2018, 4, 2, 17, 0, 0),
                                        end_time: new Date(2018, 4, 2, 17, 30, 0),
                                        status: 'booking',
                                    },
                                ])
                                .end((err, res) => {
                                    should.exist(err)
                                    res.status.should.eql(409)
                                    res.type.should.eql('text/plain')
                                    res.text.should.eql('Schedule start_time conflicts!')
                                    done()
                                })
                        })
                })
        })
    })

    describe(`PUT ${PATH}/:user_id`, () => {
        it('should allow user cancel a booking', done => {
            chai
                .request(server)
                .put(`${PATH}/1`)
                .send({
                    start_time: new Date(2018, 1, 24, 9, 0),
                })
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(200)
                    res.type.should.eql('application/json')
                    res.body.should.eql({ status: 'cancelled', user_id: 1 })

                    done()
                })
        })

        it('should throw error if trying to cancel a non-exist booking', done => {
            chai
                .request(server)
                .put(`${PATH}/1`)
                .send({
                    start_time: new Date(2018, 2, 26, 9, 0),
                })
                .end((err, res) => {
                    should.exist(err)
                    res.status.should.eql(500)

                    done()
                })
        })
    })

    describe('用户是否被排过课的场景', () => {
        it('可以根据用户 id 查找他是否被排课--', async () => {
            let result = await ClassScheduleDAL.hasClassSchedules(4)

            result.should.not.eql(undefined)
            result.length.should.gt(0)

            result = await ClassScheduleDAL.hasClassSchedules(9999)
            result.length.should.eql(0)
        })
    })
})
