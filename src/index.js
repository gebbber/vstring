const { randomBytes, createHash } = require('crypto');

const defaultTTL = 1*60*60*1000; // 1 hour
const defaultMethod = 'GET';
const defaultBytes = 32;

const config = {
    bytes: defaultBytes,
    ttl: defaultTTL, // milliseconds
    hashFunction: 'sha256',
    idEncoding: 'hex',
    method: defaultMethod
}

let db = require('./memory-store.js')();

module.exports = {
    
    new: newString,
    handle,
    intercept,
    
    use,
    
    method,

    bytes,
    ttl,
    weeks, days,
    hours, minutes, 
    seconds, millisecs
}

function ttl({days, hours, minutes, seconds, ms}={}) {

    let ttl = days || 0;
    ttl *= 24;
    ttl += hours || 0;
    ttl *= 60;
    ttl += minutes || 0;
    ttl *= 60;
    ttl += seconds || 0;
    ttl *= 1000;
    ttl += ms || 0;
    config.ttl = ttl || defaultTTL;

}

function millisecs(milliseconds) {config.ttl = milliseconds || defaultTTL;}
function seconds(seconds) {config.ttl = seconds*1000 || defaultTTL;}
function minutes(minutes) {config.ttl = minutes*60*1000 || defaultTTL;}
function hours(hours) {config.ttl = hours*60*60*1000 || defaultTTL;}
function days(days) {config.ttl = days*24*60*60*1000 || defaultTTL;}
function weeks(weeks) {config.ttl = weeks*7*24*60*60*1000 || defaultTTL;}

function bytes(bytes) {
    config.bytes = bytes || defaultBytes;
}

function method(method) {
    config.method = method || defaultMethod;
}

function use({store, ...options}) {
    if (store) {
        if (typeof store === 'function') db = store();
        else db=store;
    }
    for (key in options) config[key] = options[key];
}


async function newString({action, vparams, weeks, days, hours, minutes, seconds, ms}) {
    
    if (!action || typeof action !== 'string') throw new Error(`action is required`);
    if (action && !handlers[action] && !prod) throw new Error(`No handler added for ${action}`);
    
    const stringTTL = ((((((weeks || 0)*7 + (days||0))*24 + (hours||0))*60 + (minutes||0))*60 + (seconds||0))*1000 + (ms||0)) || config.ttl;
    
    const hash = createHash(config.hashFunction);
    const bytes = await randomBytes(config.bytes);
    hash.update(bytes);

    const newString = {
        _id: hash.digest(config.idEncoding).toLowerCase(),
        action,
        expires: Date.now() + stringTTL
    };
    
    if (vparams) newString.params = JSON.stringify(vparams);
    
    await db.save(newString);

    return {
        string: bytes.toString(config.idEncoding),
        expires: new Date(newString.expires)
    };

}


async function lookUp(vString) {
    const hash = createHash(config.hashFunction);
    hash.update(Buffer.from(vString,config.idEncoding));
    const _id = hash.digest(config.idEncoding).toLowerCase();
    const found = await db.findById(_id);
    if (!found) return null;
    const {expires, action, params} = found;
    if (expires < Date.now()) return deleteString(_id);
    return {_id, action, params};
}

function deleteString(vString) {
    db.findByIdAndDelete(vString)
    .then(()=>{})
    .catch(err=>{});
    return null;
}


const handlers = {};

function handle(action, handler) {
    if (typeof handler !== 'function') throw new Error('handler must be a function');
    if (!action || typeof action !== 'string') throw new Error('action is required');
    if (handlers[action]) throw new Error('action already has handler');
    handlers[action] = handler;
}

// The Grande Finale...
 function intercept(path, app) {

    if (!path) throw new Error('');
    
    app.use(path, async (req, res, next) => {
        
        if (!config.method.toUpperCase().split(' ').includes(req.method.toUpperCase())) return next();
        
        const splitUrl = req.url.split('/')
        splitUrl.shift();
        const vString = splitUrl.shift();
        const found = await lookUp(vString);
        
        if (!found) return next(); // silently proceed
        const {_id, action, params} = found;
        
        req.vparams = JSON.parse(params || "{}");
        req.url = '/' + splitUrl.join('/');
        
        const result = handlers[action](req, res, next);
        
        const keepString = (result && result.then) ? await result : result;
        
        if (!keepString) deleteString(_id);
        
    });

    db.init()
    .then(()=>{
        db.flushExpired(Date.now());
    })
    .catch(err=>{
        throw err;
    })
    

}