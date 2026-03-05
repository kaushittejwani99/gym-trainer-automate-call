require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const cron = require('node-cron');

const app = express();
app.use(express.urlencoded({ extended: true }));

// --- Configuration ---
// Use process.env.PORT for cloud hosting (like Render), fallback to 3000 for local testing
const PORT = process.env.PORT || 3000;
const accountSid = process.env.TWILIO_ACCOUNT_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN;   
const client = twilio(accountSid, authToken);

const myPhoneNumber = process.env.MY_PHONE_NUMBER; 
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; 
const serverUrl = process.env.SERVER_URL; 

// --- State Management ---
let isAwake = false;
let retryTimeout = null;

// The Drill Sergeant Message
const wakeUpMessage = "uth ja bhai    ,uth ja gym nhi jana kya        ,gym ja ,weight lose kar     ,confidence bda      , jaldi uth      ,mai paanch minute  baad     ,waapis call karti  hu    ,   utha ki nahi    ,ye puchne ke liye   ,ok , by,,";

// --- Core Logic ---

// Function to make the phone call
function initiateCall() {
    if (isAwake) {
        console.log("User is awake! Canceling any further calls today.");
        return; 
    }

    console.log("Calling you now...");

    client.calls.create({
        url: `${serverUrl}/twiml-gather`, // Tells Twilio what to do when you pick up
        to: myPhoneNumber,
        from: twilioPhoneNumber
    })
    .then(call => console.log(`Call initiated. SID: ${call.sid}`))
    .catch(err => console.error("Error making call:", err));

    // Automatically schedule the next call in 5 minutes (300,000 milliseconds)
    retryTimeout = setTimeout(initiateCall, 5 * 60 * 1000);
}

// 1. Cron Job: Runs exactly at 7:00 AM everyday in IST
cron.schedule('0 7 * * *', () => {
    console.log('7:00 AM IST - Initiating daily wake-up protocol.');
    isAwake = false; // Reset the state for the new day
    if (retryTimeout) clearTimeout(retryTimeout);
    
    initiateCall();
}, {
    timezone: "Asia/Kolkata" // Specifically targets Indian Standard Time
});

// --- Webhooks for Twilio ---

// 2. When the call connects, Twilio asks your server what to say
app.post('/twiml-gather', (req, res) => {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // <Gather> tells Twilio to listen to the user's speech for up to 5 seconds
    const gather = twiml.gather({
        input: 'speech',
        action: '/process-speech', // Where to send the transcribed text
        timeout: 5,
        speechTimeout: 'auto',
        language: 'en-IN' // Helps Twilio understand Indian accents and Hinglish better
    });
    
    // Play the message using a clear Indian Neural Voice
    gather.say({
        voice: 'Polly.Kajal-Neural'
    }, wakeUpMessage);

    // If you stay completely silent, the call drops down to this hangup command
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
});

// 3. Twilio sends the transcribed text to this endpoint
app.post('/process-speech', (req, res) => {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // Safely get what the user said, make it lowercase
    const speechResult = req.body.SpeechResult ? req.body.SpeechResult.toLowerCase() : '';
    console.log(`You said: "${speechResult}"`);

    // Check if the user said the phrase (Made more forgiving for Hinglish spelling variations)
    if (speechResult.includes('ha') || speechResult.includes('yes') || speechResult.includes('uth')) {
        isAwake = true;
        if (retryTimeout) clearTimeout(retryTimeout); // Stop the 5-minute loop
        
        twiml.say({ voice: 'Polly.Kajal-Neural' }, 'ab ,ja  ,gym  ,or  ,mehnat  ,ker.');
    } else {
        twiml.say({ voice: 'Polly.Kajal-Neural' }, 'ruk paanch , minute me , waapis call  , karta hu  ,aawaz  ,sahi sa  ,nahi aa  ,rahi hai   ,teri');
    }

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
});

// --- Ping Route for Cloud Hosting ---
// This keeps the server awake if you use cron-job.org
app.get('/', (req, res) => {
    res.send('Gym Alarm Agent is awake and running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Gym Alarm Agent server running on port ${PORT}`);
});