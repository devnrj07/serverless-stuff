const ROOT_DOMAIN = "nrj.life";
const SUBDOMAINS = ["two", "three"];
const WEBFLOW_SUBDOMAIN = "one";
const BASE_URL = `https://${ROOT_DOMAIN}`; // i.e. https://example.com/blog

const statusCode = 301;

//fetchMainWebsite
//handleRedirects

export default async function handleRequest(request) {
  const url = new URL(request.url);
  const { pathname, hostname, search, hash } = url;
  console.log(
    "Intercepted by edge function : netlify/edge-functions/index.js",
    { pathname, hostname, search, hash }
  );

  if (hostname === ROOT_DOMAIN && pathname === "/") {
    console.log("first if");
    //return main website
    const fetch_url = `https://${WEBFLOW_SUBDOMAIN}.${ROOT_DOMAIN}`;
    console.log("Redirecting to root domain", { fetch_url });
    const response = await fetch(fetch_url);
    console.log("Response from fetch", { response });
    return response;
  }

  //get main website/webflow subdomain
  if (!hostname.includes(ROOT_DOMAIN)) {
    console.log("second if", { hostname, pathname });
    const fetch_url = `https://${WEBFLOW_SUBDOMAIN}.${ROOT_DOMAIN}${pathname}${search}`;
    console.log("Redirecting to root domain", { fetch_url });
    const response = await fetch(fetch_url);

    //handle 301 from actual site (webflow)
    if (response.redirected && response.url.length) {
      return Response.redirect(response.url, 301);
    }
    return response;
  } else {
    //contains root domain
    console.log("second else", {
      hostname,
      pathname,
      subdomain: hostname.split(".")[0],
    });

    const paths = pathname.split("/").filter(Boolean);

    //step 1 : check if subdomain matches any of the subdomains
    const matchedSubDomain = SUBDOMAINS.find(
      (subdomain) => subdomain === hostname.split(".")[0]
    );
    console.log("SUBDOMAIN MAthced", matchedSubDomain);

    if (matchedSubDomain) {
      //redirect to webflow subdirectory
      //const redirect_url = `${BASE_URL}/${matchedSubDomain}${pathname}${search}${hash}`;
      const redirect_url = `https://${matchedSubDomain}.${ROOT_DOMAIN}${pathname}${search}${hash}`;
      const response = await fetch(redirect_url);
      return Response.redirect(redirect_url, 301);
    }

    const matchedSubRoute = SUBDOMAINS.find(
      (subdomain) => subdomain === paths[0]
    );
    console.log("SUBROUTE MAthced", matchedSubRoute);
    if (matchedSubRoute) {
      console.log("third if", { hostname, pathname, paths });
      const redirect_url = `https://${matchedSubRoute}.${ROOT_DOMAIN}/${paths
        .slice(1)
        .join("/")}${search}`;
      const response = await fetch(redirect_url);
      //handle 301 from actual site (webflow)
      if (response.redirected && response.url.length) {
        return Response.redirect(response.url, 301);
      }
      return response;
    }

    //step 2 : check if webflow subdomain(main website) is present
    if (hostname.startsWith(WEBFLOW_SUBDOMAIN)) {
      console.log("fourth if", { hostname, pathname, paths });
      //redirect to root domain TODO: check if this is working because root domain is point to edge function
      const redirect_url = `${BASE_URL}${pathname}${search}`;
      return Response.redirect(redirect_url, 301);
    }

    //step 3 : handle non-matched subdomains cdn.example.com/abc (diff one)
    return fetch(request.url);
  }

  //handle trailing `/` in pathname
  //path matches reverse proxy subdomain
  //https://nrj.life/two/about?query=yes -> https://two.nrj.life/about?query=yes
  //no subdomain, no trailing slash, no subroute
  //https://nrj.life/about?query=yes -> https://one.nrj.life/about?query=yes (fetch from main site)

  const isNetlifyReq = request.headers.get("x-nf-site-id"); // Check If Request Is From Netlify

  /*  if (!isNetlifyReq) {
    // If Not Netlify Request, Redirect To Base URL

    if (hostname !== ROOT_DOMAIN) {
      const { pathname, search, hash } = url;

      const matchedSubDomain = SUBDOMAINS.find(
        (subdomain) => subdomain === hostname.split(".")[0]
      );
      console.log("SUBDOMAIN MAthced", matchedSubDomain);
      if (matchedSubDomain) {
        //redirect to webflow subdirectory
        const redirect_url = `${BASE_URL}/${matchedSubDomain}${pathname}${search}${hash}`;
        return Response.redirect(redirect_url, 301);
      }

      if (hostname.startsWith(WEBFLOW_SUBDOMAIN)) {
        //redirect to root domain
        const redirect_url = `${BASE_URL}${pathname}${search}`;
        return Response.redirect(redirect_url, 301);
      }

      //handle non-matched subdomains cdn.example.com/abc (diff one)
      return fetch(request.url);

      /*  let destinationURL = BASE_URL + pathname + search + hash;

      destinationURL = destinationURL.endsWith("/")
        ? destinationURL.slice(0, -1)
        : destinationURL; // Remove Trailing Slash (If Exists)

      return Response.redirect(destinationURL, statusCode); 
    }
  } else {
    // If Netlify Request, Return Response

    const response = await fetch(url);

    return response;
  } */
}

