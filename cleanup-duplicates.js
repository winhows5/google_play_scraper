// cleanup-duplicates.js
import { supabase, getAppsWithSufficientReviews } from './db.js';

// Configuration
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to dry run
const BATCH_SIZE = 1000;

class DuplicateCleanup {
    constructor() {
        this.stats = {
            appsProcessed: 0,
            duplicatesFound: 0,
            duplicatesRemoved: 0,
            reviewsKept: 0,
            errors: 0
        };
    }

    async findDuplicates() {
        console.log('🔍 Finding apps with excessive reviews...');
        
        const appsWithExcessiveReviews = await this.getAppsWithExcessiveReviews();
        console.log(`Found ${appsWithExcessiveReviews.length} apps with more than 5000 reviews`);
        
        return appsWithExcessiveReviews;
    }

    async getAppsWithExcessiveReviews(minReviews = 5100) {
        try {
            // Use the database function if available
            const { data, error } = await supabase
                .rpc('get_apps_with_sufficient_reviews', { min_reviews: minReviews });
            
            if (error) {
                console.log('Using fallback method to find excessive reviews...');
                
                // Fallback: Get review counts manually
                const { data: reviewCounts, error: countError } = await supabase
                    .from('app_reviews')
                    .select('app_id')
                    .group('app_id')
                    .having('count(*)', 'gt', 5000);
                
                if (countError) throw countError;
                
                return reviewCounts.map(row => ({ app_id: row.app_id, review_count: null }));
            }
            
            return data;
        } catch (error) {
            console.error('Error finding apps with excessive reviews:', error);
            return [];
        }
    }

    async cleanupAppReviews(appId, targetCount = 5000) {
        try {
            console.log(`Processing ${appId}...`);
            
            // Get current review count
            const { count, error: countError } = await supabase
                .from('app_reviews')
                .select('*', { count: 'exact', head: true })
                .eq('app_id', appId);
            
            if (countError) throw countError;
            
            if (count <= targetCount) {
                console.log(`${appId}: ${count} reviews (within limit)`);
                return { kept: count, removed: 0 };
            }
            
            const excessReviews = count - targetCount;
            console.log(`${appId}: ${count} reviews (${excessReviews} excess)`);
            
            if (DRY_RUN) {
                console.log(`[DRY RUN] Would remove ${excessReviews} reviews from ${appId}`);
                this.stats.duplicatesFound += excessReviews;
                return { kept: targetCount, removed: excessReviews };
            }
            
            // Strategy: Keep the most relevant/helpful reviews
            // 1. Keep reviews with high helpful_voting
            // 2. Keep diverse ratings (1-5 stars)
            // 3. Keep recent reviews
            
            const { data: reviewsToKeep, error: selectError } = await supabase
                .from('app_reviews')
                .select('id')
                .eq('app_id', appId)
                .order('helpful_voting', { ascending: false })
                .order('post_date', { ascending: false })
                .limit(targetCount);
            
            if (selectError) throw selectError;
            
            const keepIds = reviewsToKeep.map(r => r.id);
            
            // Delete excess reviews in batches
            let deletedCount = 0;
            const deletePageSize = 100;
            
            while (true) {
                const { data: reviewsToDelete, error: fetchError } = await supabase
                    .from('app_reviews')
                    .select('id')
                    .eq('app_id', appId)
                    .not('id', 'in', `(${keepIds.join(',')})`)
                    .limit(deletePageSize);
                
                if (fetchError) throw fetchError;
                if (!reviewsToDelete || reviewsToDelete.length === 0) break;
                
                const deleteIds = reviewsToDelete.map(r => r.id);
                
                const { error: deleteError } = await supabase
                    .from('app_reviews')
                    .delete()
                    .in('id', deleteIds);
                
                if (deleteError) throw deleteError;
                
                deletedCount += reviewsToDelete.length;
                console.log(`${appId}: Deleted ${deletedCount}/${excessReviews} excess reviews`);
                
                // Small delay to avoid overwhelming the database
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.stats.duplicatesRemoved += deletedCount;
            console.log(`✅ ${appId}: Kept ${targetCount}, removed ${deletedCount} reviews`);
            
            return { kept: targetCount, removed: deletedCount };
            
        } catch (error) {
            console.error(`❌ Error cleaning up ${appId}:`, error);
            this.stats.errors++;
            return { kept: 0, removed: 0 };
        }
    }

    async run() {
        console.log('🧹 Starting duplicate review cleanup...');
        console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE CLEANUP'}`);
        console.log('=====================================\n');
        
        const appsWithExcessiveReviews = await this.findDuplicates();
        
        if (appsWithExcessiveReviews.length === 0) {
            console.log('✅ No apps with excessive reviews found!');
            return;
        }
        
        console.log(`\n📊 Found ${appsWithExcessiveReviews.length} apps to process\n`);
        
        for (const app of appsWithExcessiveReviews) {
            const result = await this.cleanupAppReviews(app.app_id);
            
            this.stats.appsProcessed++;
            this.stats.reviewsKept += result.kept;
            
            // Progress update every 10 apps
            if (this.stats.appsProcessed % 10 === 0) {
                console.log(`\n📈 Progress: ${this.stats.appsProcessed}/${appsWithExcessiveReviews.length} apps processed\n`);
            }
        }
        
        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('🏁 CLEANUP SUMMARY');
        console.log('='.repeat(50));
        console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE CLEANUP'}`);
        console.log(`Apps processed: ${this.stats.appsProcessed}`);
        console.log(`Duplicate reviews found: ${this.stats.duplicatesFound.toLocaleString()}`);
        console.log(`Reviews removed: ${this.stats.duplicatesRemoved.toLocaleString()}`);
        console.log(`Reviews kept: ${this.stats.reviewsKept.toLocaleString()}`);
        console.log(`Errors: ${this.stats.errors}`);
        
        if (DRY_RUN) {
            console.log('\n💡 To perform actual cleanup, run:');
            console.log('DRY_RUN=false node cleanup-duplicates.js');
        }
        
        console.log('='.repeat(50) + '\n');
    }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const cleanup = new DuplicateCleanup();
    cleanup.run().catch(console.error);
}

export { DuplicateCleanup };