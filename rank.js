import gplay from 'google-play-scraper';
import { insertAppRank } from './db.js';

// Complete list of Google Play categories matching the CSV and Google Play API requirements
const categories = [
    // Original categories
    'GAME', 'FAMILY', 'COMMUNICATION', 'PRODUCTIVITY', 'SOCIAL',
    'PHOTOGRAPHY', 'ENTERTAINMENT', 'TOOLS', 'BUSINESS', 'LIFESTYLE',
    'EDUCATION', 'FINANCE', 'HEALTH_AND_FITNESS', 'SHOPPING', 'TRAVEL_AND_LOCAL',
    
    // Additional categories from the CSV that match Google Play API format
    'BOOKS_AND_REFERENCE', 'PERSONALIZATION', 'MUSIC_AND_AUDIO', 'NEWS_AND_MAGAZINES',
    'AUTO_AND_VEHICLES', 'FOOD_AND_DRINK', 'SPORTS', 'WEATHER', 'HOUSE_AND_HOME',
    'MAPS_AND_NAVIGATION', 'VIDEO_PLAYERS', 'MEDICAL', 'ART_AND_DESIGN', 'DATING',
    'EVENTS', 'LIBRARIES_AND_DEMO', 'PARENTING', 'COMICS', 'MAPS', 'VIDEO',
    'ANDROID_WEAR', 'BEAUTY'
];

export async function scrapeRankings() {
    for (const category of categories) {
        try {
            console.log(`Scraping category: ${category}`);
            
            // Try to get more apps than needed in case some fail
            const apps = await gplay.list({
                category: category,
                collection: gplay.collection.TOP_FREE,
                num: 100, // Get more than 50 to ensure we have enough
                country: 'US',
                fullDetail: true
            });

            const scrapeDate = new Date().toISOString().split('T')[0];
            let successCount = 0;

            // Process apps one by one until we get exactly 50 for this category
            for (let i = 0; i < apps.length && successCount < 50; i++) {
                try {
                    const app = apps[i];
                    const rankData = {
                        app_id: app.appId,
                        app_name: app.title,
                        category: category,
                        app_url: app.url,
                        rank: i + 1,
                        scrape_date: scrapeDate
                    };

                    await insertAppRank(rankData);
                    console.log(`Inserted rank data for ${app.title}`);
                    successCount++;
                } catch (insertError) {
                    console.error(`Error inserting rank data for app in ${category}:`, insertError);
                    // Continue to next app
                }
            }

            console.log(`Successfully inserted ${successCount} apps for ${category}`);
            if (successCount < 50) {
                console.warn(`Warning: Only inserted ${successCount} out of 50 required apps for ${category}`);
            }

            // Add delay between categories to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, process.env.SCRAPE_DELAY || 2000));
        } catch (error) {
            console.error(`Error scraping category ${category}:`, error);
        }
    }

    // Log completion
    console.log('Finished scraping all categories');
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    scrapeRankings().catch(console.error);
}