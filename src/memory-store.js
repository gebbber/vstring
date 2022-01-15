module.exports = ({option1, option2}={}) => {

    // These aren't used; just to demonstrate the API provided to database stores
    if (option1) console.log(option1);
    if (option2) console.log(option2);

    return {
        init,
        flushExpired,

        save,
        findById,
        findByIdAndDelete
    }

}

const db = {}

// Do whatever needs to get done to initialize a
// connection, etc.:
async function init() {
    // nothing to do for an in-memory store
}


// Guaranteed to get String for each of '_id',
// 'action', 'params'; and Number for 'expires'
async function save({_id, action, params, expires}) {
    db[_id] = {action, params, expires};
}


// Must return same as fields/formats as above,
// or null if not found
async function findById(_id) {
    return db[_id] || null;
}


// No need to return anything but a promise
async function findByIdAndDelete(_id) {
    if (db[_id]) delete db[_id];
}


// 'expires' is millisecs since Unix epoch; can do
// simple number comparison with parameter
async function flushExpired(thanThis)
{
    for (const _id in db) {
        if (db[_id].expires < thanThis) delete db[_id];
    }
}
