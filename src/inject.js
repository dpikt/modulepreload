import fs from "node:fs";
import url from "node:url";
import { parse } from "es-module-lexer";
import { Parser } from "htmlparser2";
import { resolve, parseFromString } from '@import-maps/resolve'

async function getImports(script) {
  const [imports] = await parse(script);
  return imports.map((imp) => imp.n);
}

class ImportCollector {
  constructor({ imports, baseUrl, importMap, noFetch }) {
    this.imports = imports;
    this.baseUrl = baseUrl;
    this.dependencies = new Set();
    this.noFetch = noFetch
    this.importMap = importMap
  }
  async visit(specifier, parent) {
    let resolvedImport = null
    if (parent.protocol === "file:") {
      const resolved = resolve(specifier, this.importMap, parent);
      resolvedImport = resolved.resolvedImport
      if (specifier.startsWith('/')) {
        resolvedImport = new URL('.' + specifier, this.baseUrl)
      }
    } else if (parent.protocol.startsWith("http")) {
      resolvedImport = new URL(specifier, parent.origin)
    }
    if (!resolvedImport) {
      throw 'could not resolve import: ' + specifier
    };
    if (this.dependencies.has(resolvedImport.href)) return;
    this.dependencies.add(resolvedImport.href);
    if (resolvedImport.protocol === "file:") {
      try {
        const contents = await fs.promises.readFile(resolvedImport, "utf8");
        const deps = await getImports(contents);
        await Promise.all(
          deps.map((dep) => this.visit(dep, resolvedImport))
        );
      } catch (e) {
        console.warn('WARNING: could not read file: ' + resolvedImport.href + ' - skipping')
      }
    } else if (resolvedImport.protocol.startsWith("http")) {
      if (!this.noFetch) {
        const contents = await fetch(resolvedImport).then(res => res.text())
        const deps = await getImports(contents);
        await Promise.all(
          deps.map((dep) => this.visit(dep, resolvedImport))
        );
      }
    }
  }
  async collect() {
    const parent = new URL('./index.js', this.baseUrl)
    await Promise.all(this.imports.map((entry) => this.visit(entry, parent)));
    return [...this.dependencies].map((dep) => dep.replace(this.baseUrl.href, "/"));
  }
}

async function parseHtml(contents) {
  const scripts = [];
  let inScript = false;
  let inImportMap = false;
  let importMapString = ""
  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === "script" && attributes.type === "module") {
        inScript = true;
        scripts.unshift("");
      }
      if (name === "script" && attributes.type === "importmap") {
        inImportMap = true;
      }
    },
    ontext(text) {
      if (inScript) {
        scripts[0] += text;
      }
      if (inImportMap) {
        importMapString += text;
      }
    },
    onclosetag(tagname) {
      if (tagname === "script") {
        inScript = false;
        inImportMap = false;
      }
    },
  });
  parser.write(contents);
  parser.end();
  const imports = new Set()
  for (let script of scripts) {
    const deps = await getImports(script);
    deps.forEach((d) => imports.add(d));
  }
  return { imports: [...imports], importMapString: importMapString || '{}' };
}

export async function getDependencies(contents, baseUrl, { noFetch } = {}) {
  if (!baseUrl) {
    throw new Error('baseUrl is required')
  }
  if (!baseUrl.href.endsWith('/')) {
    baseUrl.href += '/'
  }
  const { importMapString, imports } = await parseHtml(contents);
  const importMap = parseFromString(importMapString, baseUrl);
  const collector = new ImportCollector({ imports, baseUrl, importMap, noFetch });
  return collector.collect();
}

export function injectPreloads(contents, dependencies) {
  let preloads = "";
  for (const dep of dependencies) {
    preloads += `<link rel="modulepreload" href="${dep}" />\n`;
  }
  return contents.replace("</head>", `${preloads}</head>`);
}

export async function link(htmlContentsOrUrl, { baseUrl: providedBaseUrl, noFetch } = {}) {
  let html = htmlContentsOrUrl;
  let baseUrl = providedBaseUrl;
  if (htmlContentsOrUrl instanceof URL) {
    html = await fs.promises.readFile(htmlContentsOrUrl, "utf8");
    baseUrl = new URL('./', htmlContentsOrUrl)
  }
  const dependencies = await getDependencies(html, baseUrl, { noFetch });
  return injectPreloads(html, dependencies);
}

export async function inject(htmlPath, { out, root, noFetch } = {}) {
  const htmlUrl = url.pathToFileURL(htmlPath)
  const baseUrl = root ? new URL(root) : null
  const newHtml = await link(htmlUrl, { baseUrl, noFetch })
  if (out) {
    await fs.promises.writeFile(out, newHtml);
  } else {
    process.stdout.write(newHtml)
  }
}
