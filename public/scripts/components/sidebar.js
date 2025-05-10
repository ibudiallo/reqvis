import JML from "../utils/jml.js";

const { h, render } = JML();
const SideBar = (children) => {

    let el = null;

    return h("section", { class: "sidebar", onCreate: e => (el = e.target) }, [
        h("div", { class: "sidebar-content" }, children),
    ]);
};

export default SideBar;