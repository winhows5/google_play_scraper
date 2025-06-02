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

export {
    supabase,
    insertAppRank,
    insertAppMeta,
    insertAppReview,
    insertAppReviewBatch,
    getAppIds,
    getCategoryAppCounts,
    fetchAllRecords
};