import { getCategoryAppCounts } from './db.js';

// List of all categories we expect to have data for
const expectedCategories = [
    'GAME', 'FAMILY', 'COMMUNICATION', 'PRODUCTIVITY', 'SOCIAL',
    'PHOTOGRAPHY', 'ENTERTAINMENT', 'TOOLS', 'BUSINESS', 'LIFESTYLE',
    'EDUCATION', 'FINANCE', 'HEALTH_AND_FITNESS', 'SHOPPING', 'TRAVEL_AND_LOCAL',
    'BOOKS_AND_REFERENCE', 'PERSONALIZATION', 'MUSIC_AND_AUDIO', 'NEWS_AND_MAGAZINES',
    'AUTO_AND_VEHICLES', 'FOOD_AND_DRINK', 'SPORTS', 'WEATHER', 'HOUSE_AND_HOME',
    'MAPS_AND_NAVIGATION', 'VIDEO_PLAYERS', 'MEDICAL', 'ART_AND_DESIGN', 'DATING',
    'EVENTS', 'LIBRARIES_AND_DEMO', 'PARENTING', 'COMICS', 'MAPS', 'VIDEO',
    'ANDROID_WEAR', 'BEAUTY'
];

async function validateData() {
    try {
        console.log('Validating app counts per category...');
        
        const categoryCounts = await getCategoryAppCounts();
        let totalApps = 0;
        let missingCategories = [];
        let incompleteCategories = [];
        
        // Check each expected category
        for (const category of expectedCategories) {
            const count = categoryCounts[category] || 0;
            totalApps += count;
            
            if (count === 0) {
                missingCategories.push(category);
            } else if (count < 50) {
                incompleteCategories.push(`${category} (${count})`);
            }
        }
        
        // Display validation results
        console.log(`Total apps scraped: ${totalApps}`);
        console.log(`Expected: ${expectedCategories.length * 50} apps across ${expectedCategories.length} categories`);
        
        if (missingCategories.length > 0) {
            console.error('Missing categories (no apps):', missingCategories.join(', '));
        } else {
            console.log('✓ All categories have at least some apps');
        }
        
        if (incompleteCategories.length > 0) {
            console.error('Incomplete categories (less than 50 apps):', incompleteCategories.join(', '));
        } else {
            console.log('✓ All categories have 50 apps');
        }
        
        if (missingCategories.length === 0 && incompleteCategories.length === 0) {
            console.log('✓ Validation successful! All categories have exactly 50 apps.');
        }
    } catch (error) {
        console.error('Error validating data:', error);
    }
}

// Run the validation
validateData().catch(console.error);