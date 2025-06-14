// db.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    {
        auth: {
            persistSession: false, // Disable for server-side usage
        }
    }
);

async function insertAppRank(data) {
    const { error } = await supabase
        .from('app_ranks')
        .insert(data);
    
    if (error) throw error;
}

async function insertAppMeta(data) {
    const { error } = await supabase
        .from('app_meta')
        .insert(data);
    
    if (error) throw error;
}

async function insertAppReview(data) {
    const { error } = await supabase
        .from('app_reviews')
        .insert(data);
    
    if (error) throw error;
}

async function insertAppReviewBatch(reviews) {
    const chunkSize = 100;
    const maxRetries = 3;
    
    console.log(`Starting batch insert of ${reviews.length} reviews`);
    
    for (let i = 0; i < reviews.length; i += chunkSize) {
        const chunk = reviews.slice(i, i + chunkSize);
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                const { error } = await supabase
                    .from('app_reviews')
                    .insert(chunk);
                
                if (error) {
                    if (error.code === '23505') {
                        // Duplicate key - skip
                        console.log(`Skipping ${chunk.length} duplicate reviews`);
                        break;
                    }
                    throw error;
                }
                break;
                
            } catch (err) {
                retries++;
                if (retries >= maxRetries) {
                    console.error(`Failed to insert chunk after ${maxRetries} retries:`, err.message);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
        }
    }
    
    console.log(`Batch insert completed`);
}

async function fetchAllRecords(table, columns) {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        allData = [...allData, ...data];
        page++;
        hasMore = data.length === pageSize;
    }
    
    console.log(`Retrieved ${allData.length} total records from ${table}`);
    return allData;
}

async function getAppIds() {
    try {
        const data = await fetchAllRecords('app_ranks', 'app_id');
        const uniqueAppIds = [...new Set(data.map(item => item.app_id))];
        console.log(`Found ${uniqueAppIds.length} unique app IDs`);
        return uniqueAppIds;
    } catch (error) {
        console.error('Error in getAppIds:', error);
        throw error;
    }
}

async function getCategoryAppCounts() {
    try {
        const data = await fetchAllRecords('app_ranks', 'app_id, category');
        
        const categoryApps = {};
        data.forEach(item => {
            if (!categoryApps[item.category]) {
                categoryApps[item.category] = new Set();
            }
            categoryApps[item.category].add(item.app_id);
        });
        
        const result = {};
        for (const category in categoryApps) {
            result[category] = categoryApps[category].size;
        }
        
        return result;
    } catch (error) {
        console.error('Error getting category counts:', error);
        throw error;
    }
}

async function getAppsNeedingReviews() {
    try {
        // Get all app IDs from rankings
        const allAppIds = await getAppIds();
        
        // Get all reviews and count them per app
        const allReviews = await fetchAllRecords('app_reviews', 'app_id');
        const reviewCounts = {};
        
        allReviews.forEach(review => {
            reviewCounts[review.app_id] = (reviewCounts[review.app_id] || 0) + 1;
        });
        
        // Categorize apps by their review status
        const appsCompleted = [];      // Apps with 5000+ reviews
        const appsNeedingReviews = []; // Apps with < 5000 reviews
        const appsWithNoReviews = [];  // Apps with 0 reviews
        
        allAppIds.forEach(appId => {
            const reviewCount = reviewCounts[appId] || 0;
            const appData = {
                app_id: appId,
                current_reviews: reviewCount,
                reviews_needed: Math.max(0, 5000 - reviewCount)
            };
            
            if (reviewCount >= 5000) {
                appsCompleted.push({ ...appData, priority: 'completed' });
            } else if (reviewCount === 0) {
                appsWithNoReviews.push({ ...appData, priority: 'high' });
            } else if (reviewCount < 100) {
                appsNeedingReviews.push({ ...appData, priority: 'high' });
            } else if (reviewCount < 1000) {
                appsNeedingReviews.push({ ...appData, priority: 'medium' });
            } else {
                appsNeedingReviews.push({ ...appData, priority: 'low' });
            }
        });
        
        // Combine apps that need work
        const needsReviews = [...appsWithNoReviews, ...appsNeedingReviews];
        
        // Calculate statistics
        const stats = {
            total: allAppIds.length,
            completed: appsCompleted.length,
            needsWork: needsReviews.length,
            completionPercentage: ((appsCompleted.length / allAppIds.length) * 100).toFixed(2)
        };
        
        return {
            stats,
            completed: appsCompleted,
            needsReviews: needsReviews.sort((a, b) => a.current_reviews - b.current_reviews), // Sort by least reviews first
            summary: {
                high_priority: needsReviews.filter(app => app.priority === 'high').length,
                medium_priority: needsReviews.filter(app => app.priority === 'medium').length,
                low_priority: needsReviews.filter(app => app.priority === 'low').length
            }
        };
        
    } catch (error) {
        console.error('Error getting apps needing reviews:', error);
        throw error;
    }
}

async function getScrapedAppIds() {
    try {
        // Get apps that have any reviews (simplified version for backward compatibility)
        const reviewData = await fetchAllRecords('app_reviews', 'app_id');
        const uniqueAppIds = [...new Set(reviewData.map(review => review.app_id))];
        console.log(`Found ${uniqueAppIds.length} unique apps with reviews`);
        return uniqueAppIds;
    } catch (error) {
        console.error('Error getting scraped app IDs:', error);
        throw error;
    }
}

export {
    supabase,
    insertAppRank,
    insertAppMeta,
    insertAppReview,
    insertAppReviewBatch,
    getAppIds,
    getCategoryAppCounts,
    fetchAllRecords,
    getAppsNeedingReviews,
    getScrapedAppIds
};