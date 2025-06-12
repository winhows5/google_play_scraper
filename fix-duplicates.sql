-- SQL script to fix duplicate review issues and add constraints
-- Run this in your Supabase SQL editor

-- 1. Create a function to get apps with sufficient reviews efficiently
CREATE OR REPLACE FUNCTION get_apps_with_sufficient_reviews(min_reviews INTEGER DEFAULT 5000)
RETURNS TABLE(app_id TEXT, review_count BIGINT)
LANGUAGE SQL
AS $$
    SELECT 
        app_reviews.app_id,
        COUNT(*) as review_count
    FROM app_reviews 
    GROUP BY app_reviews.app_id 
    HAVING COUNT(*) >= min_reviews
    ORDER BY review_count DESC;
$$;

-- 2. Create a function to get distinct app_ids (used by existing code)
CREATE OR REPLACE FUNCTION get_distinct_app_ids()
RETURNS TABLE(app_id TEXT)
LANGUAGE SQL
AS $$
    SELECT DISTINCT app_reviews.app_id
    FROM app_reviews
    ORDER BY app_reviews.app_id;
$$;

-- 3. Add a composite unique constraint to prevent duplicate reviews
-- Note: This will fail if you already have duplicates, so run the cleanup first
ALTER TABLE app_reviews 
ADD CONSTRAINT unique_app_author_content 
UNIQUE (app_id, author_name, review_content, post_date);

-- 4. Create an index for faster lookups by app_id and review count
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id_count 
ON app_reviews(app_id);

-- 5. Create a function to check if an app has reached the review limit
CREATE OR REPLACE FUNCTION app_has_sufficient_reviews(target_app_id TEXT, min_reviews INTEGER DEFAULT 5000)
RETURNS BOOLEAN
LANGUAGE SQL
AS $$
    SELECT EXISTS(
        SELECT 1 
        FROM app_reviews 
        WHERE app_id = target_app_id 
        GROUP BY app_id 
        HAVING COUNT(*) >= min_reviews
    );
$$;

-- 6. Create a view for apps that need more reviews
CREATE OR REPLACE VIEW apps_needing_reviews AS
SELECT 
    ar.app_id,
    ar.category,
    COALESCE(rv.review_count, 0) as current_reviews,
    (5000 - COALESCE(rv.review_count, 0)) as reviews_needed
FROM app_ranks ar
LEFT JOIN (
    SELECT 
        app_id, 
        COUNT(*) as review_count 
    FROM app_reviews 
    GROUP BY app_id
) rv ON ar.app_id = rv.app_id
WHERE COALESCE(rv.review_count, 0) < 5000
ORDER BY rv.review_count ASC NULLS FIRST;

-- 7. Create a function to get category progress
CREATE OR REPLACE FUNCTION get_category_progress()
RETURNS TABLE(
    category TEXT,
    total_apps BIGINT,
    apps_with_reviews BIGINT,
    apps_completed BIGINT,
    completion_percentage NUMERIC
)
LANGUAGE SQL
AS $$
    SELECT 
        ar.category,
        COUNT(DISTINCT ar.app_id) as total_apps,
        COUNT(DISTINCT rv.app_id) as apps_with_reviews,
        COUNT(DISTINCT CASE WHEN rv.review_count >= 5000 THEN rv.app_id END) as apps_completed,
        ROUND(
            (COUNT(DISTINCT CASE WHEN rv.review_count >= 5000 THEN rv.app_id END)::NUMERIC / 
             COUNT(DISTINCT ar.app_id)::NUMERIC) * 100, 
            2
        ) as completion_percentage
    FROM app_ranks ar
    LEFT JOIN (
        SELECT 
            app_id, 
            COUNT(*) as review_count 
        FROM app_reviews 
        GROUP BY app_id
    ) rv ON ar.app_id = rv.app_id
    GROUP BY ar.category
    ORDER BY completion_percentage DESC;
$$;