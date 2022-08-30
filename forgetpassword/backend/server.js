const express = require('express');
const path = require('path');
const client = require("mailchimp-marketing");
const cors = require("cors");
const app = express();

// static folder
client.setConfig({
    apiKey: "55b24e4b1e467adb061176a8d8726f79-us9",
    server: "us9",
});

var corsOptions = {
    origin: "http://localhost:3000"
};

app.use(express.json())
app.use(cors(corsOptions));

app.post('/test', async (req, res) => {
    const request = req.body.email;
    console.log(request);
    try {
        const response = await client.campaigns.sendTestEmail("e274cc3d5a", {
            test_emails: [request],
            send_type: "plaintext",
        });
        console.log(response);
        res.json(response);
    }
    catch (err) {
        console.log(err);
    }

})



app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3001;

app.listen(PORT, console.log(`server started at ${PORT}`))