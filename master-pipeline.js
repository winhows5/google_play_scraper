// master-pipeline.js
import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import { scrapeRankings } from './rank.js';
import { scrapeAppMetadata } from './meta.js';
import { getCategoryAppCounts, getAppIds, fetchAllRecords, getScrapedAppIds } from './db.js';
import { ScraperOrchestrator } from './orchestrator.js';
import { ProgressMonitor } from './monitor-progress.js';
import { DuplicateCleanup } from './cleanup-duplicates.js';

// Pipeline configuration
const PIPELINE_CONFIG = {
    phases: {
        ranks: {
            name: 'App Rankings',
            enabled: process.env.ENABLE_RANKS !== 'false',
            targetAppsPerCategory: 50,
            totalCategories: 32
        },
        metadata: {
            name: 'App Metadata',
            enabled: process.env.ENABLE_METADATA !== 'false',
            batchSize: 10,
            delayBetweenApps: 2000
        },
        reviews: {
            name: 'App Reviews',
            enabled: process.env.ENABLE_REVIEWS !== 'false',
            maxConcurrentScrapers: parseInt(process.env.MAX_CONCURRENT || 15),
            targetReviewsPerApp: 5000
        }
    },
    validation: {
        strictMode: process.env.STRICT_MODE === 'true',
        autoCleanup: process.env.AUTO_CLEANUP !== 'false',
        pauseBetweenPhases: parseInt(process.env.PHASE_DELAY || 30000) // 30 seconds
    },
    monitoring: {
        enableRealTimeMonitoring: process.env.ENABLE_MONITORING !== 'false',
        logLevel: process.env.LOG_LEVEL || 'INFO',
        saveProgressEvery: 300000 // 5 minutes
    }
};

class MasterPipeline {
    constructor() {
        this.currentPhase = null;
        this.stats = {
            startTime: Date.now(),
            phases: {
                ranks: { status: 'pending', startTime: null, endTime: null, appsScraped: 0 },
                metadata: { status: 'pending', startTime: null, endTime: null, appsProcessed: 0 },
                reviews: { status: 'pending', startTime: null, endTime: null, reviewsScraped: 0 }
            },
            errors: [],
            warnings: []
        };
        this.progressMonitor = null;
        this.monitoring = false;
    }

    async initialize() {
        console.log('🚀 GOOGLE PLAY SCRAPER - MASTER PIPELINE');
        console.log('==========================================');
        console.log(`Start Time: ${new Date().toLocaleString()}`);
        console.log(`Configuration: ${JSON.stringify(PIPELINE_CONFIG, null, 2)}`);
        console.log('==========================================\n');

        // Create logs directory
        await fs.mkdir('logs', { recursive: true });
        
        // Load previous state if exists
        await this.loadState();
        
        // Validate environment
        await this.validateEnvironment();
        
        // Setup monitoring if enabled
        if (PIPELINE_CONFIG.monitoring.enableRealTimeMonitoring) {
            await this.setupMonitoring();
        }
        
        console.log('✅ Pipeline initialized successfully\n');
    }

    async validateEnvironment() {
        console.log('🔍 Validating environment...');
        
        const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }

        // Check system resources
        const totalMemoryGB = Math.round(os.totalmem() / 1073741824);
        const cpuCount = os.cpus().length;
        
        console.log(`System Resources: ${cpuCount} CPUs, ${totalMemoryGB}GB RAM`);
        
        if (totalMemoryGB < 4) {
            this.addWarning('Low memory detected. Consider reducing MAX_CONCURRENT setting.');
        }
        
        if (cpuCount < 2) {
            this.addWarning('Low CPU count detected. Performance may be limited.');
        }
        
