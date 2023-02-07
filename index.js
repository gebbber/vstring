const { randomBytes, createHash } = require('crypto');

const HOUR = 3600000; // milliseconds

module.exports = class VString {
    #db;
    #handlers = {};
    #method = 'GET';

    constructor(db) {
        this.#db = db || require('./memory-store.js');
        this.#ttl = 60 * 60 * 1000;
    }

    set ttl(milliseconds) {
        this.#ttl = milliseconds || HOUR;
    }

    get ttl() {
        return this.#ttl;
    }

    set hours(hours) {
        this.#ttl = (hours || 1) * HOUR;
    }

    set days(days) {
        this.#ttl = (days || 1) * 24 * HOUR;
    }

    set weeks(weeks) {
        this.#ttl = (weeks || 1) * 7 * 24 * HOUR;
    }

    set method(method) {
        const METHOD = method.toUpperCase();
        if (!['GET', 'PUT', 'POST', 'PATCH', 'DELETE'].includes(METHOD))
            throw new Error(`Unsupported method: ${METHOD}`);
        this.#method = METHOD;
    }

    async newString(action, rest = {}) {
        if (!action) throw new Error(`action is required`);
        if (typeof action !== 'string') throw new Error(`action must be a string`);
        if (action && !this.#handlers[action]) throw new Error(`No handler added for ${action}`);

        const params = JSON.stringify(rest);
        const expires = new Date(Date.now() + this.#ttl);
        const bytes = await randomBytes(32);
        const string = bytes.toString('hex').toLowerCase();
        const _id = createHash('sha256').update(bytes).digest('hex').toLowerCase();

        await this.#db.save(_id, action, expires, params);
        return [string, expires];
    }

    async handle(action, handler) {
        if (!action) throw new Error(`action is required`);
        if (typeof action !== 'string') throw new Error(`action must be a string`);
        if (!handler) throw new Error(`handler is required`);
        if (typeof handler !== 'function') throw new Error('handler must be a function');
        if (this.#handlers[action]) throw new Error(`'${action}' already has a handler`);
        this.#handlers[action] = handler;
    }

    // app.use('/vstring', vstring.intercept())
    async intercept(req, res, next) {
        if (req.method !== this.#method) return next();

        const vString = req.pathname.split('/').pop();
        const found = await lookUp(vString);
        if (!found) return res.status(404).send({ message: 'Not found' });

        const { _id, action, params } = found;
        const handler = handlers[action];
        let result = handler(req, res, JSON.parse(params || '{}'));
        if (result.then) result = await result;
        const keepString = Boolean(result);
        if (!keepString) deleteString(_id);
        return;

        async function lookUp(vString) {
            const _id = createHash('sha256')
                .update(Buffer.from(vString, 'hex'))
                .digest('hex')
                .toLowerCase();
            const found = await this.#db.findById(_id);
            if (!found) return null;
            const { expires, action, params } = found;
            if (expires < new Date()) {
                await deleteString(_id);
                return null;
            }
            return { _id, action, params };
        }

        function deleteString(_id) {
            return this.#db.findByIdAndDelete(_id);
        }
    }
};
