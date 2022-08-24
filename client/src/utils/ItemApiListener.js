/* eslint-disable no-undef */
import React from 'react';

export const QuizListener = (authentication) => {

    let learnosityObj = '';

    if (authentication) {

        if (typeof LearnosityItems != 'undefined') {

            learnosityObj = LearnosityItems.init(authentication, {
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

            learnosityObj = LearnosityAuthor.init(authentication, callbacks)
        }

        if (typeof LearnosityReports != 'undefined') {

            learnosityObj = LearnosityReports.init(authentication, {
                readyListener() {
                    console.log('👍🏼 <<< Learnosity Reports API is ready >>> 🧘🏼');
                },
                errorListener(err) {
                    console.log('error', err);
                }
            })
        }

    }

    return (
        <>
            {learnosityObj}
        </>
    )
}
