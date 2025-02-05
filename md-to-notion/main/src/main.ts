// First, let's define some TypeScript interfaces for our data structures
interface NotionBlock {
    object: 'block';
    type: string;
    [key: string]: any;
  }
  
  interface RichText {
    type: 'text';
    text: { content: string };
    annotations: {
      bold: boolean;
      italic: boolean;
      strikethrough: boolean;
      underline: boolean;
      code: boolean;
      color: string;
    };
  }
  
  // Update the helper functions with types
  const createBlock = (type: string, content: any): NotionBlock => {
    return {
      object: "block",
      type,
      [type]: content
    };
  };
  
  const createRichText = (content: string, annotations: Partial<RichText['annotations']> = {}): RichText => {
    return {
      type: "text",
      text: { content },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: "default",
        ...annotations
      }
    };
  };
  
  class NotionBlockConverter {
    private blockConverters: Record<string, (text: string | string[]) => NotionBlock | NotionBlock[]>;
  
    constructor() {
      this.blockConverters = {
        h1: (text: string | string[]) => this.createHeading1(text as string),
        h2: (text: string | string[]) => this.createHeading2(text as string),
        h3: (text: string | string[]) => this.createHeading3(text as string),
        paragraph: (text: string | string[]) => this.createParagraph(text as string),
        bulletList: (items: string | string[]) => this.createBulletList(items as string[]),
        numberList: (items: string | string[]) => this.createNumberedList(items as string[]),
        image: (url: string | string[]) => this.createImage(url as string),
        video: (url: string | string[]) => this.createVideo(url as string),
        bookmark: (url: string | string[], caption?: string) => this.createBookmark(url as string, caption as string),
        code: (code: string | string[], language?: string) => this.createCodeBlock(code as string, language as string),
        quote: (text: string | string[]) => this.createQuote(text as string),
        divider: () => this.createDivider(),
      };
    }
  
    parseInlineStyles(text: string): RichText[] {
      const segments: RichText[] = [];
      let currentText = '';
      let currentAnnotations = {
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        code: false
      };
      
      let i = 0;
      while (i < text.length) {
        if (text.substr(i, 2) === '**' && text.indexOf('**', i + 2) !== -1) {
          if (currentText) {
            segments.push(createRichText(currentText, {...currentAnnotations}));
            currentText = '';
          }
          const endBold = text.indexOf('**', i + 2);
          const boldText = text.slice(i + 2, endBold);
          segments.push(createRichText(boldText, {...currentAnnotations, bold: true}));
          i = endBold + 2;
          continue;
        } else if (text[i] === '_' && text.indexOf('_', i + 1) !== -1) {
          if (currentText) {
            segments.push(createRichText(currentText, {...currentAnnotations}));
            currentText = '';
          }
          const endItalic = text.indexOf('_', i + 1);
          const italicText = text.slice(i + 1, endItalic);
          segments.push(createRichText(italicText, {...currentAnnotations, italic: true}));
          i = endItalic + 1;
          continue;
        } else if (text.substr(i, 2) === '__' && text.indexOf('__', i + 2) !== -1) {
          if (currentText) {
            segments.push(createRichText(currentText, {...currentAnnotations}));
            currentText = '';
          }
          const endUnderline = text.indexOf('__', i + 2);
          const underlineText = text.slice(i + 2, endUnderline);
          segments.push(createRichText(underlineText, {...currentAnnotations, underline: true}));
          i = endUnderline + 2;
          continue;
        } else if (text.substr(i, 2) === '~~' && text.indexOf('~~', i + 2) !== -1) {
          if (currentText) {
            segments.push(createRichText(currentText, {...currentAnnotations}));
            currentText = '';
          }
          const endStrike = text.indexOf('~~', i + 2);
          const strikeText = text.slice(i + 2, endStrike);
          segments.push(createRichText(strikeText, {...currentAnnotations, strikethrough: true}));
          i = endStrike + 2;
          continue;
        } else if (text[i] === '`' && text.indexOf('`', i + 1) !== -1) {
          if (currentText) {
            segments.push(createRichText(currentText, {...currentAnnotations}));
            currentText = '';
          }
          const endCode = text.indexOf('`', i + 1);
          const codeText = text.slice(i + 1, endCode);
          segments.push(createRichText(codeText, {...currentAnnotations, code: true}));
          i = endCode + 1;
          continue;
        }
        
        currentText += text[i];
        i++;
      }
      
      if (currentText) {
        segments.push(createRichText(currentText, currentAnnotations));
      }
      
      return segments;
    }
  
    createHeading1(text: string): NotionBlock {
      return createBlock("heading_1", {
        rich_text: this.parseInlineStyles(text)
      });
    }
  
    createHeading2(text: string): NotionBlock {
      return createBlock("heading_2", {
        rich_text: this.parseInlineStyles(text)
      });
    }
  
    createHeading3(text: string): NotionBlock {
      return createBlock("heading_3", {
        rich_text: this.parseInlineStyles(text)
      });
    }
  
    createParagraph(text: string): NotionBlock {
      return createBlock("paragraph", {
        rich_text: this.parseInlineStyles(text)
      });
    }
  
    createBulletList(items: string[]): NotionBlock[] {
      return items.map(item =>
        createBlock("bulleted_list_item", {
          rich_text: this.parseInlineStyles(item)
        })
      );
    }
  
    createNumberedList(items: string[]): NotionBlock[] {
      return items.map(item =>
        createBlock("numbered_list_item", {
          rich_text: this.parseInlineStyles(item)
        })
      );
    }
  
    createImage(url: string): NotionBlock {
      return createBlock("image", {
        type: "external",
        external: { url }
      });
    }
  
    createVideo(url: string): NotionBlock {
      return createBlock("video", {
        type: "external",
        external: { url }
      });
    }
  
    createBookmark(url: string, caption: string = ""): NotionBlock {
      return createBlock("bookmark", {
        url,
        caption: caption ? this.parseInlineStyles(caption) : []
      });
    }
  
    createCodeBlock(code: string, language: string = "javascript"): NotionBlock {
      return createBlock("code", {
        rich_text: [createRichText(code)],
        language
      });
    }
  
    createQuote(text: string): NotionBlock {
      return createBlock("quote", {
        rich_text: this.parseInlineStyles(text)
      });
    }
  
    createDivider(): NotionBlock {
      return createBlock("divider", {});
    }
  
    createSpace(count: number = 1): NotionBlock[] {
      return Array(count).fill(
        createBlock("paragraph", {
          rich_text: [createRichText("")]
        })
      );
    }
  
    parseMarkdown(markdown: string): NotionBlock[] {
      // Remove empty lines and normalize line endings
      const cleanMarkdown = markdown
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/\n\s*\n/g, '\n')  // Remove empty lines
        .trim();  // Remove leading/trailing whitespace
      
      const blocks: NotionBlock[] = [];
      const lines = cleanMarkdown.split('\n');
      let currentList: string[] = [];
      let isInList = false;
      let listType: 'bulletList' | 'numberList' | null = null;
  
      for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines completely
        if (!line) continue;
  
        // Headers
        if (line.startsWith('# ')) {
          if (isInList) {
            blocks.push(...this.blockConverters[listType!].call(this, currentList));
            currentList = [];
            isInList = false;
          }
          blocks.push(this.createHeading1(line.slice(2)));
        } else if (line.startsWith('## ')) {
          if (isInList) {
            blocks.push(...this.blockConverters[listType!].call(this, currentList));
            currentList = [];
            isInList = false;
          }
          blocks.push(this.createHeading2(line.slice(3)));
        } else if (line.startsWith('### ')) {
          if (isInList) {
            blocks.push(...this.blockConverters[listType!].call(this, currentList));
            currentList = [];
            isInList = false;
          }
          blocks.push(this.createHeading3(line.slice(4)));
        }
        // Bullet list
        else if (line.startsWith('* ') || line.startsWith('- ')) {
          if (!isInList || listType !== 'bulletList') {
            if (isInList) {
              blocks.push(...this.blockConverters[listType!].call(this, currentList));
              currentList = [];
            }
            isInList = true;
            listType = 'bulletList';
          }
          currentList.push(line.slice(2));
        }
        // Numbered list
        else if (/^\d+\.\s/.test(line)) {
          if (!isInList || listType !== 'numberList') {
            if (isInList) {
              blocks.push(...this.blockConverters[listType!].call(this, currentList));
              currentList = [];
            }
            isInList = true;
            listType = 'numberList';
          }
          currentList.push(line.replace(/^\d+\.\s/, ''));
        }
        // Code blocks
        else if (line.startsWith('`')) {
          if (isInList) {
            blocks.push(...this.blockConverters[listType!].call(this, currentList));
            currentList = [];
            isInList = false;
          }
          blocks.push(this.createCodeBlock(line.slice(1, -1)));
        }
        // Blockquotes
        else if (line.startsWith('> ')) {
          if (isInList) {
            blocks.push(...this.blockConverters[listType!].call(this, currentList));
            currentList = [];
            isInList = false;
          }
          blocks.push(this.createQuote(line.slice(2)));
        }
        // Images
        else if (line.startsWith('![') && line.includes('](') && line.endsWith(')')) {
          if (isInList) {
            blocks.push(...this.blockConverters[listType!].call(this, currentList));
            currentList = [];
            isInList = false;
          }
          const match = line.match(/\((.*?)\)/);
          if (!match) continue;
          const url = match[1];
          blocks.push(this.createImage(url));
        }
        // Links as bookmarks
        else if (line.startsWith('[') && line.includes('](') && line.endsWith(')')) {
          if (isInList) {
            blocks.push(...this.blockConverters[listType!].call(this, currentList));
            currentList = [];
            isInList = false;
          }
          const match = line.match(/\[(.*?)\]\((.*?)\)/);
          if (!match) continue;
          const [, text, url] = match;
          blocks.push(this.createBookmark(url, text));
        }
        // Regular paragraph
        else {
          if (isInList) {
            blocks.push(...this.blockConverters[listType!].call(this, currentList));
            currentList = [];
            isInList = false;
          }
          blocks.push(this.createParagraph(line));
        }
      }
  
      // Handle any remaining list items
      if (isInList && currentList.length > 0) {
        blocks.push(...this.blockConverters[listType!].call(this, currentList));
      }
  
      return blocks;
    }
  }
  
  interface MainArgs {
    md: string;
  }
  
  interface MainResponse {
    error?: string;
    body?: NotionBlock[];
  }
  
  function main(args: MainArgs): MainResponse {
    const md = args.md;
    
    if (!md) {
      return { error: "no markdown provided!" };
    }
  
    const converter = new NotionBlockConverter();
  
    const markdownToNotion = (markdown: string): NotionBlock[] => {
      return converter.parseMarkdown(markdown);
    };
    
    return { body: markdownToNotion(md) };
  }
      