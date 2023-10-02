const Learnosity = require('learnosity-sdk-nodejs/index');
const production_domain = require('../utils/domains');

const sessionReportInfo = (session_id, user_id) => {

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
          id: 'report-24',
          type: 'sessions-summary-by-question',
          user_id: user_id,
          session_ids: [
            session_id
          ],
        },
      ],
      configuration: {
        questionsApiVersion: 'v2023.2.LTS',
        itemsApiVersion: 'v2023.2.LTS',
      },
    });
  return { request };

}

module.exports = sessionReportInfo;
