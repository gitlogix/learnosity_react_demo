const client = require("@mailchimp/mailchimp_marketing");



const welcome = async () => {
    console.log('hello')
    const response = await client.automations.getWorkflowEmail(
        "workflow_id",
        "Rozella17@yahoo.com"
    );
    console.log(response);
};

module.exports = welcome;