const Learnosity = require('learnosity-sdk-nodejs/index');
const production_domain = require('../utils/domains');

const reportsRoute = (user) => {

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
          id: 'learnosity_report',
          type: 'lastscore-by-activity-by-user',
          scoring_type: 'partial',
          ui: 'numeric',
          display_time_spent: true,
          users: [{ id: user, name: 'Learnosity_1' }],
          activities: [
            {
              id: '3e5e4944-f6c8-4b10-ae58-8e1b6cc91962',
              name: 'react_sdk_primer_activity',
            },
          ],
        },
      ],
      label_bundle: {
        activity: 'Activity',
      },
      configuration: {
        questionsApiVersion: 'v2022.1.LTS',
        itemsApiVersion: 'v2022.1.LTS',
      },
    });
  return { request };

}

module.exports = reportsRoute;
