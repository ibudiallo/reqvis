// This is the main entry point for the application.
import { initRouter } from "./router.js";

const App = (() => {
  const init = () => {
    initRouter();
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
  App.init(); // Initialize the application
});

