# Google Play Scraper - Master Pipeline

A comprehensive scraping system that collects app rankings, metadata, and reviews from Google Play Store in a structured, sequential pipeline.

## 🚀 Quick Start

### Run the Complete Pipeline
```bash
# Run everything: rankings → metadata → reviews
npm start

# Or with monitoring
npm run start:monitor
```

### Run Individual Phases
```bash
# Only scrape rankings
npm run start:ranks

# Only scrape metadata  
npm run start:metadata

# Only scrape reviews
npm run start:reviews
```

## 📋 Pipeline Overview

The master pipeline runs in **3 sequential phases**:

1. **📊 Rankings Phase** - Scrapes top 50 apps from each of 32 categories
2. **📝 Metadata Phase** - Collects detailed app information for all discovered apps  
3. **💬 Reviews Phase** - Scrapes up to 5,000 reviews per app using intelligent orchestration

### Key Features

- ✅ **Sequential execution** with validation between phases
- ✅ **Automatic duplicate detection** and cleanup
- ✅ **Intelligent rate limiting** and resource management
- ✅ **Resume capability** - pipeline can be stopped and resumed
- ✅ **Real-time monitoring** and progress tracking
- ✅ **Configurable concurrency** and error handling
- ✅ **Database constraints** to prevent duplicate data

## 🛠️ Setup

### 1. Environment Configuration

Create a `.env` file:

```bash
# Required - Supabase configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Optional - Pipeline configuration
MAX_CONCURRENT=15              # Max concurrent review scrapers
SCRAPE_DELAY=2000             # Delay between requests (ms)
STRICT_MODE=false             # Fail pipeline on any error
PHASE_DELAY=30000             # Delay between phases (ms)
AUTO_CLEANUP=true             # Auto cleanup duplicates
ENABLE_MONITORING=true        # Real-time progress monitoring

# Phase control
ENABLE_RANKS=true             # Enable rankings phase
ENABLE_METADATA=true          # Enable metadata phase  
ENABLE_REVIEWS=true           # Enable reviews phase
```

### 2. Database Setup

Run the database setup script in your Supabase SQL editor:

```bash
# Copy and run the contents of fix-duplicates.sql
```

This creates:
- Database functions for efficient queries
- Constraints to prevent duplicates
- Views for progress tracking

### 3. Install Dependencies

```bash
npm install
```

## 📊 Usage Examples

### Complete Pipeline (Recommended)
```bash
# Run the full pipeline with monitoring
npm run start:monitor

# Run with strict error handling
npm run start:strict

# Run with custom settings
MAX_CONCURRENT=20 STRICT_MODE=true npm start
```

### Partial Runs
```bash
# Skip rankings if you already have app data
node master-pipeline.js --skip-ranks

# Only get metadata for existing apps
node master-pipeline.js --metadata-only

# Resume reviews after interruption
node master-pipeline.js --reviews-only
```

### Monitoring & Maintenance
```bash
# Monitor progress in real-time
npm run monitor

# Clean up duplicate reviews
npm run cleanup

# Validate data integrity
npm run validate
```

## 🔧 Advanced Configuration

### Pipeline Phases

Each phase can be controlled independently:

```bash
# Environment variables
ENABLE_RANKS=false           # Skip rankings
ENABLE_METADATA=false        # Skip metadata
ENABLE_REVIEWS=false         # Skip reviews

# Command line flags
--ranks-only                 # Run only rankings
--skip-reviews              # Skip reviews phase
--strict                    # Enable strict mode
```

### Performance Tuning

```bash
# High-performance setup (good resources)
MAX_CONCURRENT=25
SCRAPE_DELAY=1000
PHASE_DELAY=10000

# Conservative setup (limited resources)
MAX_CONCURRENT=5
SCRAPE_DELAY=5000
PHASE_DELAY=60000
```

### Error Handling

```bash
# Strict mode - fail on any error
STRICT_MODE=true npm start

# Lenient mode - continue despite errors (default)
STRICT_MODE=false npm start
```

## 📈 Monitoring

### Real-time Progress Monitor

```bash
npm run monitor
```

Shows:
- Overall progress across all phases
- Category completion percentages
- Apps with excessive/insufficient reviews
- Resource usage stats

### Pipeline Status

The master pipeline displays:
- Phase-by-phase progress
- Resource usage warnings
- Error and warning summaries
- Final completion statistics

## 🗄️ Database Schema

### Tables Created
- `app_ranks` - App ranking data by category
- `app_meta` - Detailed app metadata
- `app_reviews` - User reviews (up to 5k per app)

### Key Views
- `apps_needing_reviews` - Apps that need more reviews
- Progress tracking functions

## 🔍 Troubleshooting

### Common Issues

**Pipeline stops unexpectedly:**
```bash
# Check logs
tail -f logs/master-pipeline-state.json

# Resume from where it stopped
npm start
```

**Memory issues:**
```bash
# Reduce concurrent scrapers
MAX_CONCURRENT=5 npm start

# Use cleanup to free space
npm run cleanup
```

**Rate limiting:**
```bash
# Increase delays
SCRAPE_DELAY=5000 npm start
```

**Database connection issues:**
```bash
# Check your Supabase credentials in .env
# Ensure your database has sufficient connection limits
```

### Performance Optimization

1. **Resource Recommendations:**
   - 4+ CPU cores
   - 8+ GB RAM  
   - SSD storage for logs
   - Supabase Pro plan (60+ connections)

2. **Optimal Settings:**
   ```bash
   MAX_CONCURRENT=15-20        # For good hardware
   SCRAPE_DELAY=1000-2000     # Balance speed vs stability
   ```

## 📝 Logs & State Management

### Log Files
- `logs/master-pipeline-state.json` - Pipeline state and progress
- `logs/scrape-{category}-{date}.log` - Per-category scraping logs
- `logs/orchestrator-state.json` - Review orchestrator state

### Resume Capability
The pipeline automatically saves state and can resume from interruptions:
- Completed phases are skipped
- Partial progress is maintained
- Failed categories can be retried

## 🎯 Expected Results

### Full Pipeline Output
- **Rankings:** ~1,600 apps (50 per category × 32 categories)
- **Metadata:** Complete app details for all discovered apps
- **Reviews:** Up to 5,000 reviews per app (~8M reviews total)

### Timing Estimates
- **Rankings:** 30-60 minutes
- **Metadata:** 2-4 hours  
- **Reviews:** 12-24 hours (depending on concurrency)

## 🔄 CLI Reference

```bash
# Basic usage
node master-pipeline.js [options]

# Options
--ranks-only          # Run only rankings phase
--metadata-only       # Run only metadata phase
--reviews-only        # Run only reviews phase
--skip-ranks          # Skip rankings phase
--skip-metadata       # Skip metadata phase  
--skip-reviews        # Skip reviews phase
--strict             # Enable strict mode
--monitor            # Enable real-time monitoring
--help               # Show help message

# NPM Scripts
npm start             # Full pipeline
npm run start:ranks   # Rankings only
npm run start:metadata # Metadata only
npm run start:reviews # Reviews only
npm run start:strict  # Strict mode
npm run start:monitor # With monitoring
npm run cleanup       # Clean duplicates
npm run monitor       # Progress monitor
npm run validate      # Data validation
npm run help          # Show help
```

## 🎉 Success Indicators

The pipeline is successful when:
- ✅ All enabled phases complete
- ✅ No critical errors in logs
- ✅ Expected data volumes achieved
- ✅ Database constraints maintained
- ✅ Final summary shows "PIPELINE COMPLETED SUCCESSFULLY"

Monitor the real-time progress to ensure everything is working correctly!