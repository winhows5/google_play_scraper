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

// Single review insert (keeping for compatibility)
async function insertAppReview(data) {
    const { error } = await supabase
        .from('app_reviews')
        .insert(data);
    
    if (error) throw error;
}

// Improved batch insert with all fixes
async function insertAppReviewBatch(reviews) {
    // Smaller chunks to avoid timeouts and memory issues
    const chunkSize = 50; // Reduced from larger sizes
    const maxRetries = 3;
    const retryDelay = 1000;
    
    console.log(`Starting batch insert of ${reviews.length} reviews`);
    const startTime = Date.now();
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < reviews.length; i += chunkSize) {
        const chunk = reviews.slice(i, i + chunkSize);
        let retries = 0;
        let success = false;
        
        while (retries < maxRetries && !success) {
            try {
                const { data, error } = await supabase
                    .from('app_reviews')
                    .insert(chunk)
                    .select(); // Ensures insert completed
                
                if (error) {
                    // Handle specific error codes
                    if (error.code === '23505') {
                        // Duplicate key - these reviews already exist
                        console.log(`Skipping ${chunk.length} duplicate reviews`);
                        skippedCount += chunk.length;
                        success = true;
                        break;
                    } else if (error.code === '23514') {
                        // Constraint violation - filter out bad reviews
                        console.log(`Constraint violation, filtering chunk...`);
                        const validChunk = chunk.filter(r => r.rating >= 1 && r.rating <= 5);
                        if (validChunk.length > 0) {
                            const { error: retryError } = await supabase
                                .from('app_reviews')
                                .insert(validChunk);
                            if (!retryError) {
                                insertedCount += validChunk.length;
                                skippedCount += chunk.length - validChunk.length;
                                success = true;
                                break;
                            }
                        }
                    }
                    throw error;
                }
                
                insertedCount += chunk.length;
                success = true;
                
                // Log progress for large batches
                if (insertedCount % 1000 === 0) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const rate = insertedCount / elapsed;
                    console.log(`Progress: ${insertedCount}/${reviews.length} reviews (${rate.toFixed(0)} reviews/sec)`);
                }
                
            } catch (err) {
                retries++;
                
                const isNetworkError = err.message?.includes('fetch failed') || 
                                     err.message?.includes('timeout') ||
                                     err.message?.includes('ECONNRESET');
                
                if (isNetworkError) {
                    console.error(`Network error on chunk ${Math.floor(i/chunkSize)}, retry ${retries}/${maxRetries}`);
                    // Exponential backoff for network errors
                    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retries)));
                } else {
                    console.error(`Database error on chunk ${Math.floor(i/chunkSize)}:`, err.message);
                    // For non-network errors, fail faster
                    if (retries >= maxRetries) {
                        console.error(`Skipping chunk after ${maxRetries} retries`);
                        skippedCount += chunk.length;
                        success = true; // Move on to next chunk
                    }
                }
            }
        }
        
        // Small delay between chunks to avoid overwhelming the connection
        if (i + chunkSize < reviews.length && success) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`Batch insert completed: ${insertedCount} inserted, ${skippedCount} skipped in ${totalTime.toFixed(1)}s`);
}

async function fetchAllRecords(table, columns) {
    // Initialize variables
    let allData = [];
    let page = 0;
    const pageSize = 1000; // Supabase's limit
    let hasMore = true;
    
    // Paginate through all records
    while (hasMore) {
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        allData = [...allData, ...data];
        page++;
        
        // Check if we've received fewer than pageSize records, indicating we're done
        hasMore = data.length === pageSize;
    }
    
    console.log(`Retrieved ${allData.length} total records from ${table}`);
    return allData;
}

async function getAppIds() {
    try {
        // Use pagination to get all records
        const data = await fetchAllRecords('app_ranks', 'app_id');
        
        // Use Set for uniqueness
        const uniqueAppIds = [...new Set(data.map(item => item.app_id))];
        console.log(`getAppIds found ${uniqueAppIds.length} unique app IDs from ${data.length} total records`);
        return uniqueAppIds;
    } catch (error) {
        console.error('Error in getAppIds:', error);
        throw error;
    }
}

