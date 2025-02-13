import gplay from 'google-play-scraper';
import { insertAppReview, getAppIds } from './db.js';

export async function scrapeReviews() {
    try {
        const appIds = await getAppIds();
        
        if (!appIds || appIds.length === 0) {
            console.log('No apps found in the database. Please run rank scraping first.');
            return;
        }
        
        console.log(`Found ${appIds.length} apps to scrape reviews for`);

        for (const appId of appIds) {
            try {
                let continueScraping = true;
                let nextPaginationToken = undefined;

                while (continueScraping) {
                    const reviews = await gplay.reviews({
                        appId: appId,
                        sort: gplay.sort.NEWEST,
                        paginate: true,
                        nextPaginationToken: nextPaginationToken,
                        country: 'US'
                    });

                    for (const review of reviews.data) {
                        const reviewData = {
                            app_id: appId,
                            post_date: review.date,
                            language: 'en',
                            country: 'US',
                            author_name: review.userName,
                            rating: review.score,
                            review_content: review.text,
                            helpful_voting: review.thumbsUp,
                            app_version: review.version
                        };

                        await insertAppReview(reviewData);
                    }

                    nextPaginationToken = reviews.nextPaginationToken;
                    continueScraping = !!nextPaginationToken;

                    // Add delay between pagination requests
                    await new Promise(resolve => setTimeout(resolve, process.env.SCRAPE_DELAY || 1000));
                }

                console.log(`Finished scraping reviews for ${appId}`);
            } catch (error) {
                console.error(`Error scraping reviews for ${appId}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in review scraping:', error);
    }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    scrapeReviews().catch(console.error);
}



// // reviews.js
// import gplay from 'google-play-scraper';
// import { insertAppReview, getAppIds } from './db.js';

// const MAX_RETRIES = 3;
// const RETRY_DELAY = 5000; // 5 seconds

// async function wait(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// async function retryOperation(operation, appId, retries = MAX_RETRIES) {
//     for (let i = 0; i < retries; i++) {
//         try {
//             return await operation();
//         } catch (error) {
//             if (i === retries - 1) throw error; // If last retry, throw error
            
//             console.log(`Attempt ${i + 1} failed for ${appId}, retrying in ${RETRY_DELAY/1000} seconds...`);
//             await wait(RETRY_DELAY * (i + 1)); // Exponential backoff
//         }
//     }
// }

// export async function scrapeReviews() {
//     try {
//         const appIds = await getAppIds();
//         console.log(`Found ${appIds.length} apps to scrape reviews for`);

//         for (const appId of appIds) {
//             try {
//                 let continueScraping = true;
//                 let nextPaginationToken = undefined;
//                 let reviewCount = 0;

//                 while (continueScraping) {
//                     const reviews = await retryOperation(async () => {
//                         return await gplay.reviews({
//                             appId: appId,
//                             sort: gplay.sort.NEWEST,
//                             paginate: true,
//                             nextPaginationToken: nextPaginationToken,
//                             country: 'US',
//                             num: 100 // Get 100 reviews per request
//                         });
//                     }, appId);

//                     for (const review of reviews.data) {
//                         try {
//                             const reviewData = {
//                                 app_id: appId,
//                                 post_date: review.date,
//                                 language: 'en',
//                                 country: 'US',
//                                 author_name: review.userName,
//                                 rating: review.score,
//                                 review_content: review.text,
//                                 helpful_voting: review.thumbsUp,
//                                 app_version: review.version
//                             };

//                             await retryOperation(async () => {
//                                 await insertAppReview(reviewData);
//                             }, appId);

//                             reviewCount++;
//                         } catch (error) {
//                             console.error(`Failed to insert review for ${appId}:`, error);
//                             continue; // Skip this review and continue with others
//                         }
//                     }

//                     nextPaginationToken = reviews.nextPaginationToken;
//                     continueScraping = !!nextPaginationToken && reviewCount < 1000; // Limit to 1000 reviews per app

//                     // Add delay between pagination requests
//                     await wait(process.env.SCRAPE_DELAY || 1000);
//                 }

//                 console.log(`Finished scraping ${reviewCount} reviews for ${appId}`);
//             } catch (error) {
//                 console.error(`Error scraping reviews for ${appId}:`, error);
//                 continue; // Skip this app and continue with others
//             }
//         }
//     } catch (error) {
//         console.error('Error in review scraping:', error);
//     }
// }

// // Run if called directly
// if (process.argv[1] === new URL(import.meta.url).pathname) {
//     scrapeReviews().catch(console.error);
// }