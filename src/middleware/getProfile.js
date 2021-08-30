const data = require('../data')

const getProfile = async (req, res, next) => {
    const profile = await data.getProfile(req, req.get('profile_id'))
    if(!profile) return res.status(401).end()
    req.profile = profile
    next()
}

module.exports = {getProfile}