const Learnosity = require('learnosity-sdk-nodejs/index');
const production_domain = require('../utils/domains');

const SingleReportsQuestions = (session_id, user_id) => {
  let domain = 'localhost';

  if (process.env.NODE_ENV === 'production') {
    domain = production_domain.name;
  }

  const learnositySdk = new Learnosity();

  const request = learnositySdk.init(

    'reports',  // selects Reports API
    {
      consumer_key: process.env.CONSUMER_KEY,
      domain: domain,
    },
    process.env.CONSUMER_SECRET,
    {
      reports: [
        {
          id: 'report-demo2',
          type: 'session-detail-by-item',
          user_id: user_id,
          session_id: session_id,
          questions_api_init_options: {
            showCorrectAnswers: false,
          },
        },
      ],
      configuration: {
        questionsApiVersion: 'v2023.2.LTS',
        itemsApiVersion: 'v2023.2.LTS',
      },
    });
  return { request };

}

module.exports = SingleReportsQuestions;
