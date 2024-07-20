# vstring-express v1.0.0

### Simple verification string management for Express.

---

## Quick Start:

1. Add `vstring.intercept` to your Express routes:

```javascript
const Vstring = require('vstring-express');

const vstring = new Vstring();

const app = express();

app.get('/vstring/:vstring', vstring.intercept);
```

2. Generate a new verification string, defining an `action`, a `ttl` (in milliseconds), and store any other data you'll need to handle it:

```javascript
const {string, expires} = await vstring.newString({
    action: 'verify-email',
    ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
    email:'someone@example.com'}
});
// returns string: "65567b7d78df67ed5..." (64 digits)
```

3. Email a link to the user:

```javascript
const link = `http://${host}/vstring/${string}`;

sendEmail({
    to: 'someone@example.com',
    content: `Click: ${link}`,
});
```

4. Add a handler. Your additional data will be exposed on the request object as `req.vparams`:

```javascript
vstring.handle('verify-email', (req, res, next) => {
    const {email} = req.vparams;
    await markVerified(email);
    res.redirect('/email-verified.html');
})
```

## Notes:

-   Expired strings are deleted automatically and will not execute the handler functions. You can assume in the handler function that the string is valid and was unexpired.
-   Only one handler function is possible per `action`.
-   Handler functions are like regular express Middleware:
    -   They are executed with `(req, res, next)`
    -   You must complete the request or pass it along, or it will be left hanging. `res.send()`, `res.end()`, `next()`, etc.

---

&copy;2024 by Gregory Everett Brandon. See [LICENSE](./LICENSE).
