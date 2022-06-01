# vstring-express v0.0.1

### Simple verification string management for Express.

---
## Quick Start:
1. Require `'vstring-express'` and initialize it near the beginning of your Express stack:
```javascript
const vstring = require('vstring-express');

const app = express();

vstring.intercept('/vstring', app);
```
2. Generate a new verification string, defining an `action`, and any parameters you like (as `vparams`):
```javascript
const {string} = await vstring.new({
    action: 'verify-email',
    vparams: {email:'someone@example.com'}
});
// returns string: "65567b7d78df67ed5..." (64 digits)
```
3. Email a link to the user:
```javascript
const link = `http://${host}/vstring/${string}/done.html`;

// Pseudocode:
sendEmail({
    to: 'someone@example.com',
    content: `Click: ${link}`
});
```
4. Add a handler. Your `vparams` will be exposed on the request object:
```javascript
vstring.handle('verify-email', (req, res, next)=>{

    const {email} = req.vparams;
    
    markVerified(email); // pseudocode
    
    res.redirect(req.url); // to '/done.html'

})
```
...and that's it!

Obviously, you can use verification strings for several purposes, specifying a different `action` for each, and provide a respective handler function for each action.
- The strings can have whatever parameters you'll need in your handler
- The strings are all mounted at the same place, keeping your routing clean.

There are some bells and whistles you might want to be aware of...

---
## API - Setting Configuration Options
## `vstring.use(options)`
`vstring.use` sets any configuration option, or multiple at once. The following are available options, and each also has helper functions to set them more conveniently; examples shown below.

---
### `options.bytes = 32`
Number of bytes to use for the string. Default is `32`, producing a 64-digit hexadecimal string. Recommended not to change.

Examples:
```javascript
vstring.use({bytes: 32});

vstring.bytes(32);
```

---
### `options.ttl = 3600000`
Default expiry for new strings. Default is `3600000` milliseconds (1 hour). Many convenient ways to set it; all of the following give 90 minutes:

```javascript
vstring.use({ttl: 90*60*1000}); // in millseconds only

vstring.ttl({hours: 1, minutes: 30});

vstring.millisecs(5400000); 
vstring.seconds(5400);
vstring.minutes(90);
vstring.hours(1.5);
vstring.days(0.0625);
vstring.weeks(0.0089); // (approximate)
```

Note that this setting just sets the *default* TTL for *new* strings. It does not affect existing strings that have already been generated and stored in a database, and it is overriden by any TTL arguments that are passed directly to `vstring.new` when creating a new verification string:

```javascript
vstring.minutes(90); // set default to 90 minutes
const {string} = vstring.new({action, weeks: 1}); // override the default when generating the string
```

---
### `options.method = "GET"`

**TL;dr: you probably don't need this.**

Sets the HTTP method to catch the verification string at. Multiple HTTP methods can be provided as a string, with the methods separated by a space. HTTP method verbs are case sensitive and are all uppercase.

 The default is GET; **if you change it, the user will not be able to complete the process by just clicking a link.** Only change this setting if you know why you're doing it.


---
## Generating Verification Strings
## `const {string, expires} = vstring.new({action, vparams, ...})`
In your routes, when a verification string is needed to confirm an action, use `vstring.new` to generate the string, and then email it (or whatever) to the user.

- `action`: You must provide an `action` argument to use to catch the verification string with your handler. It can be any non-empty string. Spaces, etc., *are* allowed.
- `vparams`: You may provide an optional `vparams` argument. `vparams` can be an Object, a string, or anything that can be passed to `JSON.stringify`. `vparams` will be stored in the database and then made available to your handler function as `req.vparams`.
- `...` can be `weeks`, `days`, `hours`, `minutes`, `seconds`, and `millisecs`: These optional arguments are added together to determine a TTL, overriding any default for just this generated string. Values are added together, so passing `{action, params, weeks: 1, days: 1}` provides a TTL of 8 days (1 week + 1 day).

Returns an object containing `.string` and `.expires`:
- `string`: The hexadecimal verification string; you still need to assemble the string into a link and send it to the user; you are not meant to save it yourself, as it has been hashed and saved to the installed store (memory store by default, for test/dev purposes)
- `expires`: The expiry date that was saved to the database, as a JavaScript Date object
```javascript
const email = 'someone@somewhere.net';

const {string, expires} = vstring.new({
    action: 'verify email',
    vparams: {email},
    days: 3
});

const link = `http://${req.hostname}/vstring/${string}/remaining-url`;
```
The end of the URL `/remaining-url` will be passed to the handler function as `req.url` and can be used for redirect, etc.
- Note: The handler does *not* automatically redirect; it's up to you to decide what to do with the request.
- **Warning**: Since the link is given to the user, any value in `/remaining-url` may have been tampered with and should not be trusted other than for simple redirection.

---
# API - Handler Functions
A handler needs to be registered to handle each `action`. Generating a string with an `action` that does not have an installed handler will throw an error.

```javascript
function expressMiddleware(req, res, next) {
    // Actions go here...
}

vstring.handle(action, expressMiddleware);
```
This can typically be shortened to: 
```javascript
vstring.handle('verify email', (req, res, next)=>{
    // Actions go here...
    res.send('Done');
});
```
## Notes: 
- Expired strings are deleted automatically and will not execute this handler. You can assume in the handler function that the string is valid and was unexpired.
- Only one handler function is possible per `action`.
- Handler functions are regular express Middleware:
  - They are executed with `(req, res, next)`
  - You must complete the request or pass it along, or it will be left hanging. `res.send()`, `res.end()`, `next()`, etc.
  - Any `vparams` provided is made available on the request object as `req.vparams`.
  - Any path remaining on the URL after the verification string is provided as `req.url`. (See use of `'/done.html'` in the Quick Start example above.) Redirecting is not done automatically; you must explicitly redirect if you want to.

---
&copy;2021 by Gregory Everett Brandon. See [LICENSE](./LICENSE).
