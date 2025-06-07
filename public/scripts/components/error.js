import GlobalEvent from "../utils/event.js";
import JML from "../utils/jml.js";

const { h, render } = JML();

let errorBox = null;

const ErrorComponent = () => {
  GlobalEvent.on("error", (message) => {
    updateErrorBox(message);
  });

  errorBox = h("div", { class: "page-error", id: "error-box" }, []);
  const updateErrorBox = (message) => {
    const html = h("div", { class: "error-message" }, [
      h("div", {}, message),
      h("div", { class: "close-btn", onClick: (e) => {
        errorBox.el.innerHTML = "";
      }}, "")
    ]);
    errorBox.el.innerHTML = "";
    render(errorBox.el, html);
  };
  return errorBox;
};

export default ErrorComponent;
