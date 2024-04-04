const Learnosity = require('learnosity-sdk-nodejs/index');
const uuid = require('uuid');

const feedbackRoute = (body) => {
    let domain = 'localhost';

    // Instantiate the SDK
    const learnositySdk = new Learnosity();
    const request = learnositySdk.init(

        'items',
        {
            consumer_key: process.env.CONSUMER_KEY,
            domain: domain
        },
        process.env.CONSUMER_SECRET,
        body
    );

    return { request };
}

module.exports = feedbackRoute;
