import { Plugin } from "@opencode/plugin"
import { register } from "./titles.mjs"

export default Plugin.define({ id: "opencode-ticketing.titles", setup: register })
