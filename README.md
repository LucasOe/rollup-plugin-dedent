# rollup-plugin-dedent

A Rollup plugin to dedent multi-line string during build time.

## Install

```bash
npm install rollup-plugin-dedent --save-dev
```

## Usage

Create a `rollup.config.js` [configuration file](https://rollupjs.org/command-line-interface/#configuration-files), or add it to your `vite.config.js`, and import the plugin:

```js
// rollup.config.js
import { dedentPlugin } from "rollup-plugin-dedent";

export default {
	// ...
	plugins: [dedentPlugin()],
};
```

```js
// vite.config.js;
import { defineConfig } from "vite";
import { dedentPlugin } from "rollup-plugin-dedent";

export default defineConfig({
	// ...
	plugins: [dedentPlugin()],
});
```

```js
import dedent from "rollup-plugin-dedent";

function usageExample() {
	const first = dedent`A string that gets so long you need to break it over
                       multiple lines. Luckily dedent is here to keep it
                       readable without lots of spaces ending up in the string
                       itself.`;
}

console.log(usageExample());
```

## License

MIT
