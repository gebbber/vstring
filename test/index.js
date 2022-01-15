const express = require('express');
const app = express();

const vstring = require('../src/index.js'); 

const PORT = process.env.PORT || 3000;

// Install middleware
vstring.intercept('/vstring', app);




// Add routes...
app.get('/request-email-verification', async (req, res) => {
    
    const userId = req.session?.userId;
    const {email} = awaitFindUser(userId);
    
    const action = 'verify-email';
    const vparams = {email};
    const {string, expires} = await vstring.new({action, vparams, seconds: 90});

    sendEmail(email, string, expires); 

    res.send('Please check your email and click the link to verify your address...');
    
});

app.get('/done.html', (req, res) => {
    res.send('Done!')
});


// Add a handler for vstring action:
vstring.handle('verify-email', (req, res)=>{
    
    console.log(`\nIn handler for 'verify-email':`)
    console.log(" - req.vparams:",req.vparams); 
    console.log(" - req.url:    ",`'${req.url}'`);
    
    markEmailAddressVerified(req.vparams);
    
    res.redirect(req.url);

    setTimeout(process.exit, 250); // let the response go through first.

});

app.use((req, res)=>{res.sendStatus(404);});

app.listen(PORT, ()=>{
    console.log(`\nListening on port ${PORT}...`);
    console.log(instructions);
});


// Below helper functions for demo purposes:
const awaitFindUser = () => {return {email:"someone@example.com"};};
const markEmailAddressVerified = () => {console.log('\nEmail verified!');};
const sendEmail = (email, str, exp) => { 
    console.log('Email sent to console.log:', {
        to: email,
        date: (new Date()).toString(),
        subject: 'Password Reset',
        body: `Click the following link to verify your email address:\n\nhttp://localhost:${PORT}/vstring/${str}/done.html. This link will be valid until ${exp}.`
    });
}

const instructions = `
1. Navigate to http://localhost:3000/request-email-verification
2. The console (here) will show an object representing the email sent
3. Navigate to the link found in the email
`;