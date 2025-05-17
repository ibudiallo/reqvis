import GlobalEvent from "../utils/event.js";
import JML from "../utils/jml.js";

const { h } = JML();

const SideBar = (children) => {
  let el = null;
  GlobalEvent.on("fileUploaded", () => {
    el.style.display = "none";
  });

  return h("section", { class: "sidebar", onCreate: (e) => (el = e.target) }, [
    h("div", { class: "sidebar-content" }, children),
  ]);
};

export default SideBar;