module.exports.category_list = [
    "ART_AND_DESIGN",
    "AUTO_AND_VEHICLES",
    "BEAUTY",
    "BOOKS_AND_REFERENCE",
    "BUSINESS",
    "COMICS",
    "COMMUNICATION",
    "DATING",
    "EDUCATION",
    "ENTERTAINMENT",
    "EVENTS",
    "FINANCE",
    "FOOD_AND_DRINK",
    "HEALTH_AND_FITNESS",
    "HOUSE_AND_HOME",
    "LIBRARIES_AND_DEMO",
    "LIFESTYLE",
    "MAPS_AND_NAVIGATION",
    "MEDICAL",
    "MUSIC_AND_AUDIO",
    "NEWS_AND_MAGAZINES",
    "PARENTING",
    "PERSONALIZATION",
    "PHOTOGRAPHY",
    "PRODUCTIVITY",
    "SHOPPING",
    "SOCIAL",
    "SPORTS",
    "TOOLS",
    "TRAVEL_AND_LOCAL",
    "VIDEO_PLAYERS",
    "WEATHER"
]

module.exports.country_list = [
    "US",
    "IN",
    "HK",
]

var dict_template = {
    "app_id": 0,
    "app_name": 0,
    "app_page_url": 0,
    "source": "stratified",
    "source_app": "stratified",
    "rank_at_souce": 0,
    "rank_method": "Top Free",
    "category": 0,
    "request_date": "2022-11-12"
}

var retry_template = {
    "cat_num": 0,
    "app_id": 0,
    "request_date": "2022-11-12",
    "app_page_url": 0,
}

var review_template = {
    "app_id": 0,
    "app_name": 0,
    "country": "US",
    "language": "us",
    "post_date": "2013-11-10T18:31:42.174Z",
    "review_id": 0,
    "user_name": "",
    "score": 0,
    "review_title": "",
    "review_text": "",
    "is_replied": 0,
    "reply_date": "2013-11-10T18:31:42.174Z",
    "reply_text": "",
    "app_version": "",
    "thumbsup": 0,
    "url": "",
}

module.exports.dict_keys = Object.keys(dict_template);
module.exports.retry_keys = Object.keys(retry_template);
module.exports.review_keys = Object.keys(review_template);
