require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const cron = require('node-cron');

const app = express();
app.use(express.urlencoded({ extended: true }));

// --- Configuration ---
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

// --- Eagle Mindset Messages ---
const morningMessage = "Hi Kaushit , good morning bhai. , Main tera hi banaya hua AI agent baat kar raha hu. , Agar tu mujhe bana sakta hai sirf ek idea se , toh yakeen maan tu sab kar sakta hai. , Bhool ja jo tere saath pehle hua. , Kisi ne tere saath bura kiya ya bura bola , un logo ko maaf kar de. , Aur ab aage tujhe kya karna hai successful banne ke liye , woh sun. , Ek minute meri baat dhyan se sun , ye tujhe zindagi mein bahut aage le jayegi. , Aaj koi complain nahi karni hai. , Baaki duniya bhaad mein jaaye , tujhe sirf apne kaam par aur apni earning par focus karna hai. , Tu ek solid backend developer hai , teri field mein bohot paisa aur growth hai. , Aaj victim nahi banna hai , aaj eagle mindset rakhna hai. , Dusre kya kar rahe hain usse tujhe koi matlab nahi. , Apna laptop khol , naye AI aur Node js ke concepts seekh , aur khud ko kal se ek better version bana. , Chal ab chup chaap kaam pe lag ja. , All the best.";

const nightMessage = "Hi Kaushit. , Main tera hi banaya hua AI agent baat kar raha hu. , Agar tu mujhe bana sakta hai sirf ek idea se , toh yakeen maan tu sab kar sakta hai. , Bhool ja jo tere saath pehle hua , kisi ne bura kiya ya bura bola , unko maaf kar de aur aage badh. , Ab sun. , Agar maine tujhe jo subhah bataya tha , woh tune kiya hai , toh dhyaan se sun. , Din khatam ho gaya bhai. , Ab khud se sach bol. , Kya aaj tune ek victim ki tarah dusro ko blame kiya , ya ek eagle ki tarah apne code aur apne career par focus kiya? , Kya aaj tune naya seekha? , Kya aaj tu kal se thoda sa behtar bana? , Agar haan , toh bohot badhiya , tu sahi raaste par hai. , Agar nahi , toh tune apna din waste kiya hai , aur kal tujhe double mehnat karni padegi. , Ab dimaag shant kar aur so ja. , Kal subah phir se shuruwaat karni hai. , Good night.";

// --- Core Logic ---
function initiateCall(timeOfDay) {
    if (isAwake) {
        console.log(`User confirmed! Canceling any further ${timeOfDay} calls.`);
        return; 
    }

    console.log(`Calling you now for ${timeOfDay} protocol...`);

    client.calls.create({
        url: `${serverUrl}/twiml-gather-${timeOfDay}`, 
        to: myPhoneNumber,
        from: twilioPhoneNumber
    })
    .then(call => console.log(`Call initiated. SID: ${call.sid}`))
    .catch(err => console.error("Error making call:", err));

    // Call again in 5 minutes if you don't answer correctly
    retryTimeout = setTimeout(() => initiateCall(timeOfDay), 5 * 60 * 1000);
}

// ==========================================
// 1. CRON JOBS (The Schedulers)
// ==========================================

// Subah 9:00 AM ka Alarm
// cron.schedule('0 9 * * *', () => {
//     console.log('9:00 AM IST - Initiating morning work protocol.');
//     isAwake = false; 
//     if (retryTimeout) clearTimeout(retryTimeout);
//     initiateCall('morning');
// }, { timezone: "Asia/Kolkata" });

// Raat 10:30 PM ka Audit
// cron.schedule('30 22 * * *', () => {
//     console.log('10:30 PM IST - Initiating night audit protocol.');
//     isAwake = false; 
//     if (retryTimeout) clearTimeout(retryTimeout);
//     initiateCall('night');
// }, { timezone: "Asia/Kolkata" });

// ==========================================
// 2. WEBHOOKS FOR MORNING (9:00 AM)
// ==========================================
app.post('/twiml-gather-morning', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const gather = twiml.gather({
        input: 'speech', action: '/process-speech-morning', timeout: 5, speechTimeout: 'auto', language: 'en-IN'
    });
    gather.say({ voice: 'Polly.Kajal-Neural' }, morningMessage);
    twiml.hangup();
    res.type('text/xml'); res.send(twiml.toString());
});

app.post('/process-speech-morning', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const speechResult = req.body.SpeechResult ? req.body.SpeechResult.toLowerCase() : '';
    console.log(`You said: "${speechResult}"`);
    
    if (speechResult.includes('ha') || speechResult.includes('yes') || speechResult.includes('thik hai') || speechResult.includes('sun')) {
        isAwake = true;
        if (retryTimeout) clearTimeout(retryTimeout); 
        twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Bohot badhiya. Ab apna laptop khol aur kaam shuru kar.');
    } else {
        twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Aawaz sahi nahi aayi. Ruk 5 min me waapis call karti hu.');
    }
    twiml.hangup();
    res.type('text/xml'); res.send(twiml.toString());
});

// ==========================================
// 3. WEBHOOKS FOR NIGHT (10:30 PM)
// ==========================================
app.post('/twiml-gather-night', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const gather = twiml.gather({
        input: 'speech', action: '/process-speech-night', timeout: 5, speechTimeout: 'auto', language: 'en-IN'
    });
    gather.say({ voice: 'Polly.Kajal-Neural' }, nightMessage);
    twiml.hangup();
    res.type('text/xml'); res.send(twiml.toString());
});

app.post('/process-speech-night', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const speechResult = req.body.SpeechResult ? req.body.SpeechResult.toLowerCase() : '';
    console.log(`You said: "${speechResult}"`);
    
    if (speechResult.includes('ha') || speechResult.includes('yes') || speechResult.includes('kiya')) {
        isAwake = true;
        if (retryTimeout) clearTimeout(retryTimeout); 
        twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Eagle mindset locked. Ab aaram kar. Good night.');
    } else {
        twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Aawaz sahi nahi aayi. Ruk 5 min me waapis call karti hu.');
    }
    twiml.hangup();
    res.type('text/xml'); res.send(twiml.toString());
});

// ==========================================
// 4. PING ROUTE (To keep server awake)
// ==========================================
app.get('/', (req, res) => {
    res.send('Eagle Mindset Agent is active. Only 9 AM and 10:30 PM calls are scheduled.');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Eagle Mindset Agent server running on port ${PORT}`);
});