import { ClientConfig } from ".";

/** Options required for an URI resolution. */
export interface ResolveUriOptions<
  TClientConfig extends ClientConfig = ClientConfig
> {
  /**
   * If set to true, the resolveUri function will not use the cache to resolve the uri.
   */
  noCacheRead?: boolean;

  /**
   * If set to true, the resolveUri function will not cache the results
   */
  noCacheWrite?: boolean;

  /**
   * Override the client's config for all resolutions.
   */
  config?: Partial<TClientConfig>;

  /**
   * Id used to track context data set internally.
   */
  contextId?: string;
}
