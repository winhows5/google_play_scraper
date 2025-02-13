// db.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
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

async function getAppIds() {
    // First get all app_ids
    const { data, error } = await supabase
        .from('app_ranks')
        .select('app_id');
    
    if (error) throw error;

    // Then use Set to get unique values
    const uniqueAppIds = [...new Set(data.map(item => item.app_id))];
    return uniqueAppIds;
}

export {
    supabase,
    insertAppRank,
    insertAppMeta,
    insertAppReview,
    getAppIds
};






// // db.js
// async function insertAppReview(data) {
//     try {
//         // Validate review data
//         if (!data.app_id || !data.post_date || !data.rating) {
//             throw new Error('Missing required review fields');
//         }

//         // Clean the review text
//         data.review_content = data.review_content 
//             ? data.review_content.slice(0, 10000) // Limit review length
//             : '';

//         // Ensure dates are in correct format
//         data.post_date = new Date(data.post_date).toISOString();

//         const { error } = await supabase
//             .from('app_reviews')
//             .insert(data);
        
//         if (error) {
//             console.error('Database error:', error);
//             throw error;
//         }
//     } catch (error) {
//         console.error('Error inserting review:', error);
//         throw error;
//     }
// }