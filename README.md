# neoq0910

## Environment variables

The serverless functions rely on several third-party map providers. Set the following variables in your deployment environment:

- `KAKAO_REST_KEY` – Kakao Local REST API key used for keyword and address search.
- `NAVER_SEARCH_CLIENT_ID` / `NAVER_SEARCH_CLIENT_SECRET` – credentials for the Naver Local Search API.
- `NAVER_GEOCODE_KEY_ID` / `NAVER_GEOCODE_KEY` – Naver Cloud Platform Map Geocode API credentials used to turn addresses into coordinates.
- `MAPBOX_TOKEN` – Mapbox access token for geocoding fallbacks.