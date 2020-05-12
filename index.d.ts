declare namespace hubdown {
  interface Options {
    readonly runBefore?: Array<any>;
    readonly frontmatter?: boolean;
    readonly cache?: any;
    readonly ignoreMissing?: boolean
  }
}

declare function hubdown(
  markdownString: string,
  opts?: hubdown.Options,
): Promise<{
  content: string;
}>

export = hubdown
