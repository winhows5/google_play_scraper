# google_play_scraper
Personal scraper used to collect data for research.


### Functionality 

- **rank.js** is meant to get top100 apps from 32 categories.
- **similar.js** is meant to get similar apps from the rank_app list.
- **review.js** is meant to get 3-month reviews from the rank_app list (but only top20). 

### Data Format

1. Rank

  ```
  var rank_template = {
      "app_id": "",
      "app_name": "",
      "app_page_url": "",
      "source": "stratified/snowball",
      "source_app": "stratified / [list of apps]",
      "rank_at_souce": 0,
      "rank_method": "Top Free",
      "category": "",
      "request_date": "2022-11-12"
  }
  ```

2. Review

```
var review_template = {
    "app_id": "",
    "app_name": "",
    "country": "US",
    "language": "us",
    "post_date": "2013-11-10T18:31:42.174Z",
    "review_id": "",
    "user_name": "",
    "user_image": "",
    "score": 0,
    "review_title": "",
    "review_text": "A JSON object",
    "is_replied": 0,
    "reply_date": "2013-11-10T18:31:42.174Z",
    "reply_text": "A JSON object",
    "app_version": "",
    "thumbsup": 0,
    "url": "",
    "criterias": "[]",
}
```

3. Review Stat

```
var review_stat_template = {
    "app_id": "",
    "app_name": "",
    "category": "",
    "category_rank": 1.0,
    "review_amounts": 0,
    "last_review_date": "2013-11-10T18:31:42.174Z",
    "first_review_date": "2013-11-10T18:31:42.174Z",
    "scrape_date": "2013-11-10T18:31:42.174Z",
}
```

### Stipulation

1. JSON field

  The text fields such as "review_text", "reply_text", and "description" are generated as a JSON object:
  ```
  {
      "text": "Any string",
  }
  ```

  As the text fields could contain a bunch of illegal characters.
  
### Incoherence

Some apps are inaccessible due to reasons, which may cause incoherence between different lists. Take care when dealing with such apps:

| App Name                                   | App ID                                       | Date of awareness |
| -----------                                | -----------                                  | -----------       |
| Anime tv - Anime Tv Online HD              | com.animetv.animetvonline.us2002             | 2023-01-02        |
| Anime tv - Anime Watching App              | com.animetv.sub.dub                          | 2023-01-02        |
| Live yassine tv apk ياسين تيفي             | apk.yacinetv.yacinetvapk                     | 2023-01-02        |



