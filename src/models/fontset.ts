// A FontSet represents a group of fonts that belong to the same Collection or Family.

import type { Designer, FontInfo } from "../scripts/typerip";



export class FontSet {
  constructor(
    public name: string,
    public designers: Designer[],
    public fonts: FontInfo[],
    public sampleText?: string
  ) { }
}