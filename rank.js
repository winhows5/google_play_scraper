const gplay = require('google-play-scraper');
const { insertAppRank } = require('./db.js');

// Updated list of Google Play categories based on latest structure
const categories = [
    // Games and Family categories
    'GAME',
    'FAMILY',
    
    // Main app categories in alphabetical order
    'ART_AND_DESIGN',
    'AUTO_AND_VEHICLES',
    'BEAUTY',
    'BOOKS_AND_REFERENCE',
    'BUSINESS',
    'COMICS',
    'COMMUNICATION',
    'DATING',
    'EDUCATION',
    'ENTERTAINMENT',
    'EVENTS',
    'FINANCE',
    'FOOD_AND_DRINK',
    'HEALTH_AND_FITNESS',
    'HOUSE_AND_HOME',
    'LIBRARIES_AND_DEMO',
    'LIFESTYLE',
    'MAPS_AND_NAVIGATION',
    'MEDICAL',
    'MUSIC_AND_AUDIO',
    'NEWS_AND_MAGAZINES',
    'PARENTING',
    'PERSONALIZATION',
    'PHOTOGRAPHY',
    'PRODUCTIVITY',
    'SHOPPING',
    'SOCIAL',
    'SPORTS',
    'TOOLS',
    'TRAVEL_AND_LOCAL',
    'VIDEO_PLAYERS',
    'WEATHER'
];

async function scrapeRankings() {
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
if (require.main === module) {
    scrapeRankings().catch(console.error);
}

module.exports = {
    scrapeRankings
};