        console.log('✅ Environment validation complete\n');
    }

    async setupMonitoring() {
        console.log('📊 Setting up real-time monitoring...');
        this.progressMonitor = new ProgressMonitor();
        // Don't start it immediately, we'll control when to show monitoring
        console.log('✅ Monitoring setup complete\n');
    }

    async loadState() {
        try {
            const stateFile = 'logs/master-pipeline-state.json';
            const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
            this.stats = { ...this.stats, ...state };
            console.log('📁 Loaded previous pipeline state');
        } catch (error) {
            console.log('📁 Starting fresh pipeline (no previous state found)');
        }
    }

    async saveState() {
        const state = {
            ...this.stats,
            timestamp: new Date().toISOString(),
            config: PIPELINE_CONFIG
        };
        
        await fs.writeFile('logs/master-pipeline-state.json', JSON.stringify(state, null, 2));
    }

    addError(message, phase = null) {
        const error = {
            message,
            phase: phase || this.currentPhase,
            timestamp: new Date().toISOString()
        };
        this.stats.errors.push(error);
        console.error(`❌ ERROR: ${message}`);
    }

    addWarning(message, phase = null) {
        const warning = {
            message,
            phase: phase || this.currentPhase,
            timestamp: new Date().toISOString()
        };
        this.stats.warnings.push(warning);
        console.warn(`⚠️  WARNING: ${message}`);
    }

    async displayPhaseStatus(phase) {
        const phaseStats = this.stats.phases[phase];
        const config = PIPELINE_CONFIG.phases[phase];
        
        console.log(`\n📊 ${config.name.toUpperCase()} PHASE STATUS`);
        console.log('='.repeat(50));
        console.log(`Status: ${phaseStats.status}`);
        
        if (phaseStats.startTime) {
            const elapsed = Date.now() - phaseStats.startTime;
            console.log(`Runtime: ${Math.floor(elapsed / 60000)}m ${Math.floor((elapsed % 60000) / 1000)}s`);
        }
        
        switch (phase) {
            case 'ranks':
                console.log(`Apps scraped: ${phaseStats.appsScraped}`);
                console.log(`Target: ${config.targetAppsPerCategory * config.totalCategories} total apps`);
                break;
            case 'metadata':
                console.log(`Apps processed: ${phaseStats.appsProcessed}`);
                break;
            case 'reviews':
                console.log(`Reviews scraped: ${phaseStats.reviewsScraped}`);
                break;
        }
        
        console.log('='.repeat(50) + '\n');
    }

    async runPhaseRanks() {
        this.currentPhase = 'ranks';
        const phaseConfig = PIPELINE_CONFIG.phases.ranks;
        
        if (!phaseConfig.enabled) {
            console.log('📋 Ranks phase disabled, skipping...\n');
            this.stats.phases.ranks.status = 'skipped';
            return true;
        }

        console.log('📋 PHASE 1: SCRAPING APP RANKINGS');
        console.log('==================================\n');
        
        this.stats.phases.ranks.status = 'running';
        this.stats.phases.ranks.startTime = Date.now();
        
        try {
            // Check if ranks already exist
            const existingCategoryCounts = await getCategoryAppCounts();
            const totalExistingApps = Object.values(existingCategoryCounts).reduce((sum, count) => sum + count, 0);
            
            if (totalExistingApps > 1000) {
                console.log(`Found ${totalExistingApps} existing apps in rankings.`);
                const userChoice = process.env.FORCE_RERANK || 'continue';
                
                if (userChoice === 'skip') {
                    console.log('Skipping ranks phase (existing data found)\n');
                    this.stats.phases.ranks.status = 'skipped';
                    this.stats.phases.ranks.appsScraped = totalExistingApps;
                    return true;
                } else if (userChoice === 'clear') {
                    console.log('Clearing existing ranking data...');
                    // Add logic to clear existing data if needed
                }
            }
            
            await scrapeRankings();
            
            // Validate results
            const finalCategoryCounts = await getCategoryAppCounts();
            const totalApps = Object.values(finalCategoryCounts).reduce((sum, count) => sum + count, 0);
            
            this.stats.phases.ranks.appsScraped = totalApps;
            
            if (totalApps < 1000) {
                throw new Error(`Insufficient apps scraped: ${totalApps} (expected ~1600)`);
            }
            
            console.log(`✅ Ranks phase completed: ${totalApps} apps across ${Object.keys(finalCategoryCounts).length} categories\n`);
            
            this.stats.phases.ranks.status = 'completed';
            this.stats.phases.ranks.endTime = Date.now();
            
            return true;
            
        } catch (error) {
            this.addError(`Ranks phase failed: ${error.message}`, 'ranks');
            this.stats.phases.ranks.status = 'failed';
            this.stats.phases.ranks.endTime = Date.now();
            
            if (PIPELINE_CONFIG.validation.strictMode) {
                throw error;
            }
            
            return false;
        }
    }

    async runPhaseMetadata() {
        this.currentPhase = 'metadata';
        const phaseConfig = PIPELINE_CONFIG.phases.metadata;
        
        if (!phaseConfig.enabled) {
            console.log('📝 Metadata phase disabled, skipping...\n');
            this.stats.phases.metadata.status = 'skipped';
            return true;
        }

        console.log('📝 PHASE 2: SCRAPING APP METADATA');
        console.log('=================================\n');
        
        this.stats.phases.metadata.status = 'running';
        this.stats.phases.metadata.startTime = Date.now();
        
        try {
            // Check if metadata already exists
            const existingMeta = await fetchAllRecords('app_meta', 'app_id');
            const existingMetaCount = existingMeta.length;
            
            const allAppIds = await getAppIds();
            console.log(`Found ${allAppIds.length} apps that need metadata`);
            console.log(`Existing metadata records: ${existingMetaCount}`);
            
            if (existingMetaCount >= allAppIds.length * 0.9) { // 90% threshold
                console.log('Most metadata already exists, checking for gaps...');
                
                const existingAppIds = new Set(existingMeta.map(m => m.app_id));
                const missingAppIds = allAppIds.filter(id => !existingAppIds.has(id));
                
                if (missingAppIds.length === 0) {
                    console.log('✅ All metadata already exists, skipping phase\n');
                    this.stats.phases.metadata.status = 'skipped';
                    this.stats.phases.metadata.appsProcessed = existingMetaCount;
                    return true;
                }
                
                console.log(`Found ${missingAppIds.length} apps missing metadata`);
            }
            
            await scrapeAppMetadata();
            
            // Validate results
            const finalMeta = await fetchAllRecords('app_meta', 'app_id');
            this.stats.phases.metadata.appsProcessed = finalMeta.length;
            
            console.log(`✅ Metadata phase completed: ${finalMeta.length} apps processed\n`);
            
            this.stats.phases.metadata.status = 'completed';
            this.stats.phases.metadata.endTime = Date.now();
            
            return true;
            
        } catch (error) {
            this.addError(`Metadata phase failed: ${error.message}`, 'metadata');
            this.stats.phases.metadata.status = 'failed';
            this.stats.phases.metadata.endTime = Date.now();
            
            if (PIPELINE_CONFIG.validation.strictMode) {
                throw error;
            }
            
            return false;
        }
    }

    async runPhaseReviews() {
        this.currentPhase = 'reviews';
        const phaseConfig = PIPELINE_CONFIG.phases.reviews;
        
        if (!phaseConfig.enabled) {
            console.log('💬 Reviews phase disabled, skipping...\n');
            this.stats.phases.reviews.status = 'skipped';
            return true;
        }

        console.log('💬 PHASE 3: SCRAPING APP REVIEWS');
        console.log('================================\n');
        
        this.stats.phases.reviews.status = 'running';
        this.stats.phases.reviews.startTime = Date.now();
        
        try {
            // Run cleanup if enabled
            if (PIPELINE_CONFIG.validation.autoCleanup) {
                console.log('🧹 Running duplicate cleanup before reviews...');
                const cleanup = new DuplicateCleanup();
                await cleanup.run();
                console.log('✅ Cleanup completed\n');
            }
            
            // Get apps that need reviews
            const allAppIds = await getAppIds();
            const scrapedAppIds = await getScrapedAppIds();
            const appsNeedingReviews = allAppIds.length - scrapedAppIds.length;
            
            console.log(`Total apps: ${allAppIds.length}`);
            console.log(`Apps with sufficient reviews: ${scrapedAppIds.length}`);
            console.log(`Apps needing reviews: ${appsNeedingReviews}`);
            
            if (appsNeedingReviews === 0) {
                console.log('✅ All apps already have sufficient reviews, skipping phase\n');
                this.stats.phases.reviews.status = 'skipped';
                return true;
            }
            
            // Start monitoring in background if enabled
            let monitoringProcess = null;
            if (this.progressMonitor) {
                console.log('📊 Starting progress monitoring...');
                monitoringProcess = spawn('node', ['monitor-progress.js'], {
                    stdio: 'pipe',
                    detached: false
                });
            }
            
            // Run the orchestrated review scraping
            console.log(`🚀 Starting review scraping with ${phaseConfig.maxConcurrentScrapers} concurrent scrapers...\n`);
            
            const orchestrator = new ScraperOrchestrator();
            await orchestrator.run();
            
            // Stop monitoring
            if (monitoringProcess) {
                monitoringProcess.kill();
            }
            
            // Get final review count
            const finalReviewsData = await fetchAllRecords('app_reviews', 'id');
            this.stats.phases.reviews.reviewsScraped = finalReviewsData.length;
            
            console.log(`✅ Reviews phase completed: ${finalReviewsData.length} total reviews\n`);
            
            this.stats.phases.reviews.status = 'completed';
            this.stats.phases.reviews.endTime = Date.now();
            
            return true;
            
        } catch (error) {
            this.addError(`Reviews phase failed: ${error.message}`, 'reviews');
            this.stats.phases.reviews.status = 'failed';
            this.stats.phases.reviews.endTime = Date.now();
            
            if (PIPELINE_CONFIG.validation.strictMode) {
                throw error;
            }
            
            return false;
        }
    }

    async waitBetweenPhases(fromPhase, toPhase) {
        const delay = PIPELINE_CONFIG.validation.pauseBetweenPhases;
        if (delay > 0) {
            console.log(`⏳ Waiting ${delay/1000}s before starting ${toPhase} phase...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    async displayFinalSummary() {
        const totalTime = Date.now() - this.stats.startTime;
        const hours = Math.floor(totalTime / 3600000);
        const minutes = Math.floor((totalTime % 3600000) / 60000);
        
        console.log('\n' + '='.repeat(80));
        console.log('🏁 MASTER PIPELINE FINAL SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total Runtime: ${hours}h ${minutes}m`);
        console.log(`Started: ${new Date(this.stats.startTime).toLocaleString()}`);
        console.log(`Completed: ${new Date().toLocaleString()}`);
        console.log('');
        
        // Phase summary
        console.log('PHASE RESULTS:');
        console.log('-'.repeat(40));
        
        for (const [phaseName, phaseStats] of Object.entries(this.stats.phases)) {
            const config = PIPELINE_CONFIG.phases[phaseName];
            const status = phaseStats.status.toUpperCase();
            const statusIcon = status === 'COMPLETED' ? '✅' : 
                             status === 'FAILED' ? '❌' : 
                             status === 'SKIPPED' ? '⏭️' : '⏸️';
            
            console.log(`${statusIcon} ${config.name}: ${status}`);
            
            if (phaseStats.startTime && phaseStats.endTime) {
                const phaseTime = phaseStats.endTime - phaseStats.startTime;
                const phaseMinutes = Math.floor(phaseTime / 60000);
                console.log(`   Runtime: ${phaseMinutes}m`);
            }
            
            switch (phaseName) {
                case 'ranks':
                    console.log(`   Apps scraped: ${phaseStats.appsScraped}`);
                    break;
                case 'metadata':
                    console.log(`   Apps processed: ${phaseStats.appsProcessed}`);
                    break;
                case 'reviews':
                    console.log(`   Reviews scraped: ${phaseStats.reviewsScraped.toLocaleString()}`);
                    break;
            }
        }
        
        // Errors and warnings
        if (this.stats.errors.length > 0) {
            console.log('\nERRORS:');
            console.log('-'.repeat(40));
            this.stats.errors.forEach(error => {
                console.log(`❌ [${error.phase}] ${error.message}`);
            });
        }
        
        if (this.stats.warnings.length > 0) {
            console.log('\nWARNINGS:');
            console.log('-'.repeat(40));
            this.stats.warnings.forEach(warning => {
                console.log(`⚠️  [${warning.phase}] ${warning.message}`);
            });
        }
        
        // Success determination
        const completedPhases = Object.values(this.stats.phases).filter(p => p.status === 'completed').length;
        const totalEnabledPhases = Object.values(PIPELINE_CONFIG.phases).filter(p => p.enabled).length;
        
        console.log('\n' + '='.repeat(80));
        if (completedPhases === totalEnabledPhases && this.stats.errors.length === 0) {
            console.log('🎉 PIPELINE COMPLETED SUCCESSFULLY!');
        } else if (completedPhases > 0) {
            console.log('⚠️  PIPELINE COMPLETED WITH SOME ISSUES');
        } else {
            console.log('❌ PIPELINE FAILED');
        }
        console.log('='.repeat(80) + '\n');
    }

    async run() {
        try {
            await this.initialize();
            
            // Save initial state
            await this.saveState();
            
            let overallSuccess = true;
            
            // Phase 1: Rankings
            console.log('🚀 Starting Phase 1: App Rankings...\n');
            const ranksSuccess = await this.runPhaseRanks();
            await this.saveState();
            
            if (ranksSuccess || !PIPELINE_CONFIG.validation.strictMode) {
                await this.waitBetweenPhases('ranks', 'metadata');
                
                // Phase 2: Metadata
                console.log('🚀 Starting Phase 2: App Metadata...\n');
                const metadataSuccess = await this.runPhaseMetadata();
                await this.saveState();
                
                if (metadataSuccess || !PIPELINE_CONFIG.validation.strictMode) {
                    await this.waitBetweenPhases('metadata', 'reviews');
                    
                    // Phase 3: Reviews
                    console.log('🚀 Starting Phase 3: App Reviews...\n');
                    const reviewsSuccess = await this.runPhaseReviews();
                    await this.saveState();
                    
                    overallSuccess = ranksSuccess && metadataSuccess && reviewsSuccess;
                } else {
                    overallSuccess = false;
                }
            } else {
                overallSuccess = false;
            }
            
            await this.displayFinalSummary();
            
            // Exit with appropriate code
            process.exit(overallSuccess ? 0 : 1);
            
        } catch (error) {
            this.addError(`Pipeline failed: ${error.message}`);
            console.error('\n💥 PIPELINE FATAL ERROR:', error);
            
            await this.saveState();
            await this.displayFinalSummary();
            
            process.exit(1);
        }
    }
}

