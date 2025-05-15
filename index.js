// index.js
import dotenv from 'dotenv';
import { scrapeRankings } from './rank.js';
import { scrapeAppMetadata } from './meta.js';
import { scrapeReviews } from './reviews.js';
import { getCategoryAppCounts, getAppIds } from './db.js';

dotenv.config();

async function validateBeforeContinuing() {
    console.log('Validating app counts before proceeding...');
    
    try {
        // First get the actual total number of apps
        const allAppIds = await getAppIds();
        const totalUniqueApps = allAppIds.length;
        
        // Then get category counts
        const categoryCounts = await getCategoryAppCounts();
        let allValid = true;
        
        // Check counts for each category
        const categories = Object.keys(categoryCounts);
        console.log(`Total categories found: ${categories.length}`);
        for (const category of categories) {
            const count = categoryCounts[category];
            if (count < 50) {
                console.warn(`Warning: Category ${category} only has ${count} apps (needs 50)`);
                allValid = false;
            }
        }
        
        // Log validation results
        console.log(`Total unique apps in database: ${totalUniqueApps}`);
        
        // Expected number of categories is 32 (matching rank.js)
        const expectedCategories = 32;
        if (categories.length < expectedCategories) {
            console.warn(`Warning: Only ${categories.length} categories found (expected ${expectedCategories})`);
            allValid = false;
        }
        
        return allValid;
    } catch (error) {
        console.error('Error validating app counts:', error);
        // If validation fails, we can still continue
        return true;
    }
}

async function main() {
    try {
        console.log('Starting scraping process...');
        
        console.log('Scraping rankings...');
        await scrapeRankings();
        
        // Try to validate data before proceeding
        try {
            const isValid = await validateBeforeContinuing();
            if (!isValid) {
                console.warn('Warning: App data validation failed. You may want to re-run ranking scraper or fix issues before continuing.');
                const forceConfirm = process.env.FORCE_CONTINUE === 'true';
                if (!forceConfirm) {
                    console.log('Set FORCE_CONTINUE=true in your .env file to proceed anyway.');
                    console.log('Continuing anyway for now...');
                }
            }
        } catch (validationError) {
            console.error('Validation error:', validationError);
            console.log('Continuing with scraping despite validation error...');
        }
        
        console.log('Scraping app metadata...');
        await scrapeAppMetadata();
        
        console.log('Scraping reviews...');
        await scrapeReviews();
        
        console.log('Scraping process completed successfully!');
    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

main();