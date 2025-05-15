// meta.js
import gplay from 'google-play-scraper';
import { insertAppMeta, getAppIds } from './db.js';

function convertTimestampToDate(timestamp) {
    try {
        // If timestamp is undefined or null, return today's date
        if (!timestamp) {
            return new Date().toISOString().split('T')[0];
        }

        // Convert string to number if needed
        if (typeof timestamp === 'string') {
            timestamp = parseInt(timestamp, 10);
        }

        // Handle milliseconds timestamps
        if (timestamp.toString().length === 13) {
            timestamp = Math.floor(timestamp / 1000);
        }

        // Check if the timestamp is within reasonable range (between 2008 and current year)
        const date = new Date(timestamp * 1000);
        const year = date.getFullYear();
        if (year < 2008 || year > new Date().getFullYear()) {
            return new Date().toISOString().split('T')[0];
        }

        return date.toISOString().split('T')[0];
    } catch (error) {
        console.warn(`Invalid timestamp: ${timestamp}, using current date`);
        return new Date().toISOString().split('T')[0];
    }
}

export async function scrapeAppMetadata() {
    try {
        const appIds = await getAppIds();
        console.log(`Found ${appIds.length} apps to scrape metadata for`);

        let processedCount = 0;
        for (const appId of appIds) {
            try {
                const app = await gplay.app({
                    appId: appId,
                    country: 'US'
                });

                // Get similar apps with error handling
                let similarApps = [];
                try {
                    const similarAppsResult = await gplay.similar({
                        appId: appId,
                        country: 'US'
                    });
                    
                    // Make sure the result is an array before using map
                    if (similarAppsResult && Array.isArray(similarAppsResult)) {
                        similarApps = similarAppsResult.map(similar => similar.appId);
                    } else {
                        console.warn(`No valid similar apps data for ${appId}, using empty array`);
                    }
                } catch (similarError) {
                    console.warn(`Error fetching similar apps for ${appId}: ${similarError.message}`);
                    // Continue with an empty similar apps array
                }

                const metaData = {
                    app_id: app.appId,
                    app_name: app.title,
                    company_name: app.developer,
                    app_description: app.description,
                    release_date: app.released,
                    is_free: app.free,
                    price: app.price || 0,
                    currency: app.currency || 'USD',
                    category: app.genreId,
                    download_numbers: app.maxInstalls,
                    total_ratings: app.ratings,
                    ratings_distribution: app.histogram,
                    number_of_reviews: app.reviews,
                    app_information_update_date: convertTimestampToDate(app.updated),
                    similar_apps: similarApps, // Now using our safely prepared array
                    scrape_date: new Date().toISOString().split('T')[0]
                };

                await insertAppMeta(metaData);
                processedCount++;
                console.log(`Inserted metadata for ${app.title} (${processedCount}/${appIds.length})`);

                // Add delay between apps
                await new Promise(resolve => setTimeout(resolve, process.env.SCRAPE_DELAY || 1000));
            } catch (error) {
                console.error(`Error scraping metadata for ${appId}:`, error);
                // Continue with next app instead of stopping
                continue;
            }
        }
        
        console.log(`Completed metadata scraping for ${processedCount} apps`);
    } catch (error) {
        console.error('Error in metadata scraping:', error);
    }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    scrapeAppMetadata().catch(console.error);
}