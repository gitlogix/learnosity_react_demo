const Learnosity = require('learnosity-sdk-nodejs/index'); // Include Learnosity SDK constructor
const uuid = require('uuid'); // Load the UUID library

const assessRoute = (activityId, userId) => {

  const user_id = userId;

  const session_id = uuid.v4();

  let domain = 'localhost';
  const user_logged_in = `/reports/${activityId}/${userId}`;

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
      user_id: user_id,

      activity_template_id: activityId,
      session_id: session_id,
      activity_id: activityId,
      rendering_type: 'assess',
      type: 'submit_practice',
      name: 'A Learnosity React Demo',
      state: 'initial',

      config: {
        configuration: {
          onsubmit_redirect_url: user_logged_in,
          lazyload: true
        }
      }
    });

  return { request };
}

module.exports = assessRoute;
