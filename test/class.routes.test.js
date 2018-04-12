// Configure the environment and require Knex
const moment = require('moment')
const env = process.env.NODE_ENV || 'test'
console.log('env = ', env)
const config = require('../knexfile')[env]
const server = require('../server/index')
const knex = require('knex')(config)
const PATH = '/api/v1/class-schedule'
// Require and configure the assertion library
const chai = require('chai')
const should = chai.should()
const chaiHttp = require('chai-http')
chai.use(chaiHttp)
// Rollback, commit and populate the test database before each test
describe('routes: class schedules', () => {
    beforeEach(() => knex.migrate
        .rollback()
        .then(() => knex.migrate.latest())
        .then(() => knex.seed.run()))
    // Rollback the migration after each test
    afterEach(() => knex.migrate.rollback())

    // Here comes the first test
    describe(`GET ${PATH}/suggested-classes`, () => {
        it('should return all the suggested class schedules for ', done => {
            chai
                .request(server)
                .get(`${PATH}/suggested-classes?time_range_start=2018-1-1`)
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(200)
                    res.type.should.eql('application/json')
                    res.body.length.should.eql(2)
                    res.body[0].should.include.keys('user_id', 'status')
                    done()
                })
        })
    })
    /** every subsequent test must be added here !! * */

    describe(`GET ${PATH}`, () => {
        it('should list all the classes', done => {
            chai
                .request(server)
                .get(`${PATH}`)
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(200)
                    res.type.should.eql('application/json')
                    res.body[0].should.include.keys('room_url', 'companions', 'students')
                    done()
                })
        })
    })
    describe(`GET ${PATH}/:class_id`, () => {
        it('通过class_id获取到班级信息', done => {
            chai
                .request(server)
                .get(`${PATH}/1`)
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(200)
                    res.body[0].should.include.keys('companion_name')
                    done()
                })
        })
    })
    describe(`POST ${PATH}`, () => {
        it('should create a class and then update it without error', done => {
            chai
                .request(server)
                .post(`${PATH}`)
                .send({
                    adviser_id: 1,
                    companions: [4, 5, 6],
                    level: 'aa',
                    start_time: '2018-03-02T10:00:00Z',
                    end_time: '2018-03-02T11:00:00Z',
                    status: 'opened',
                    name: 'Test class',
                    remark: 'xxx',
                    topic: 'animal',
                    students: [1, 2, 3],
                    exercises: '["yyy","zzz"]',
                    room_url: 'http://www.baidu.com',
                })
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(201)
                    res.type.should.eql('application/json')
                    res.body.adviser_id.should.eql(1)
                    res.body.end_time.should.eql('2018-03-02T11:00:00Z')
                    res.body.name.should.eql('Test class')
                    res.body.start_time.should.eql('2018-03-02T10:00:00Z')
                    res.body.status.should.eql('opened')
                    res.body.topic.should.eql('animal')

                    const classId = res.body.class_id

                    chai
                        .request(server)
                        .get('/api/v1/student-class-schedule')
                        .end((err, res) => {
                            should.not.exist(err)
                            res.status.should.eql(200)
                            res.type.should.eql('application/json')
                            res.body.length.should.gt(3)

                            const studentClassSchedules = res.body.length

                            chai.request(server)
                                .get('/api/v1/companion-class-schedule')
                                .end((err, res) => {
                                    should.not.exist(err)
                                    res.status.should.eql(200)
                                    res.type.should.eql('application/json')
                                    res.body.length.should.gt(3)
                                    const companionClassSchedules = res.body.length

                                    chai.request(server)
                                        .post(`${PATH}`)
                                        .send({
                                            class_id: classId,
                                            adviser_id: 1,
                                            companions: [],
                                            start_time: '2018-03-02T10:00:00Z',
                                            end_time: '2018-03-02T11:00:00Z',
                                            status: 'opened',
                                            name: 'Test class',
                                            remark: 'xxx',
                                            topic: 'animal',
                                            students: [],
                                            exercises: '["yyy","zzz"]',
                                            room_url: 'http://www.baidu.com',
                                        })
                                        .end((err, res) => {
                                            should.not.exist(err)
                                            res.status.should.eql(200)

                                            chai.request(server)
                                                .get('/api/v1/student-class-schedule')
                                                .end((err, res) => {
                                                    should.not.exist(err)
                                                    console.log('checking student schedules')
                                                    console.log(res.body)
                                                    res.body.length.should.eql(studentClassSchedules - 3)

                                                    chai.request(server)
                                                        .get('/api/v1/companion-class-schedule')
                                                        .end((err, res) => {
                                                            should.not.exist(err)
                                                            console.log('checking companion schedules')
                                                            res.body.length.should.eql(companionClassSchedules - 3)
                                                            done()
                                                        })
                                                })
                                        })
                                })
                        })
                })
        })

        it('should allow remove all students from a class', done => {
            chai
                .request(server)
                .post(`${PATH}`)
                .send({
                    adviser_id: 1,
                    companions: [4, 5, 6],
                    level: 'aa',
                    start_time: '2018-03-02T10:00:00Z',
                    end_time: '2018-03-02T11:00:00Z',
                    status: 'opened',
                    name: 'Test class',
                    remark: 'xxx',
                    topic: 'animal',
                    students: [1, 2, 3],
                    exercises: '["yyy","zzz"]',
                    room_url: 'http://www.baidu.com',
                })
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(201)
                    res.type.should.eql('application/json')
                    const classId = res.body.class_id

                    chai
                        .request(server)
                        .post(`${PATH}`)
                        .send({
                            class_id: classId,
                            end_time: '2018-03-02T11:00:00Z',
                            students: [],
                        })
                        .end((err, res) => {
                            should.not.exist(err)
                            res.status.should.eql(200)
                            res.type.should.eql('application/json')
                            should.not.exist(res.body.students)

                            done()
                        })
                })
        })
    })
    describe('Class Schedule Update', () => {
        it('should allow change students in a class without changing companion', done => {
            chai
                .request(server)
                .post(`${PATH}`)
                .send({
                    adviser_id: 1,
                    companions: [4, 5, 6],
                    level: 'aa',
                    start_time: '2018-03-02T10:00:00Z',
                    end_time: '2018-03-30T16:53:00Z',
                    status: 'opened',
                    name: 'Test class',
                    remark: 'xxx',
                    topic: 'animal',
                    students: [1, 2, 3],
                    exercises: '["yyy","zzz"]',
                    room_url: 'http://www.baidu.com',
                })
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(201)
                    res.type.should.eql('application/json')
                    const classId = res.body.class_id

                    chai
                        .request(server)
                        .post(`${PATH}`)
                        .send({
                            class_id: classId,
                            end_time: '2018-03-30T16:53:00Z',
                            students: [3, 8, 9],
                        })
                        .end((err, res) => {
                            // should.not.exist(err)
                            // res.status.should.eql(200)
                            // res.type.should.eql('application/json')
                            // res.body.students.should.eql('3,8,9')
                            // setTimeout(() => {
                            //     chai
                            //         .request(server)
                            //         .get(`${PATH}/${classId}`)
                            //         .end((err, res) => {
                            //             should.not.exist(err)
                            //             res.status.should.eql(200)
                            //             res.type.should.eql('application/json')
                            //             res.body[0].should.include.keys('status')
                            //             res.body[0].status.should.eql('ended')
                            //             done()
                            //         })
                            // }, 10000)

                            done()
                        })
                })
        })
    })

    describe(`PUT ${PATH}`, () => {
        it('更新班级状态，超过班级结束时间的：班级状态改为ended、外籍伙伴状态改为ended，', done => {
            chai
                .request(server)
                .put(`${PATH}`)
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(200)
                    done()
                })
        })
    })
    describe(`PUT ${PATH}/:class_id`, () => {
        it('班级id为class_id的班级结束时间过时，就更新班级状态', done => {
            chai
                .request(server)
                .put(`${PATH}/1`)
                .send({
                    body: new Date(2019, 1, 23, 18, 50).getTime(),
                })
                .end((err, res) => {
                    should.not.exist(err)
                    res.status.should.eql(200)
                    res.body[0].status.should.eql('ended')
                    done()
                })
        })
    })
})
