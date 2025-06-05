import GlobalEvent from "../utils/event.js";
import JML from "../utils/jml.js";
import * as Util from "../utils/index.js";

const { h } = JML();

const SideBar = (children) => {
  let el = null;
  GlobalEvent.on("fileUploaded", () => {
    Util.wait(0)
      .then((wait) => {
        el.classList.add("hide");
        return wait(0.3);
      })
      .then((wait) => {
        el.classList.add("hidden");
      });
  });
  GlobalEvent.on("resetVisualization", () => {
    el.classList.remove("hidden");
    Util.wait(0)
      .then((wait) => {
        el.classList.remove("hidden");
        return wait(0.1);
      })
      .then((wait) => {
        el.classList.remove("hide");
      });
  });

  return h("section", { class: "sidebar", onCreate: (e) => {
    el = e.target;
    Util.timer(()=> {
      el.style.setProperty("--var-height", `${el.offsetHeight}px`);
    }, .1);
  } }, [
    h("div", { class: "sidebar-content" }, children),
  ]);
};

export default SideBar;
