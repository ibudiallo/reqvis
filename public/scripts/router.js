import Home from "./pages/home.js";

const routes = {
  "/index.html": Home,
  "/": Home,
  "/reqvis": Home,
};

const getPage = (url) => {
  const keys = Object.keys(routes);
  for (const key of keys) {
    const escapedPattern = key.replace(/:[^\s/]+/g, "([^\\s/]+)");
    const regex = new RegExp(`^${escapedPattern}$`);
    if (url.match(regex)) {
      return routes[key];
    }
  }
  throw new Error(`No matching pattern found for URL: ${url}`);
};

export const initRouter = () => {
  const path = window.location.pathname;
  const page = getPage(path);
  const run = page || Home; // Default to IndexPage if no route found=
  run.apply(null, [path]); // Call the page function with the path as an argument 
};
