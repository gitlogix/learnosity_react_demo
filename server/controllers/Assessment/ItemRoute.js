const Learnosity = require('learnosity-sdk-nodejs/index');
const uuid = require('uuid');

const itemRoute = (activityId, userId, itemId) => {
    const session_id = uuid.v4();

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
        {
            activity_id: activityId,
            name: 'Items API demo - inline activity',
            rendering_type: 'inline',
            type: 'submit_practice',
            session_id: session_id,
            user_id: userId,
            state: 'initial',
            items: [
                {
                    id: itemId,
                    reference: itemId
                }
            ],
            config: {
                questions_api_init_options: {
                    fontsize: "small",
                    annotations: true,
                    renderSubmitButton: true,
                    renderSaveButton: true,
                    showCorrectAnswers: 'true'
                }
            }
        }
    );

    return { request };
}

module.exports = itemRoute;
