const Learnosity = require('learnosity-sdk-nodejs/index'); // Include Learnosity SDK constructor
const uuid = require('uuid'); // Load the UUID library
const production_domain = require('../utils/domains');

const authorRoute = () => {

    // - - - - - - Learnosity's server-side configuration - - - - - - //

    let domain = 'localhost';

    // switch for Domain if prod is hosted on a different domain.
    if (process.env.NODE_ENV === 'production') {
        domain = production_domain.name;
    };

    //console.log(production_domain.prodDomain());

    // variable created to route from assessment api to reports api 
    // - triggered when user closes test.


    // Instantiate the SDK
    const learnositySdk = new Learnosity();

    // Primer configuration parameters:
    const request = learnositySdk.init(

        'author', // selects Author API

        /*  Your Consumer Key and Consumer Secret are the public & private security keys required to 
            access Learnosity APIs and data.
            These keys grant access to Learnosity's public demos account. Learnosity will provide 
            keys for your own account. 
        */
        {
            consumer_key: process.env.CONSUMER_KEY,
            domain: domain
        },
        process.env.CONSUMER_SECRET,
        {

            mode: 'item_list',
            config: {
                item_edit: {
                    item: {
                        reference: {
                            show: true,
                            edit: true
                        },
                        dynamic_content: true,
                        shared_passage: true,
                        enable_audio_recording: true
                    }
                }
            },
            user: {
                id: 'demos-site',
                firstname: 'Demos',
                lastname: 'User',
                email: 'demos@learnosity.com'
            }
        }
    );

    return { request };
}

module.exports = authorRoute;
