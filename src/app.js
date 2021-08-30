const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const constants = require('./constants')
const data = require('./data')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

app.get('/contracts/:id', getProfile, async (req, res) =>{
    const contract = await data.getContractsById(req, req.params.id)
    if(!contract) {
        res.status(404)
        return res.jsonp(constants.messages.noContract)
    }    
    res.jsonp(contract)
})

app.get('/contracts', getProfile, async (req, res) =>{
    const contract = await data.getActiveContracts(req)
    if(!contract) {
        res.status(404)
        return res.jsonp(constants.messages.noContract)
    }    
    res.jsonp(contract)
})

app.get('/jobs/unpaid', getProfile, async (req, res) =>{
    const job = await data.getJobsUnpaid(req)
    if(!job) {
        res.status(404)
        return res.jsonp(constants.messages.noJobs)
    }    
    res.jsonp(job)
})

app.post('/jobs/:job_id/pay', getProfile, async (req, res) =>{
    const profile = req.profile
    const job = await data.getJobById(req, req.params.job_id)
    if(!job || job.price > req.profile.balance) {
        res.status(404)
        return res.jsonp(constants.messages.conditions)
    }
    await data.setPayment(job, profile, req)
    res.status(200).end()
})

app.post('/balances/deposit/:user_id', async (req, res) =>{
    const {user_id} = req.params
    const {deposit} = req.body
    if(!deposit) {
        res.status(404)
        return res.jsonp(constants.messages.depositRequire)
    }
    const job = await data.getPriceToPayByClientId(req, user_id)
    if(!job || deposit > (job.total_price * 0.25)) {
        res.status(404)
        return res.jsonp(constants.messages.conditions)
    }
    const client = await data.getProfile(req, user_id);
    await data.setBalance(client, deposit)
    res.jsonp(client.balance)
    res.status(200).end()
})

app.get('/admin/best-profession', async (req, res) =>{
    // Format date: YYYY-MM-DD
    const {start, end} = req.query
    const job = await data.getBestProfession(req, start, end)
    if(!job) {
        res.status(404)
        return res.jsonp(constants.messages.conditions)
    }
    const contractor = await data.getProfile(req, job["Contract.ContractorId"]);
    res.jsonp({
        id: contractor.id,
        profession: contractor.profession,
        profits: job.total_price
    })
    res.status(200).end()
})

app.get('/admin/best-clients', async (req, res) =>{
    // Format date: YYYY-MM-DD
    const {start, end, limit = 2} = req.query
    const job = await data.getBestClients(req, start, end, limit)
    if(!job) {
        res.status(404)
        return res.jsonp(constants.messages.conditions)
    }
    res.jsonp(job)
    res.status(200).end()
})

module.exports = app;
