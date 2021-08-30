const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const constants = require('./constants')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
const { Op, fn, col, literal } = require("sequelize");

async function getProfile(req, id) {
    const {Profile} = req.app.get('models')
    return await Profile.findOne({
        where: {
            id: id || 0
        }
    })
}

async function getActiveContracts(req) {
    const {Contract} = req.app.get('models')
    return await Contract.findAll({
        where: { 
            [Op.or]: [
                { ContractorId: req.profile.id },
                { ClientId: req.profile.id }
            ],
            status: {[Op.notLike]: constants.contractStatus.terminated }
        }
    })
}

async function getContractsById(req, id) {
    const {Contract} = req.app.get('models')
    return await Contract.findOne({
        where: {
            id,
            [Op.or]: [
                { ContractorId: req.profile.id },
                { ClientId: req.profile.id }
            ],
        }
    })
}

async function getJobsUnpaid(req) {
    const {Contract, Job} = req.app.get('models')
    return await Job.findAll({
        include: [{
            model: Contract,
            required: true,
            where: { 
                [Op.or]: [
                    { ContractorId: req.profile.id },
                    { ClientId: req.profile.id }
                ],
                status: {[Op.notLike]: constants.contractStatus.terminated },
            }
        }],
        where: {
            paid: { [Op.not]: true }
        }
    })
}

async function getJobById(req, job_id) {
    const {Contract, Job} = req.app.get('models')
    return await Job.findOne({
        include: [{
            model: Contract,
            required: true,
            where: { 
                ClientId: req.profile.id,
                status: {[Op.notLike]: constants.contractStatus.terminated },
            }
        }],
        where: {
            paid: { [Op.not]: true },
            id: job_id
        }
    })
}

async function getPriceToPayByClientId(req, user_id) {
    const {Contract, Job} = req.app.get('models')
    return await Job.findOne({
        attributes: [
            [fn('sum', col('price')), 'total_price'],
        ],
        raw: true,
        include: [{
            model: Contract,
            required: true,
            where: { 
                ClientId: user_id,
                // NOTE: I only include the jobs from active contracts as unpaid
                status: {[Op.notLike]: constants.contractStatus.terminated },
            }
        }],
        where: {
            paid: { [Op.not]: true }
        }
    })
}

async function getBestProfession(req, start, end) {
    const {Contract, Job} = req.app.get('models')
    return await Job.findOne({
        attributes: [
            [fn('sum', col('price')), 'total_price'],
        ],
        raw: true,
        include: [{
            model: Contract,
            attributes: ['ContractorId'],
            required: true,
            group: ['ContractorId'],
        }],
        group: ['ContractorId'],
        where: {
            paid: { [Op.is]: true },
            paymentDate: { [Op.between]: [start, end]}
        },
        order: literal('total_price DESC'),
    })
}

async function getBestClients(req, start, end, limit) {
    const {Contract, Job, Profile} = req.app.get('models')
    return await Job.findAll({
        attributes: [
            [fn('sum', col('price')), 'total_price'],
        ],
        raw: true,
        include: [{
            model: Contract,
            attributes: ['ClientId'],
            required: true,
            group: ['ClientId'],
            include: [{
                model: Profile,
                as: 'Client',
                attributes: [[literal("firstName || ' ' || lastName"), 'fullName']],
                required: true,
            }],
        }],
        group: ['ClientId'],
        where: {
            paid: { [Op.is]: true },
            paymentDate: { [Op.between]: [start, end]}
        },
        order: literal('total_price DESC'),
        limit 
    })
}

async function setPayJob(job) {
    job.paid = true
    job.paymentDate = Date.now()
    await job.save()
}

async function setAddProfits(req, job) {
    const contractor = await getProf(req, job.Contract.ContractorId);
    contractor.balance += job.price
    await contractor.save()
}

async function setPay(profile, job) {
    profile.balance -= job.price
    await profile.save()
}

async function setPayment(job, profile, req) {
    setPayJob(job)
    setPay(profile, job)
    setAddProfits(req, job)
}

async function setBalance(client, deposit) {
    client.balance += deposit
    await client.save()
}

module.exports = {
    getProfile,
    getActiveContracts,
    getContractsById,
    getJobsUnpaid,
    getJobById,
    getPriceToPayByClientId,
    getBestProfession,
    getBestClients,
    setPayment,
    setBalance,
}