async function getCategoryAppCounts() {
    try {
        console.log('Getting category app counts...');
        
        // Use pagination to get all records
        const data = await fetchAllRecords('app_ranks', 'app_id, category');
        
        console.log(`Raw query returned ${data.length} total records`);
        
        // Debug: Log all unique categories found
        const allCategories = [...new Set(data.map(item => item.category))];
        console.log(`Found ${allCategories.length} unique categories in data:`, allCategories.join(', '));
        
        // Process the data to count unique apps per category
        const categoryApps = {};
        data.forEach(item => {
            if (!item.category) {
                console.warn('Found item with no category:', item);
                return;
            }
            
            if (!categoryApps[item.category]) {
                categoryApps[item.category] = new Set();
            }
            categoryApps[item.category].add(item.app_id);
        });
        
        // Convert Sets to counts
        const result = {};
        for (const category in categoryApps) {
            result[category] = categoryApps[category].size;
            console.log(`Category ${category}: ${result[category]} unique apps`);
        }
        
        return result;
    } catch (error) {
        console.error('Error getting category counts:', error);
        throw error;
    }
}

async function getScrapedAppIds() {
    try {
        console.log('Fetching list of apps with sufficient reviews (5000+)...');
        
        // Use the new function to get apps with 5000+ reviews
        const appsWithSufficientReviews = await getAppsWithSufficientReviews(5000);
        
        console.log(`Found ${appsWithSufficientReviews.length} apps with sufficient reviews (5000+)`);
        return appsWithSufficientReviews;
        
    } catch (error) {
        console.error('Error in getScrapedAppIds:', error);
        
        // Fallback to old method if new method fails
        console.log('Falling back to original method...');
        try {
            // Use raw SQL for efficiency - gets distinct app_ids that have reviews
            const { data, error } = await supabase
                .rpc('get_distinct_app_ids');
            
            if (error) {
                // Fallback: If RPC doesn't exist, use a different approach
                console.log('RPC not found, using fallback method...');
                
                // Get a sample to check if any reviews exist
                const { data: sample, error: sampleError } = await supabase
                    .from('app_reviews')
                    .select('app_id')
                    .limit(1);
                
                if (sampleError || !sample || sample.length === 0) {
                    console.log('No reviews found in database');
                    return [];
                }
                
                // If reviews exist, get distinct app_ids page by page
                const distinctAppIds = new Set();
                let lastAppId = null;
                const pageSize = 10000;
                
                while (true) {
                    let query = supabase
                        .from('app_reviews')
                        .select('app_id')
                        .order('app_id')
                        .limit(pageSize);
                    
                    if (lastAppId) {
                        query = query.gt('app_id', lastAppId);
                    }
                    
                    const { data: batch, error: batchError } = await query;
                    
                    if (batchError) {
                        console.error('Error fetching app_ids:', batchError);
                        break;
                    }
                    
                    if (!batch || batch.length === 0) {
                        break;
                    }
                    
                    batch.forEach(row => distinctAppIds.add(row.app_id));
                    lastAppId = batch[batch.length - 1].app_id;
                    
                    console.log(`Processed ${distinctAppIds.size} unique apps so far...`);
                    
                    if (batch.length < pageSize) {
                        break;
                    }
                }
                
                const result = Array.from(distinctAppIds);
                console.log(`Found ${result.length} apps with existing reviews (fallback)`);
                return result;
            }
            
            console.log(`Found ${data.length} apps with existing reviews (RPC)`);
            return data.map(row => row.app_id);
            
        } catch (fallbackError) {
            console.error('Fallback method also failed:', fallbackError);
            return [];
        }
    }
}

