// scrape-category.js
import gplay from 'google-play-scraper';
import { insertAppReview, insertAppReviewBatch, fetchAllRecords, getScrapedAppIds, getAppsWithSufficientReviews } from './db.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Configuration
const MAX_REVIEWS_PER_APP = 5000;
const BASE_DELAY = parseInt(process.env.SCRAPE_DELAY || 2000); // 2s base delay
const RATE_LIMIT_DELAY = 5000; // 5s when rate limited
const MAX_RETRIES = 5;
const BATCH_SIZE = 250; // Reviews per request
const MAX_MEMORY_USAGE = 200 * 1024 * 1024; // 200MB limit

// Helper function to clean text
function cleanText(text) {
    if (!text) return '';
    // Remove null characters and other problematic Unicode
    return text
        .replace(/\u0000/g, '') // Remove null chars
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .trim();
}

// Smart Rate limiting tracking
class SmartRateLimiter {
    constructor(category) {
        this.category = category;
        this.successCount = 0;
        this.errorCount = 0;
        this.rateLimitHits = 0;
        this.lastRequestTime = Date.now();
        this.avgDelay = BASE_DELAY;
        this.consecutiveErrors = 0;
        this.requestsInLastMinute = [];
    }

    async waitForNextRequest() {
        const now = Date.now();
        
        // Track requests per minute
        this.requestsInLastMinute = this.requestsInLastMinute.filter(
            time => now - time < 60000
        );
        this.requestsInLastMinute.push(now);
        
        // Progressive delay based on requests per minute
        let delay = this.avgDelay;
        
        if (this.requestsInLastMinute.length > 30) {
            // More than 30 requests/minute, slow down
            delay = delay * 2;
        } else if (this.requestsInLastMinute.length < 10 && this.consecutiveErrors === 0) {
            // Less than 10 requests/minute and no errors, speed up
            delay = Math.max(1000, delay * 0.8);
        }
        
        // Add exponential backoff for consecutive errors
        if (this.consecutiveErrors > 0) {
            delay = Math.min(30000, delay * Math.pow(2, this.consecutiveErrors));
        }
        
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < delay) {
            await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastRequest));
        }
        
        this.lastRequestTime = Date.now();
    }

    recordSuccess() {
        this.successCount++;
        this.consecutiveErrors = 0;
        this.rateLimitHits = Math.max(0, this.rateLimitHits - 1);
        this.avgDelay = Math.max(1000, this.avgDelay * 0.95);
    }

    recordError(error) {
        this.errorCount++;
        this.consecutiveErrors++;
        
        // Check error type
        if (error.message?.includes('502') || error.message?.includes('gateway')) {
            // Server errors - back off significantly
            this.avgDelay = Math.min(30000, this.avgDelay * 3);
            return 'gateway';
        } else if (error.message?.includes('429') || error.message?.includes('rate')) {
            // Rate limit - moderate backoff
            this.rateLimitHits++;
            this.avgDelay = Math.min(20000, this.avgDelay * 2);
            return 'rate_limit';
        } else if (error.message?.includes('timeout')) {
            // Timeout - slight backoff
            this.avgDelay = Math.min(15000, this.avgDelay * 1.5);
            return 'timeout';
        }
        
        return 'unknown';
    }

    shouldAbort() {
        // Abort if too many consecutive errors
        return this.consecutiveErrors > 10;
    }

    getStats() {
        return {
            successCount: this.successCount,
            errorCount: this.errorCount,
            rateLimitHits: this.rateLimitHits,
            currentDelay: Math.round(this.avgDelay),
            requestsPerMinute: this.requestsInLastMinute.length,
            consecutiveErrors: this.consecutiveErrors
        };
    }
}

// Progress tracking
class CategoryProgress {
    constructor(category, totalApps) {
        this.category = category;
        this.totalApps = totalApps;
        this.completedApps = 0;
        this.totalReviews = 0;
        this.startTime = Date.now();
        this.logFile = `logs/scrape-${category}-${new Date().toISOString().split('T')[0]}.log`;
    }

    async log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        
        console.log(`[${this.category}] ${message}`);
        