// CLI interface
function showUsage() {
    console.log(`
Google Play Scraper - Master Pipeline

Usage: node master-pipeline.js [options]

Options:
  --ranks-only          Run only the rankings phase
  --metadata-only       Run only the metadata phase  
  --reviews-only        Run only the reviews phase
  --skip-ranks          Skip rankings phase
  --skip-metadata       Skip metadata phase
  --skip-reviews        Skip reviews phase
  --strict             Enable strict mode (fail on any error)
  --monitor            Enable real-time monitoring
  --help               Show this help message

Environment Variables:
  ENABLE_RANKS=true|false          Enable/disable ranks phase
  ENABLE_METADATA=true|false       Enable/disable metadata phase
  ENABLE_REVIEWS=true|false        Enable/disable reviews phase
  STRICT_MODE=true|false           Enable strict mode
  MAX_CONCURRENT=15                Max concurrent review scrapers
  PHASE_DELAY=30000                Delay between phases (ms)
  AUTO_CLEANUP=true|false          Auto cleanup duplicates
  ENABLE_MONITORING=true|false     Enable progress monitoring

Examples:
  node master-pipeline.js                    # Run full pipeline
  node master-pipeline.js --ranks-only       # Only scrape rankings
  node master-pipeline.js --skip-ranks       # Skip rankings, run metadata + reviews
  STRICT_MODE=true node master-pipeline.js   # Run with strict error handling
`);
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        showUsage();
        process.exit(0);
    }
    
    // Handle phase-specific runs
    if (args.includes('--ranks-only')) {
        process.env.ENABLE_RANKS = 'true';
        process.env.ENABLE_METADATA = 'false';
        process.env.ENABLE_REVIEWS = 'false';
    }
    
    if (args.includes('--metadata-only')) {
        process.env.ENABLE_RANKS = 'false';
        process.env.ENABLE_METADATA = 'true';
        process.env.ENABLE_REVIEWS = 'false';
    }
    
    if (args.includes('--reviews-only')) {
        process.env.ENABLE_RANKS = 'false';
        process.env.ENABLE_METADATA = 'false';
        process.env.ENABLE_REVIEWS = 'true';
    }
    
    // Handle skip options
    if (args.includes('--skip-ranks')) {
        process.env.ENABLE_RANKS = 'false';
    }
    
    if (args.includes('--skip-metadata')) {
        process.env.ENABLE_METADATA = 'false';
    }
    
    if (args.includes('--skip-reviews')) {
        process.env.ENABLE_REVIEWS = 'false';
    }
    
    // Handle other options
    if (args.includes('--strict')) {
        process.env.STRICT_MODE = 'true';
    }
    
    if (args.includes('--monitor')) {
        process.env.ENABLE_MONITORING = 'true';
    }
}

// Main execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
    parseArgs();
    
    const pipeline = new MasterPipeline();
    pipeline.run().catch(console.error);
}

export { MasterPipeline, PIPELINE_CONFIG };