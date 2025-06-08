import JML from "../utils/jml.js";
const { h } = JML();

const HowtoComponent = () => {
    return h("section", { class: "howto subsection subsection--info" }, [
        h("h2", { class: "menu-title" }, "How to use this tool"),
        h("ul", { class: "howto-list" }, [
            h("li", {}, "Configure your server settings."),
            h("li", {}, "Upload your server logs."),
            h("li", {}, "Visualize the server performance metrics."),
        ]),
        h("p", { class: "disclaimer" }, "Disclaimer: Your files are processed in your browser and never sent to our server.")
    ]);
};

export default HowtoComponent;