        try {
            await fs.mkdir('logs', { recursive: true });
            await fs.appendFile(this.logFile, logMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async updateProgress(appId, reviewCount) {
        this.completedApps++;
        this.totalReviews += reviewCount;
        
        const progress = (this.completedApps / this.totalApps * 100).toFixed(2);
        const elapsedTime = Date.now() - this.startTime;
        const appsPerHour = (this.completedApps / (elapsedTime / 3600000)).toFixed(2);
        const eta = new Date(Date.now() + (this.totalApps - this.completedApps) * (elapsedTime / this.completedApps));
        
        await this.log(
            `Progress: ${this.completedApps}/${this.totalApps} (${progress}%) | ` +
            `App: ${appId} | Reviews: ${reviewCount} | ` +
            `Speed: ${appsPerHour} apps/hr | ETA: ${eta.toLocaleString()}`
        );
    }

    async writeResourceStats() {
        const usage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        await this.log(
            `Resource Usage - Memory: ${Math.round(usage.heapUsed / 1048576)}MB | ` +
            `CPU: ${Math.round(cpuUsage.user / 1000000)}s user, ${Math.round(cpuUsage.system / 1000000)}s system`
        );
    }
}

// Main scraping function for a category
async function scrapeCategoryReviews(category) {
    const rateLimiter = new SmartRateLimiter(category);
    
    try {
        console.log(`Starting scraper for category: ${category}`);
        
        // Get apps for this category
        const allAppRanks = await fetchAllRecords('app_ranks', 'app_id, category');
        const categoryApps = [...new Set(
            allAppRanks
                .filter(rank => rank.category === category)
                .map(rank => rank.app_id)
        )];
        
        if (categoryApps.length === 0) {
            console.log(`No apps found for category ${category}`);
            return;
        }
        
        // Get already scraped apps efficiently
        console.log(`Checking for already scraped apps...`);
        const scrapedAppIdsList = await getScrapedAppIds();
        const scrapedApps = new Set(scrapedAppIdsList);
        console.log(`Found ${scrapedApps.size} apps with existing reviews`);
        
        // Filter out already scraped apps
        const appsToScrape = categoryApps.filter(appId => !scrapedApps.has(appId));
        
        console.log(`${appsToScrape.length} apps need scraping in ${category}`);
        
        const progress = new CategoryProgress(category, appsToScrape.length);
        await progress.log(`Found ${appsToScrape.length} apps to scrape in ${category}`);
        
        // Process each app
        for (const appId of appsToScrape) {
            try {
                await rateLimiter.waitForNextRequest();
                
                const reviewCount = await scrapeAppReviews(appId, rateLimiter, progress);
                await progress.updateProgress(appId, reviewCount);
                
                rateLimiter.recordSuccess();
                
                // Log resource stats every 10 apps
                if (progress.completedApps % 10 === 0) {
                    await progress.writeResourceStats();
                    const stats = rateLimiter.getStats();
                    await progress.log(`Rate limiter stats: ${JSON.stringify(stats)}`);
                }
                
            } catch (error) {
                await progress.log(`Error scraping ${appId}: ${error.message}`);
                
                const errorType = rateLimiter.recordError(error);
                if (errorType === 'gateway' || errorType === 'rate_limit') {
                    await progress.log(`${errorType} error! Waiting ${RATE_LIMIT_DELAY}ms before continuing...`);
                    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
                }
                
                if (rateLimiter.shouldAbort()) {
                    throw new Error(`Too many consecutive errors, aborting category ${category}`);
                }
            }
        }
        
        await progress.log(`Completed scraping ${category}! Total reviews: ${progress.totalReviews}`);
        
    } catch (error) {
        console.error(`Fatal error in category ${category}:`, error);
        throw error;
    }
}

// Scrape reviews for a single app with all fixes
async function scrapeAppReviews(appId, rateLimiter, progress) {
    let reviewCount = 0;
    let nextToken = undefined;
    let retries = 0;
    
    // Reduced buffer size to prevent memory issues
    let reviewBuffer = [];
    const BUFFER_SIZE = 500; // Reduced from 1000
    
    console.log(`Starting to scrape reviews for ${appId}`);
    const startTime = Date.now();
    
    while (reviewCount < MAX_REVIEWS_PER_APP) {
        try {
            // Check memory usage periodically
            if (reviewCount % 1000 === 0 && reviewCount > 0) {
                const usage = process.memoryUsage();
                const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
                
                if (usage.heapUsed > MAX_MEMORY_USAGE) {
                    console.log(`High memory usage detected: ${usedMB}MB for ${appId}`);
                    // Force insert current buffer to free memory
                    if (reviewBuffer.length > 0) {
                        await insertAppReviewBatch(reviewBuffer);
                        reviewBuffer = [];
                    }
                    // Try to trigger garbage collection
                    if (global.gc) {
                        global.gc();
                    }
                }
                
                // Log progress
                const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
                const rate = reviewCount / elapsed;
                await progress.log(`${appId}: ${reviewCount} reviews, ${usedMB}MB memory (${rate.toFixed(0)} reviews/min)`);
            }
            
            await rateLimiter.waitForNextRequest();
            
            const reviews = await gplay.reviews({
                appId: appId,
                sort: gplay.sort.RELEVANCE,
                paginate: true,
                nextPaginationToken: nextToken,
                country: 'US',
                num: BATCH_SIZE
            });
            
            // Clean and validate reviews
            const newReviews = reviews.data
                .map(review => ({
                    app_id: appId,
                    post_date: review.date,
                    language: 'en',
                    country: 'US',
                    author_name: cleanText(review.userName),
                    rating: Math.max(1, Math.min(5, review.score || 1)), // Ensure 1-5 range
                    review_content: cleanText(review.text),
                    helpful_voting: review.thumbsUp || 0,
                    app_version: cleanText(review.version) || 'Unknown'
                }))
                .filter(review => {
                    // Additional validation
                    if (review.rating < 1 || review.rating > 5) {
                        console.log(`Skipping review with invalid rating ${review.rating}`);
                        return false;
                    }
                    return true;
                });
            
            // Limit the number of reviews to not exceed MAX_REVIEWS_PER_APP
            const remainingReviews = MAX_REVIEWS_PER_APP - reviewCount;
            const reviewsToAdd = newReviews.slice(0, remainingReviews);
            
            // Add to buffer
            reviewBuffer.push(...reviewsToAdd);
            reviewCount += reviewsToAdd.length;
            
            // Insert when buffer is full or no more reviews
            if (reviewBuffer.length >= BUFFER_SIZE || !reviews.nextPaginationToken) {
                try {
                    await insertAppReviewBatch(reviewBuffer);
                    reviewBuffer = []; // Clear immediately after insert
                } catch (insertError) {
                    await progress.log(`Batch insert failed for ${appId}: ${insertError.message}`);
                    // Try smaller chunks on failure
                    const smallChunks = [];
                    for (let i = 0; i < reviewBuffer.length; i += 50) {
                        smallChunks.push(reviewBuffer.slice(i, i + 50));
                    }
                    
                    for (const chunk of smallChunks) {
                        try {
                            await insertAppReviewBatch(chunk);
                        } catch (e) {
                            console.error(`Failed to insert chunk: ${e.message}`);
                        }
                    }
                    reviewBuffer = []; // Clear buffer regardless
                }
            }
            
            nextToken = reviews.nextPaginationToken;
            if (!nextToken || reviews.data.length === 0) {
                break;
            }
            
            retries = 0; // Reset retries on success
            
        } catch (error) {
            retries++;
            
            if (retries >= MAX_RETRIES) {
                // Insert any remaining reviews before failing
                if (reviewBuffer.length > 0) {
                    try {
                        await insertAppReviewBatch(reviewBuffer);
                    } catch (e) {
                        console.error('Failed to insert remaining reviews:', e);
                    }
                }
                throw error;
            }
            
            await progress.log(`Retry ${retries}/${MAX_RETRIES} for ${appId}: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * retries));
        }
    }
    
    // Insert any remaining reviews
    if (reviewBuffer.length > 0) {
        await insertAppReviewBatch(reviewBuffer);
    }
    
    const totalTime = (Date.now() - startTime) / 1000 / 60; // minutes
    const finalMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    console.log(`Completed ${appId}: ${reviewCount} reviews in ${totalTime.toFixed(1)} minutes (Final memory: ${finalMemory}MB)`);
    
    return reviewCount;
}

// Resource monitoring
async function monitorResources() {
    const usage = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: os.platform(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        loadAverage: os.loadavg()
    };
    
    console.log('\n=== Resource Usage ===');
    console.log(`Memory: ${Math.round(usage.memory.heapUsed / 1048576)}MB / ${Math.round(usage.memory.heapTotal / 1048576)}MB`);
    console.log(`System Memory: ${Math.round((usage.totalMemory - usage.freeMemory) / 1048576)}MB / ${Math.round(usage.totalMemory / 1048576)}MB`);
    console.log(`Load Average: ${usage.loadAverage.map(n => n.toFixed(2)).join(', ')}`);
    
    return usage;
}

// Main execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const category = process.argv[2];
    
    if (!category) {
        console.error('Usage: node scrape-category.js CATEGORY_NAME');
        process.exit(1);
    }
    
    // Set process title for easier monitoring
    process.title = `scraper-${category}`;
    
    // Monitor resources periodically
    const resourceInterval = setInterval(monitorResources, 300000); // Every 5 minutes
    
    scrapeCategoryReviews(category)
        .then(() => {
            clearInterval(resourceInterval);
            console.log(`Category ${category} completed successfully`);
            process.exit(0);
        })
        .catch(error => {
            clearInterval(resourceInterval);
            console.error(`Category ${category} failed:`, error);
            process.exit(1);
        });
}

export { scrapeCategoryReviews, SmartRateLimiter as RateLimiter, CategoryProgress };