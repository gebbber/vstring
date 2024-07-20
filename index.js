const { randomBytes, createHash } = require('crypto');

module.exports = class VString {
    #store;
    #handlers = {};

    constructor({ store }) {
        this.#store = store || require('./memory-store.js');
        if (this.#store.init) this.#store.init();
    }

    async newString({ action, ttl, ...rest }) {
        if (!action) throw new Error(`action is required`);
        if (!ttl) throw new Error(`ttl is required`);
        if (typeof action !== 'string') throw new Error(`action must be a string`);
        if (action && !this.#handlers[action])
            throw new Error(`No handler available for ${action}`);

        const payload = JSON.stringify(rest);
        const expires = new Date(Date.now() + ttl);
        const bytes = await randomBytes(32);
        const string = bytes.toString('hex').toLowerCase();
        const _id = createHash('sha256').update(bytes).digest('hex').toLowerCase();

        await this.#store.save(_id, action, expires, payload);
        return { string, expires };
    }

    async handle(action, handler) {
        if (!action) throw new Error(`action is required`);
        if (typeof action !== 'string') throw new Error(`action must be a string`);
        if (this.#handlers[action]) throw new Error(`'${action}' already has a handler`);

        if (!handler) throw new Error(`handler is required`);
        if (typeof handler !== 'function') throw new Error('handler must be a function');

        this.#handlers[action] = handler;
    }

    // app.post('/vstring/:vstring', vstring.intercept)
    async intercept(req, res, next) {
        const vString = req.params.vstring;

        const found = await this.lookUp(vString);
        if (!found) return res.status(404).send({ message: 'Verification string not found' });

        const { _id, action, payload } = found;
        const handler = this.#handlers[action];

        req.vstring = JSON.parse(payload);
        let result = handler(req, res, next);
        if (result.then) result = await result;

        const keepString = Boolean(result);
        if (!keepString) await deleteString(_id);

        return;
    }

    deleteString(_id) {
        return this.#store.findByIdAndDelete(_id);
    }

    async lookUp(vString) {
        const _id = createHash('sha256')
            .update(Buffer.from(vString, 'hex'))
            .digest('hex')
            .toLowerCase();
        const found = await this.#store.findById(_id);
        if (!found) return null;
        const { expires, action, payload } = found;
        if (expires < new Date()) {
            await deleteString(_id);
            return null;
        }

        return { _id, action, payload };
    }
};