// New function to get apps that have sufficient reviews (5000+)
async function getAppsWithSufficientReviews(minReviews = 5000) {
    try {
        console.log(`Fetching apps with at least ${minReviews} reviews...`);
        
        // Try to use the new database function first
        const { data, error } = await supabase
            .rpc('get_apps_with_sufficient_reviews', { min_reviews: minReviews });
        
        if (error) {
            console.log('Database function not available, using fallback method...');
            
            // Fallback: Use a more efficient GROUP BY query
            const { data: groupData, error: groupError } = await supabase
                .from('app_reviews')
                .select('app_id')
                .group('app_id')
                .having('count(*)', 'gte', minReviews);
            
            if (groupError) {
                // Final fallback: count reviews for each app manually
                console.log('GROUP BY query failed, using manual count method...');
                
                // First get all apps that have any reviews
                const { data: appsWithReviews, error: appsError } = await supabase
                    .from('app_reviews')
                    .select('app_id')
                    .order('app_id');
                
                if (appsError) throw appsError;
                
                // Get unique app IDs
                const uniqueAppIds = [...new Set(appsWithReviews.map(r => r.app_id))];
                console.log(`Checking review counts for ${uniqueAppIds.length} apps...`);
                
                const sufficientApps = [];
                
                // Check each app's review count in batches
                const batchSize = 10;
                for (let i = 0; i < uniqueAppIds.length; i += batchSize) {
                    const batch = uniqueAppIds.slice(i, i + batchSize);
                    
                    await Promise.all(batch.map(async (appId) => {
                        try {
                            const { count, error: countError } = await supabase
                                .from('app_reviews')
                                .select('*', { count: 'exact', head: true })
                                .eq('app_id', appId);
                            
                            if (!countError && count >= minReviews) {
                                sufficientApps.push(appId);
                            }
                        } catch (e) {
                            console.warn(`Failed to count reviews for ${appId}:`, e.message);
                        }
                    }));
                    
                    // Progress update every 100 apps
                    if (i % 100 === 0) {
                        console.log(`Processed ${Math.min(i + batchSize, uniqueAppIds.length)}/${uniqueAppIds.length} apps...`);
                    }
                    
                    // Small delay to avoid overwhelming the database
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                console.log(`Found ${sufficientApps.length} apps with sufficient reviews (manual method)`);
                return sufficientApps;
            }
            
            const result = groupData.map(row => row.app_id);
            console.log(`Found ${result.length} apps with at least ${minReviews} reviews (GROUP BY)`);
            return result;
        }
        
        // Success with database function
        const result = data.map(row => row.app_id);
        console.log(`Found ${result.length} apps with at least ${minReviews} reviews (DB function)`);
        return result;
        
    } catch (error) {
        console.error('Error in getAppsWithSufficientReviews:', error);
        return [];
    }
}

// New intelligent completion detection function
async function getAppsNeedingReviews() {
    try {
        console.log('Determining which apps need review scraping...');
        
        // Get all apps from rankings
        const allAppIds = await getAppIds();
        console.log(`Total apps to scrape: ${allAppIds.length}`);
        
        // Get current review counts for all apps
        const { data: reviewCounts, error } = await supabase
            .from('app_reviews')
            .select('app_id')
            .group('app_id')
            .order('count', { ascending: false });
        
        if (error) {
            console.log('Using fallback method for review counts...');
            return await getAppsNeedingReviewsFallback(allAppIds);
        }
        
        // Create a map of app_id to review count
        const reviewCountMap = new Map();
        for (const row of reviewCounts) {
            const { count, error: countError } = await supabase
                .from('app_reviews')
                .select('*', { count: 'exact', head: true })
                .eq('app_id', row.app_id);
            
            if (!countError) {
                reviewCountMap.set(row.app_id, count);
            }
        }
        
        const appsNeedingReviews = [];
        const completedApps = [];
        
        // Check each app - key change: we consider an app "attempted" if it has ANY reviews
        for (const appId of allAppIds) {
            const currentReviews = reviewCountMap.get(appId) || 0;
            
            if (currentReviews === 0) {
                // No reviews at all - definitely needs scraping
                appsNeedingReviews.push({
                    app_id: appId,
                    current_reviews: 0,
                    reason: 'not_attempted',
                    priority: 'high'
                });
            } else {
                // Has some reviews - consider it "attempted/completed"
                // This is the key change: we don't try to get more once we've attempted an app
                completedApps.push(appId);
                
                // But we can still categorize for reporting purposes
                if (currentReviews < 100) {
                    // Likely a small app with limited reviews available
                } else if (currentReviews < 1000) {
                    // Medium-sized app
                } else if (currentReviews >= 5000) {
                    // Large app with many reviews
                }
            }
        }
        
        console.log(`Apps analysis:`);
        console.log(`  Apps attempted (have any reviews): ${completedApps.length}`);
        console.log(`  Apps not yet attempted: ${appsNeedingReviews.length}`);
        console.log(`  Apps with 5000+ reviews: ${completedApps.filter(appId => (reviewCountMap.get(appId) || 0) >= 5000).length}`);
        console.log(`  Apps with 100-5000 reviews: ${completedApps.filter(appId => {
            const count = reviewCountMap.get(appId) || 0;
            return count >= 100 && count < 5000;
        }).length}`);
        console.log(`  Apps with <100 reviews: ${completedApps.filter(appId => (reviewCountMap.get(appId) || 0) < 100).length}`);
        
        return {
            needsReviews: appsNeedingReviews,
            completed: completedApps,
            stats: {
                total: allAppIds.length,
                completed: completedApps.length,
                needsWork: appsNeedingReviews.length,
                completionPercentage: (completedApps.length / allAppIds.length * 100).toFixed(1)
            }
        };
        
    } catch (error) {
        console.error('Error in getAppsNeedingReviews:', error);
        return {
            needsReviews: [],
            completed: [],
            stats: { total: 0, completed: 0, needsWork: 0, completionPercentage: 0 }
        };
    }
}

// Fallback method for getAppsNeedingReviews
async function getAppsNeedingReviewsFallback(allAppIds) {
    console.log('Using slower fallback method to check each app individually...');
    
    const appsNeedingReviews = [];
    const completedApps = [];
    let processed = 0;
    
    // Process apps in batches to avoid overwhelming the database
    const batchSize = 20;
    for (let i = 0; i < allAppIds.length; i += batchSize) {
        const batch = allAppIds.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (appId) => {
            try {
                const { count, error } = await supabase
                    .from('app_reviews')
                    .select('*', { count: 'exact', head: true })
                    .eq('app_id', appId);
                
                if (error) {
                    console.warn(`Error checking ${appId}: ${error.message}`);
                    return;
                }
                
                const currentReviews = count || 0;
                
                if (currentReviews === 0) {
                    appsNeedingReviews.push({
                        app_id: appId,
                        current_reviews: 0,
                        reason: 'no_reviews',
                        priority: 'high'
                    });
                } else if (currentReviews < 100) {
                    appsNeedingReviews.push({
                        app_id: appId,
                        current_reviews: currentReviews,
                        reason: 'too_few_reviews',
                        priority: 'high'
                    });
                } else if (currentReviews < 1000) {
                    appsNeedingReviews.push({
                        app_id: appId,
                        current_reviews: currentReviews,
                        reason: 'moderate_reviews',
                        priority: 'medium'
                    });
                } else if (currentReviews < 5000) {
                    appsNeedingReviews.push({
                        app_id: appId,
                        current_reviews: currentReviews,
                        reason: 'below_target',
                        priority: 'low'
                    });
                } else {
                    completedApps.push(appId);
                }
                
            } catch (e) {
                console.warn(`Failed to process ${appId}: ${e.message}`);
            }
        }));
        
        processed += batch.length;
        if (processed % 100 === 0) {
            console.log(`Processed ${processed}/${allAppIds.length} apps...`);
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return {
        needsReviews: appsNeedingReviews,
        completed: completedApps,
        stats: {
            total: allAppIds.length,
            completed: completedApps.length,
            needsWork: appsNeedingReviews.length,
            completionPercentage: (completedApps.length / allAppIds.length * 100).toFixed(1)
        }
    };
}

// Updated version of getScrapedAppIds that uses intelligent completion detection
async function getIntelligentlyScrapedAppIds() {
    try {
        console.log('Getting intelligently determined completed apps...');
        
        const analysis = await getAppsNeedingReviews();
        
        console.log(`Intelligent analysis results:`);
        console.log(`  Total apps: ${analysis.stats.total}`);
        console.log(`  Completed apps: ${analysis.stats.completed}`);
        console.log(`  Apps needing work: ${analysis.stats.needsWork}`);
        console.log(`  Completion: ${analysis.stats.completionPercentage}%`);
        
        return analysis.completed;
        
    } catch (error) {
        console.error('Error in getIntelligentlyScrapedAppIds, falling back to old method:', error);
        return await getScrapedAppIds();
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
    getScrapedAppIds,
    getAppsWithSufficientReviews,
    getAppsNeedingReviews,
    getIntelligentlyScrapedAppIds
};