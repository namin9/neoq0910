# Proto Route Prototype

This project demonstrates the Cloudflare Pages + Workers proxy that forwards browser
requests to NAVER Maps (geocode, directions, static map) for the proto.neoqik.com
prototype.

## Required NAVER Cloud configuration

Error `401` / `errorCode 210 (Permission Denied)` is returned directly by NAVER when
the application key exists but is **not subscribed** to the requested API product.
To avoid this:

1. Log in to [NAVER Cloud Platform](https://console.ncloud.com/).
2. Open **AI·NAVER API** → **Application** and select the application that issued the
   `Client ID` / `Client Secret` stored in Cloudflare.
3. In the **Service settings** section, ensure the application is subscribed to **all**
   of the following products:
   - Maps Geocode (`map-geocode`)
   - Maps Directions (`map-direction`)
   - Maps Static Map (`map-static`)
4. If you add a missing subscription or regenerate keys, redeploy the Cloudflare Pages
   project so the updated secrets propagate.

## Configuring Cloudflare Pages secrets

Add the secrets under **Pages → Settings → Environment Variables**:

| Variable name         | Value (example)            |
|-----------------------|----------------------------|
| `NAVER_CLIENT_ID`     | `xyc09n19g1`               |
| `NAVER_CLIENT_SECRET` | `SGIrYvxzuARpoSfSRMPaUyFS...` |

> The secrets are trimmed in the worker code; no extra quoting is required. The build
> uses the same values for both preview and production deployments.

Redeploy after every change to the secrets or the NAVER subscriptions.

## Built-in diagnostics

The Pages Functions include helper endpoints that let you verify which values are
available at runtime and what NAVER returns.

- `https://<domain>/api/_envcheck`
  - Returns the length/prefix of the secrets so you can confirm that the deployment
    picked up the expected keys.
- `https://<domain>/api/_diag?target=geocode`
  - Proxies the request to NAVER and echoes the status, headers, and body that NAVER
    responded with (secrets are masked). Replace `target` with `static` or `directions`
    to test the other products.

If `_envcheck` shows the right key prefixes but `_diag` still reports `errorCode 210`,
solve it inside NAVER Cloud Console—usually by adding the missing subscription or by
ensuring the request domain is allowed for the application.

## Local development

```bash
npm install
npm run dev
```

The API routes run in the Cloudflare environment; to test them locally you can deploy
with `wrangler pages dev` or call the production diagnostic endpoints listed above.
