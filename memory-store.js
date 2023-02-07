const db = {};

async function save(_id, action, expires, params) {
    db[_id] = { action, params, expires };
}

async function findById(_id) {
    const data = db[_id];
    if (!data) return null;
    return { ...db, _id };
}

async function findByIdAndDelete(_id) {
    if (db[_id]) delete db[_id];
}

async function flushExpired() {
    const now = new Date();
    for (const id in db) if (db[id].expires < now) delete db[id];
}

module.exports = { flushExpired, save, findById, findByIdAndDelete };