//==== CF Worker ====
/* const hasTrailingSlash = (str) => /\/$/.test(str);

const ROOT_DOMAIN = "nrj.life";
const SUBDOMAINS = ["two", "three"];
const WEBFLOW_SUBDOMAIN = "one";
const MAIN_URL = `https://${ROOT_DOMAIN}`;

export default async function (request, context) {
  console.log("Request :: Context", { request, context });

  const { origin, hostname, pathname, search, hash } = new URL(request.url);

  const isNetlifyReq = request.headers.get("x-nf-site-id"); // Check If Request Is From Netlify

  console.log("split url values", {
    origin,
    hostname,
    pathname,
    search,
    hash,
    isNetlifyReq,
  });

  if (!isNetlifyReq) {
    if (hostname !== ROOT_DOMAIN) {
      const matchedSubDomain = SUBDOMAINS.find(
        (subdomain) => subdomain === hostname.split(".")[0]
      );
      if (matchedSubDomain) {
        //redirect to webflow subdirectory
        const redirect_url = `${MAIN_URL}/${matchedSubDomain}${pathname}${search}${hash}`;
        return Response.redirect(redirect_url, 301);
      }

      if (hostname.startsWith(WEBFLOW_SUBDOMAIN)) {
        //redirect to root domain
        const redirect_url = `${MAIN_URL}${pathname}${search}`;
        return Response.redirect(redirect_url, 301);
      }

      //handle non-matched subdomains cdn.example.com/abc (diff one)
      return fetch(request.url);
    }

    //handle trailing `/` in pathname
    const paths = pathname.split("/").filter(Boolean);
    if (paths.length && hasTrailingSlash(pathname)) {
      const redirect_url = `${MAIN_URL}/${paths.join("/")}${search}`;

      return Response.redirect(redirect_url, 301);
    }

    //path matches reverse proxy subdomain
    //https://nrj.life/two/about?query=yes -> https://two.nrj.life/about?query=yes
    const matchedSubRoute = SUBDOMAINS.find(
      (subdomain) => subdomain === paths[0]
    );
    if (matchedSubRoute) {
      const redirect_url = `https://${matchedSubRoute}.${ROOT_DOMAIN}/${paths
        .slice(1)
        .join("/")}${search}`;
      const response = await fetch(redirect_url);
      //handle 301 from actual site (webflow)
      if (response.redirected && response.url.length) {
        return Response.redirect(response.url, 301);
      }
      return response;
    }

    //no subdomain, no trailing slash, no subroute
    //https://nrj.life/about?query=yes -> https://one.nrj.life/about?query=yes (fetch from main site)
    const fetch_url = `https://${WEBFLOW_SUBDOMAIN}.${ROOT_DOMAIN}${pathname}${search}`;
    const response = await fetch(fetch_url);
    //handle 301 from actual site (webflow)
    if (response.redirected && response.url.length) {
      return Response.redirect(response.url, 301);
    }
    return response;
  } else {
    // If Netlify Request, Return Response
    const url = new URL(request.url);
    const response = await fetch(url);

    return response;
  }
} */
