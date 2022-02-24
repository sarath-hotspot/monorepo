import { Request, Response, ResponseTypeEnum, Header } from "./w3";

import { AxiosResponse, AxiosRequestConfig } from "axios";

/**
 * Convert AxiosResponse<string> to Response
 *
 * @param axiosResponse
 */
export function fromAxiosResponse(
  axiosResponse: AxiosResponse<unknown>
): Response {
  const responseHeaders: Header[] = [];
  for (const key of Object.keys(axiosResponse.headers)) {
    responseHeaders.push({
      key: key,
      value: Array.isArray(axiosResponse.headers[key])
        ? axiosResponse.headers[key].join(" ")
        : axiosResponse.headers[key],
    });
  }

  const response = {
    status: axiosResponse.status,
    statusText: axiosResponse.statusText,
    headers: responseHeaders,
  };

  // encode bytes as base64 string if response is array buffer
  if (axiosResponse.config.responseType == "arraybuffer") {
    if (!Buffer.isBuffer(axiosResponse.data)) {
      throw Error(
        "HttpPlugin: Axios response data malformed, must be a buffer. Type: " +
          typeof axiosResponse.data
      );
    }

    return {
      ...response,
      body: Buffer.from(axiosResponse.data).toString("base64"),
    };
  } else {
    switch (typeof axiosResponse.data) {
      case "string":
      case "undefined":
        return {
          ...response,
          body: axiosResponse.data,
        };
      default:
        return {
          ...response,
          body: JSON.stringify(axiosResponse.data),
        };
    }
  }
}

/**
 * Creates AxiosRequestConfig from Request
 *
 * @param request
 */
export function toAxiosRequestConfig(request: Request): AxiosRequestConfig {
  const urlParams = request.urlParams?.reduce((params, p) => {
    return { ...params, [p.key]: p.value };
  }, {});

  const requestHeaders = request.headers?.reduce((headers, h) => {
    return { ...headers, [h.key]: h.value };
  }, {});

  let responseType: "text" | "arraybuffer" = "text";

  switch (request.responseType) {
    case "BINARY":
    case ResponseTypeEnum.BINARY:
      responseType = "arraybuffer";
  }

  let config: AxiosRequestConfig = {
    responseType,
  };

  if (urlParams) {
    config = { ...config, params: urlParams };
  }

  if (requestHeaders) {
    config = { ...config, headers: requestHeaders };
  }

  return config;
}
