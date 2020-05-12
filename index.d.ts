declare namespace hubdown {
  interface IHighlightOptions {
    readonly prefix: string
    readonly subset: boolean | Array<string>
    readonly ignoreMissing: boolean
    readonly plainText: Array<string>
    readonly aliases: Record<string | Array<string>>
    readonly languages: Record<string | Function>
  }

  interface Options {
    readonly runBefore?: Array<any>;
    readonly frontmatter?: boolean;
    readonly cache?: any;
    readonly highlight?: Partial<IHighlightOptions>
  }
}

declare function hubdown(
  markdownString: string,
  opts?: hubdown.Options,
): Promise<{
  content: string;
}>

export = hubdown
