/* eslint-disable prefer-const */
import { CodeGenerator, SchemaComposer, Web3ApiProject } from "../lib";
import { intlMsg } from "../lib/intl";
import { fixParameters, resolveManifestPath } from "../lib/helpers";

import chalk from "chalk";
import { GluegunToolbox } from "gluegun";
import { getDefaultProviders } from "../lib/helpers/client";
import { validateCodegenParams } from "./codegen";

export const htmlGenerationFile =
  __dirname + "/../lib/docgen/html/html-doc.gen.js";
export const jsdocGenerationFile =
  __dirname + "/../lib/docgen/jsdoc.gen.js";
export const docusaurusGenerationFile =
  __dirname + "/../lib/docgen/docusaurus/docusaurus.gen.js";
export const defaultGenerationFile = htmlGenerationFile;
export const defaultManifest = ["web3api.yaml", "web3api.yml"];
const defaultOutputDir = "docs";

const genFileOp = "doc-format";
const optionsStr = intlMsg.commands_options_options();
const nodeStr = intlMsg.commands_codegen_options_i_node();
const pathStr = intlMsg.commands_codegen_options_o_path();
const addrStr = intlMsg.commands_codegen_options_e_address();
const outputDirStr = `${intlMsg.commands_docgen_options_o({
  default: `${defaultOutputDir}/`,
})}`;
const defaultManifestStr = defaultManifest.join(" | ");

const HELP = `
${chalk.bold("w3 docgen")} ${chalk.bold(`[<${genFileOp}>]`)} [${optionsStr}]

${intlMsg.commands_docgen_supported()}:
  html
  jsdoc
  docusaurus

${optionsStr[0].toUpperCase() + optionsStr.slice(1)}:
  -h, --help                              ${intlMsg.commands_codegen_options_h()}
  -m, --manifest-path <${pathStr}>              ${intlMsg.commands_codegen_options_m()}: ${defaultManifestStr})
  -o, --output-dir <${pathStr}>                 ${outputDirStr}
  -i, --ipfs [<${nodeStr}>]                     ${intlMsg.commands_codegen_options_i()}
  -e, --ens [<${addrStr}>]                   ${intlMsg.commands_codegen_options_e()}
`;

export default {
  alias: ["d"],
  description: intlMsg.commands_docgen_description(),
  run: async (toolbox: GluegunToolbox): Promise<void> => {
    const { filesystem, parameters, print } = toolbox;

    const { h, m, i, o, e } = parameters.options;
    let { help, manifestPath: web3apiManifestPath, ipfs, outputDir, ens } = parameters.options;

    help = help || h;
    web3apiManifestPath = web3apiManifestPath || m;
    ipfs = ipfs || i;
    outputDir = outputDir || o;
    ens = ens || e;

    let command;
    try {
      const params = toolbox.parameters;
      [command] = fixParameters(
        {
          options: params.options,
          array: params.array,
        },
        {
          h: params.options.h,
          help: params.options.help,
        }
      );
    } catch (e) {
      toolbox.print.error(e.message);
      process.exitCode = 1;
      return;
    }

    if (!command) {
      print.error(intlMsg.commands_plugin_error_noCommand());
      print.info(HELP);
      return;
    } else if (command !== "html" && command !== "jsdoc" && command !== "docusaurus") {
      print.error(intlMsg.commands_dapp_error_unknownCommand({ command }));
      print.info(HELP);
      return;
    }

    if (help || !validateCodegenParams(print, outputDir, ens, false)) {
      print.info(HELP);
      return;
    }

    // Resolve manifest
    web3apiManifestPath = await resolveManifestPath(filesystem, web3apiManifestPath, defaultManifest);

    // Resolve output directory
    outputDir = (outputDir && filesystem.resolve(outputDir)) || filesystem.path(defaultOutputDir);

    // Get providers
    const { ipfsProvider, ethProvider } = await getDefaultProviders(ipfs);
    const ensAddress: string | undefined = ens;

    // Resolve generation file
    command = command === "html"
        ? filesystem.resolve(htmlGenerationFile)
        : command === "jsdoc"
        ? filesystem.resolve(jsdocGenerationFile)
        : command === "docusaurus"
        ? filesystem.resolve(docusaurusGenerationFile)
        : filesystem.resolve(defaultGenerationFile);

    const project = new Web3ApiProject({ web3apiManifestPath });

    const schemaComposer = new SchemaComposer({
      project,
      ipfsProvider,
      ethProvider,
      ensAddress,
    });

    const codeGenerator = new CodeGenerator({
      project,
      schemaComposer,
      customScript: command,
      outputDir,
      mustacheView: {
        unionTypeTrim,
        typeFormatFilter,
        isMutation,
        isQuery,
        hashtagPrefix,
        markdownItalics,
      }
    });

    if (await codeGenerator.generate()) {
      print.success(`🔥 ${intlMsg.commands_codegen_success()} 🔥`);
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  },
};

function unionTypeTrim() {
  return (text: string, render: (text: string) => string): string => {
    const rendered: string = render(text);
    if (rendered.endsWith(" | ")) {
      return rendered.substring(0, rendered.length - 3);
    } else if (rendered.startsWith(" | ")) {
      return rendered.substring(3);
    }
    return rendered;
  };
}

function typeFormatFilter() {
  return (text: string, render: (text: string) => string): string => {
    const rendered: string = render(text);
    if (rendered.startsWith("[")) {
      return rendered.substring(1, rendered.length - 1) + "[]";
    }
    return rendered;
  };
}

function isMutation() {
  return (text: string, render: (text: string) => string): string => {
    const rendered: string = render(text);
    const firstReturn: number = rendered.indexOf("\n", 1);
    const queryType: string = rendered.substring(1, firstReturn).trim();
    if (queryType === "mutation") {
      return rendered.substring(firstReturn + 1);
    }
    return "";
  };
}

function isQuery() {
  return (text: string, render: (text: string) => string): string => {
    const rendered: string = render(text);
    const firstReturn: number = rendered.indexOf("\n", 1);
    const queryType: string = rendered.substring(1, firstReturn).trim();
    if (queryType === "query") {
      return rendered.substring(firstReturn + 1);
    }
    return "";
  };
}

function hashtagPrefix() {
  return (text: string, render: (text: string) => string): string => {
    const rendered: string = render(text);
    if (rendered === "") {
      return "";
    }
    return "# " + rendered;
  };
}

function markdownItalics() {
  return (text: string, render: (text: string) => string): string => {
    const rendered: string = render(text);
    if (rendered === "") {
      return "";
    }
    return "_" + rendered + "_";
  };
}