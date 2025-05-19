// reviews.js
import gplay from 'google-play-scraper';
import { insertAppReview, getAppIds } from './db.js';

// Configuration
const MAX_REVIEWS_PER_APP = 50000; // Maximum reviews to collect per app
const MAX_RETRIES = 3;             // Maximum number of retries on failure
const RETRY_DELAY = 5000;          // Base delay between retries (ms)
const SCRAPE_DELAY = process.env.SCRAPE_DELAY || 1000; // Delay between requests

// Utility function to wait
async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
async function retryOperation(operation, appId, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === retries - 1) throw error; // If last retry, throw error
            
            console.log(`Attempt ${i + 1} failed for ${appId}, retrying in ${RETRY_DELAY/1000 * (i+1)} seconds...`);
            await wait(RETRY_DELAY * (i + 1)); // Exponential backoff
        }
    }
}

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
                let reviewCount = 0;
                
                console.log(`Starting to scrape reviews for ${appId}`);

                while (continueScraping) {
                    const reviews = await retryOperation(async () => {
                        return await gplay.reviews({
                            appId: appId,
                            sort: gplay.sort.RELEVANCE, // Changed from NEWEST to RELEVANCE
                            paginate: true,
                            nextPaginationToken: nextPaginationToken,
                            country: 'US',
                            num: 100 // Get 100 reviews per request
                        });
                    }, appId);

                    // Process batch of reviews
                    for (const review of reviews.data) {
                        try {
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

                            await retryOperation(async () => {
                                await insertAppReview(reviewData);
                            }, appId);

                            reviewCount++;
                        } catch (error) {
                            console.error(`Failed to insert review for ${appId}:`, error);
                            continue; // Skip this review and continue with others
                        }
                    }

                    // Update pagination and check if we should continue
                    nextPaginationToken = reviews.nextPaginationToken;
                    
                    // Stop conditions: no more pages or reached MAX_REVIEWS_PER_APP
                    continueScraping = !!nextPaginationToken && reviewCount < MAX_REVIEWS_PER_APP;
                    
                    console.log(`Scraped ${reviewCount} reviews for ${appId} so far`);
                    
                    // Add delay between pagination requests to avoid rate limiting
                    if (continueScraping) {
                        await wait(parseInt(SCRAPE_DELAY));
                    }
                }

                console.log(`Finished scraping ${reviewCount} reviews for ${appId}`);
            } catch (error) {
                console.error(`Error scraping reviews for ${appId}:`, error);
                continue; // Skip this app and continue with others
            }
            
            // Add a longer delay between apps
            console.log(`Waiting before moving to the next app...`);
            await wait(parseInt(SCRAPE_DELAY) * 3);
        }
        
        console.log('Finished scraping reviews for all apps');
    } catch (error) {
        console.error('Error in review scraping:', error);
    }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    scrapeReviews().catch(console.error);
}