const Learnosity = require('learnosity-sdk-nodejs/index');
const uuid = require('uuid');

const gradingRoute = (sessionId, activityId, studentId, items, state, graderId) => {

  const user_id = graderId || uuid.v4();
  const session_id = sessionId;
  const student_id = studentId;
  const activity_id= activityId
  const grading_state = state || 'initial';
  console.log('Incoming activity_id:', activity_id);
  
  let domain = 'localhost';
  
  const itemsArray = items ? items.split(',').map(item => item.trim()) : [];

  const learnositySdk = new Learnosity();
  const request = learnositySdk.init(
  'items',
  {
    consumer_key: process.env.CONSUMER_KEY,
    domain: domain
  },
  process.env.CONSUMER_SECRET,
  {
    // organisation_id: "1",
    user_id: user_id,
    rendering_type: 'inline',
    name: 'Teacher Assessment demo',
    state: grading_state,
    session_id: session_id,
    // items: itemsArray,
    // activity_id:activity_id,
    // config: {
    //   configuration: {
    //     lazyload: true
    //   }
    // }
  }
  );
  
  const appConfig = {
    items: itemsArray,
    sessionId: session_id,
    studentId: student_id,
    graderId: user_id,
    activity: request,
    activity_id:activity_id
  };

  return { 
    request,
    appConfig: JSON.stringify(appConfig),
    grader_id: user_id,
    student_id: student_id,
    session_id: session_id,
    activity_id:activity_id,
    items: itemsArray
  };
}

module.exports = gradingRoute;