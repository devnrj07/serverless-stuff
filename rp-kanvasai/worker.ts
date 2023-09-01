/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;
}
//const CORRESPONDING_PATHNAME = ['blogs', 'projects', 'play'];

const ROOT_DOMAIN = "kanvasai.com"; // represents @ CNAME record
const SUBDOMAINS = ["medium", "devto"]; // respresents `medium` & `devto` CNAME records
const MAIN_SUBDOMAIN = "main"; // respresent our main website CNAME record
const MAIN_URL = `https://${ROOT_DOMAIN}`;

const hasTrailingSlash = (str: string) => /\/$/.test(str);

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext
  ): Promise<Response> {
    console.log(":request", request);
    console.log("env::", env);
    console.log("::ctx", context);

    const requestUrl = new URL(request.url);
    const { hostname, pathname, search, hash } = requestUrl;
    console.log("Intercepted by worker function", {
      pathname,
      hostname,
      search,
      hash,
    });

    if (hostname !== ROOT_DOMAIN) {
      const matchedSubDomain = SUBDOMAINS.find(
        (subdomain) => subdomain === hostname.split(".")[0]
      );
      if (matchedSubDomain) {
        //redirect to webflow subdirectory
        const redirect_url = `${MAIN_URL}/${matchedSubDomain}${pathname}${search}`;
        return Response.redirect(redirect_url, 301);
      }

      if (hostname.startsWith(MAIN_SUBDOMAIN)) {
        //redirect to root domain
        const redirect_url = `${MAIN_URL}${pathname}${search}`;
        return Response.redirect(redirect_url, 301);
      }

      //handle non-matched subdomains cdn.example.com/abc (diff one)
      console.log("subdomain did not match ::", requestUrl);
      return fetch(request.url);
    }

    //handle trailing `/` in pathname
    const paths = pathname.split("/").filter(Boolean);
    if (paths.length && hasTrailingSlash(pathname)) {
      const redirect_url = `${MAIN_URL}/${paths.join("/")}${search}`;

      return Response.redirect(redirect_url, 301);
    }

    //path matches reverse proxy subdomain
    //https://kanvasai.com/medium/about?query=yes -> https://medium.kanvasai.com/about?query=yes
    const matchedSubRoute = SUBDOMAINS.find(
      (subdomain) => subdomain === paths[0]
    );
    if (matchedSubRoute) {
      const redirect_url = `https://${matchedSubRoute}.${ROOT_DOMAIN}/${paths
        .slice(1)
        .join("/")}${search}`;
      const response = await fetch(redirect_url);
      //handle 301 from actual site if defined any (webflow)
      if (response.redirected && response.url.length) {
        return Response.redirect(response.url, 301);
      }
      return response;
    }

    //no subdomain, no trailing slash, no subroute
    //https://kanvasai.com/about?query=yes -> https://main.kanvasai.com/about?query=yes (fetch from main site)
    const fetch_url = `https://${MAIN_SUBDOMAIN}.${ROOT_DOMAIN}${pathname}${search}`;
    const response = await fetch(fetch_url);
    //handle 301 from actual site (webflow)
    if (response.redirected && response.url.length) {
      return Response.redirect(response.url, 301);
    }
    return response;
  },
};
