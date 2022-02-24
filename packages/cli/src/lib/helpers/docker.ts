/* eslint-disable @typescript-eslint/naming-convention */

import { displayPath } from "./path";
import { runCommand } from "./command";
import { withSpinner } from "./spinner";
import { intlMsg } from "../intl";

import { isWin, writeFileSync } from "@web3api/os-js";
import Mustache from "mustache";
import path from "path";
import fs from "fs";

export async function copyArtifactsFromBuildImage(
  outputDir: string,
  buildArtifacts: string[],
  imageName: string,
  quiet = true
): Promise<void> {
  const run = async (): Promise<void> => {
    // Make sure the interactive terminal name is available
    const { stdout: containerLsOutput } = await runCommand(
      "docker container ls -a",
      quiet
    );

    if (containerLsOutput.indexOf(`root-${imageName}`) > -1) {
      await runCommand(`docker rm -f root-${imageName}`, quiet);
    }

    // Create a new interactive terminal
    await runCommand(
      `docker create -ti --name root-${imageName} ${imageName}`,
      quiet
    );

    // Make sure the "project" directory exists
    const { stdout: projectLsOutput } = await runCommand(
      `docker run --rm ${imageName} /bin/bash -c "ls /project"`,
      quiet
    ).catch(() => ({ stdout: "" }));

    if (projectLsOutput.length <= 1) {
      throw Error(
        intlMsg.lib_helpers_docker_projectFolderMissing({ image: imageName })
      );
    }

    const { stdout: buildLsOutput } = await runCommand(
      `docker run --rm ${imageName} /bin/bash -c "ls /project/build"`,
      quiet
    ).catch(() => ({ stdout: "" }));

    for (const buildArtifact of buildArtifacts) {
      if (buildLsOutput.indexOf(buildArtifact) === -1) {
        throw Error(
          intlMsg.lib_helpers_docker_projectBuildFolderMissing({
            image: imageName,
            artifact: buildArtifact,
          })
        );
      }
    }

    for (const buildArtifact of buildArtifacts) {
      await runCommand(
        `docker cp root-${imageName}:/project/build/${buildArtifact} ${outputDir}`,
        quiet
      );
    }

    await runCommand(`docker rm -f root-${imageName}`, quiet);
  };

  if (quiet) {
    return await run();
  } else {
    const args = {
      path: displayPath(outputDir),
      image: imageName,
    };
    return (await withSpinner(
      intlMsg.lib_helpers_docker_copyText(args),
      intlMsg.lib_helpers_docker_copyError(args),
      intlMsg.lib_helpers_docker_copyWarning(args),
      async (_spinner) => {
        return await run();
      }
    )) as void;
  }
}

export async function createBuildImage(
  rootDir: string,
  imageName: string,
  dockerfile: string,
  quiet = true
): Promise<string> {
  const run = async (): Promise<string> => {
    // Build the docker image
    await runCommand(
      `docker build -f ${dockerfile} -t ${imageName} ${rootDir}`,
      quiet,
      isWin()
        ? undefined
        : {
            DOCKER_BUILDKIT: "true",
          }
    );

    // Get the docker image ID
    const { stdout } = await runCommand(
      `docker image inspect ${imageName} -f "{{.ID}}"`,
      quiet
    );

    if (stdout.indexOf("sha256:") === -1) {
      throw Error(intlMsg.lib_docker_invalidImageId({ imageId: stdout }));
    }

    return stdout;
  };

  if (quiet) {
    return await run();
  } else {
    const args = {
      image: imageName,
      dockerfile: displayPath(dockerfile),
      context: displayPath(rootDir),
    };
    return (await withSpinner(
      intlMsg.lib_helpers_docker_buildText(args),
      intlMsg.lib_helpers_docker_buildError(args),
      intlMsg.lib_helpers_docker_buildWarning(args),
      async (_spinner) => {
        return await run();
      }
    )) as string;
  }
}

export function generateDockerfile(
  templatePath: string,
  config: Record<string, unknown>
): string {
  const outputDir = path.dirname(templatePath);
  const outputFilePath = path.join(outputDir, "Dockerfile");
  const template = fs.readFileSync(templatePath, "utf-8");
  const dockerfile = Mustache.render(template, config);
  writeFileSync(outputFilePath, dockerfile, "utf-8");
  return outputFilePath;
}

export function generateDockerImageName(uuid: string): string {
  return `polywrap-build-env-${uuid}`;
}
