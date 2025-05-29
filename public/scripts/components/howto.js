import JML from "../utils/jml.js";
const { h } = JML();

const HowtoComponent = () => {
    return h("section", { class: "howto subsection subsection--info" }, [
        h("h2", { class: "menu-title" }, "How to use this tool"),
        h("ul", { class: "howto-list" }, [
            h("li", {}, "Configure your server settings in the sidebar."),
            h("li", {}, "Upload your server configuration file."),
            h("li", {}, "Visualize the server performance metrics."),
        ]),
    ]);
};

export default HowtoComponent;