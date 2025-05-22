import GlobalEvent from "../utils/event.js";
import JML from "../utils/jml.js";
import * as Util from "../utils/index.js";

const { h } = JML();

const SideBar = (children) => {
  let el = null;
  GlobalEvent.on("fileUploaded", () => {
    el.classList.add("hide");
    Util.timer(() => {
      el.classList.add("hidden");
    }, .3);
  });

  return h("section", { class: "sidebar", onCreate: (e) => (el = e.target) }, [
    h("div", { class: "sidebar-content" }, children),
  ]);
};

export default SideBar;