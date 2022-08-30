
export const ItemApiListner = (authentication) => {

    if (authentication) {

        if (typeof LearnosityItems != 'undefined') {

            window.LearnosityItems.init(authentication, {
                readyListener() {
                    console.log('👍🏼 <<< Learnosity Assess API is ready >>> 🧘🏼');
                },
                errorListener(err) {
                    console.log('error', err);
                }
            })
        }

        if (typeof LearnosityAuthor != 'undefined') {
            var callbacks = {
                "readyListener": function () {
                    console.log("Learnosity Author API is ready");
                },
                "errorListener": function (e) {
                    //callback to occur on error
                    console.log("Error code ", e.code);
                    console.log("Error message ", e.message);
                    console.log("Error name ", e.name);
                    console.log("Error name ", e.title);
                }
            };

            window.LearnosityAuthor.init(authentication, callbacks)
        }

        if (typeof LearnosityReports != 'undefined') {

            window.LearnosityReports.init(authentication, {
                readyListener() {
                    console.log('👍🏼 <<< Learnosity Reports API is ready >>> 🧘🏼');
                },
                errorListener(err) {
                    console.log('error', err);
                }
            })
        }

    }
}
