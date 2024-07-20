const db = {};

async function save(_id, action, expires, payload) {
    db[_id] = { action, payload, expires };
}

async function findById(_id) {
    const data = db[_id];
    if (!data) return null;
    return { ...data, _id };
}

async function findByIdAndDelete(_id) {
    if (db[_id]) delete db[_id];
}

async function flushExpired() {
    const now = new Date();
    for (const id in db) if (db[id].expires < now) delete db[id];
}

function init() {
    setInterval(flushExpired, 1000 * 60 * 60);
}

module.exports = { init, flushExpired, save, findById, findByIdAndDelete };
